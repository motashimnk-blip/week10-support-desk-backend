import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from '../users/entities/user.entity';
import { Ticket, TicketPriority } from './entities/ticket.entity';
import { TicketEvent } from './entities/ticket-event.entity';
import { TicketStatus } from './enums/ticket-status.enum';

import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { StatusTicketDto } from './dto/status-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,

    @InjectRepository(TicketEvent)
    private readonly eventsRepository: Repository<TicketEvent>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private sanitizeUser(user: User | null) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private sanitizeTicket(ticket: Ticket) {
    return {
      id: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
      status: ticket.status,
      priority: ticket.priority,
      requesterId: ticket.requesterId,
      assigneeId: ticket.assigneeId,
      dueAt: ticket.dueAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      requester: this.sanitizeUser(ticket.requester),
      assignee: this.sanitizeUser(ticket.assignee),
    };
  }

  private calculateDueAt(priority: TicketPriority): Date {
    const hours: Record<TicketPriority, number> = {
      [TicketPriority.URGENT]: 4,
      [TicketPriority.HIGH]: 24,
      [TicketPriority.NORMAL]: 72,
      [TicketPriority.LOW]: 168,
    };

    return new Date(Date.now() + hours[priority] * 60 * 60 * 1000);
  }

  private async getTicketForUser(user: User, id: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: {
        requester: true,
        assignee: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (
      user.role === UserRole.CUSTOMER &&
      ticket.requesterId !== user.id
    ) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async create(user: User, dto: CreateTicketDto) {
    const ticket = this.ticketsRepository.create({
      subject: dto.subject.trim(),
      body: dto.body.trim(),
      priority: dto.priority,
      status: TicketStatus.OPEN,
      requesterId: user.id,
      assigneeId: null,
      dueAt: this.calculateDueAt(dto.priority),
    });

    const savedTicket = await this.ticketsRepository.save(ticket);

    const result = await this.getTicketForUser(user, savedTicket.id);

    return this.sanitizeTicket(result);
  }

  async findOne(user: User, id: number) {
    const ticket = await this.getTicketForUser(user, id);

    return this.sanitizeTicket(ticket);
  }

  async findAll(user: User, query: Record<string, string>) {
    const page = Math.max(Number(query.page) || 1, 1);

    const pageSize = Math.min(
      Math.max(Number(query.pageSize) || 20, 1),
      100,
    );

    const qb = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.requester', 'requester')
      .leftJoinAndSelect('ticket.assignee', 'assignee');

    if (user.role === UserRole.CUSTOMER) {
      qb.andWhere('ticket.requester_id = :requesterId', {
        requesterId: user.id,
      });
    }

    if (query.status) {
      qb.andWhere('ticket.status = :status', {
        status: query.status,
      });
    }

    if (query.priority) {
      qb.andWhere('ticket.priority = :priority', {
        priority: query.priority,
      });
    }

    if (query.assigneeId) {
      qb.andWhere('ticket.assignee_id = :assigneeId', {
        assigneeId: Number(query.assigneeId),
      });
    }

    if (query.q) {
      qb.andWhere(
        '(ticket.subject ILIKE :q OR ticket.body ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    if (query.overdue === 'true') {
      qb.andWhere('ticket.due_at < NOW()');

      qb.andWhere('ticket.status NOT IN (:...finishedStatuses)', {
        finishedStatuses: [
          TicketStatus.RESOLVED,
          TicketStatus.CLOSED,
        ],
      });
    }

    const sortMap: Record<string, string> = {
      createdAt: 'ticket.created_at',
      dueAt: 'ticket.due_at',
      priority: 'ticket.priority',
    };

    const sortColumn =
      sortMap[query.sortBy] || 'ticket.created_at';

    const order =
      query.order?.toLowerCase() === 'asc'
        ? 'ASC'
        : 'DESC';

    qb.orderBy(sortColumn, order);

    const total = await qb.getCount();

    qb.skip((page - 1) * pageSize).take(pageSize);

    const tickets = await qb.getMany();

    return {
      data: tickets.map((ticket) =>
        this.sanitizeTicket(ticket),
      ),
      page,
      pageSize,
      total,
    };
  }

  async update(
    user: User,
    id: number,
    dto: UpdateTicketDto,
  ) {
    const ticket = await this.getTicketForUser(user, id);

    if (
      user.role === UserRole.CUSTOMER &&
      ticket.requesterId !== user.id
    ) {
      throw new ForbiddenException();
    }

    if (dto.subject !== undefined) {
      ticket.subject = dto.subject.trim();
    }

    if (dto.body !== undefined) {
      ticket.body = dto.body.trim();
    }

    if (dto.priority !== undefined) {
      ticket.priority = dto.priority;
      ticket.dueAt = this.calculateDueAt(dto.priority);
    }

    const savedTicket =
      await this.ticketsRepository.save(ticket);

    const result =
      await this.getTicketForUser(user, savedTicket.id);

    return this.sanitizeTicket(result);
  }

  async assign(
    actor: User,
    id: number,
    dto: AssignTicketDto,
  ) {
    const ticket = await this.getTicketForUser(actor, id);

    const assignee = await this.usersRepository.findOne({
      where: { id: dto.assigneeId },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found');
    }

    if (
      assignee.role !== UserRole.AGENT &&
      assignee.role !== UserRole.ADMIN
    ) {
      throw new UnprocessableEntityException(
        'Assignee must be an agent or admin',
      );
    }

    ticket.assigneeId = assignee.id;

    const savedTicket =
      await this.ticketsRepository.save(ticket);

    await this.eventsRepository.save(
      this.eventsRepository.create({
        ticketId: savedTicket.id,
        actorId: actor.id,
        fromStatus: null,
        toStatus: null,
        note: `Assigned to user ${assignee.id}`,
      }),
    );

    const result =
      await this.getTicketForUser(actor, savedTicket.id);

    return this.sanitizeTicket(result);
  }

  async updateStatus(
    actor: User,
    id: number,
    dto: StatusTicketDto,
  ) {
    const ticket = await this.getTicketForUser(actor, id);

    const fromStatus = ticket.status;
    const toStatus = dto.status;

    const validTransitions: Record<
      TicketStatus,
      TicketStatus[]
    > = {
      [TicketStatus.OPEN]: [
        TicketStatus.IN_PROGRESS,
      ],

      [TicketStatus.IN_PROGRESS]: [
        TicketStatus.RESOLVED,
      ],

      [TicketStatus.RESOLVED]: [
        TicketStatus.CLOSED,
        TicketStatus.IN_PROGRESS,
      ],

      [TicketStatus.CLOSED]: [
        TicketStatus.IN_PROGRESS,
      ],
    };

    if (!validTransitions[fromStatus].includes(toStatus)) {
      throw new ConflictException(
        `Invalid status transition: ${fromStatus} -> ${toStatus}`,
      );
    }

    if (
      fromStatus === TicketStatus.CLOSED &&
      toStatus === TicketStatus.IN_PROGRESS &&
      !dto.note?.trim()
    ) {
      throw new BadRequestException(
        'A note is required when reopening a closed ticket',
      );
    }

    ticket.status = toStatus;

    const savedTicket =
      await this.ticketsRepository.save(ticket);

    await this.eventsRepository.save(
      this.eventsRepository.create({
        ticketId: savedTicket.id,
        actorId: actor.id,
        fromStatus,
        toStatus,
        note: dto.note?.trim() || null,
      }),
    );

    const result =
      await this.getTicketForUser(actor, savedTicket.id);

    return this.sanitizeTicket(result);
  }

  async remove(id: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.ticketsRepository.remove(ticket);
  }
  async getEvents(user: User, ticketId: number) {
    await this.getTicketForUser(user, ticketId);

    const events = await this.eventsRepository.find({
      where: { ticketId },
      relations: {
        actor: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return events.map((event) => ({
      id: event.id,
      ticketId: event.ticketId,
      actorId: event.actorId,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      createdAt: event.createdAt,
      actor: event.actor
        ? this.sanitizeUser(event.actor)
        : null,
    }));
  }
}


