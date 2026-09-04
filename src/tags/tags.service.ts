import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Tag } from './entities/tag.entity';
import { TicketTag } from './entities/ticket-tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,

    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,

    @InjectRepository(TicketTag)
    private readonly ticketTagsRepository: Repository<TicketTag>,
  ) {}

  private ensureStaff(user: User) {
    if (
      user.role !== UserRole.AGENT &&
      user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only agents and admins can modify tags',
      );
    }
  }

  async findAll() {
    return this.tagsRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async create(user: User, dto: CreateTagDto) {
    this.ensureStaff(user);

    const name = dto.name.trim();

    const existing = await this.tagsRepository.findOne({
      where: { name },
    });

    if (existing) {
      throw new ConflictException('Tag already exists');
    }

    const tag = this.tagsRepository.create({
      name,
    });

    return this.tagsRepository.save(tag);
  }

  private async getTicket(ticketId: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  private async getTag(tagId: number) {
    const tag = await this.tagsRepository.findOne({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async addTag(
    user: User,
    ticketId: number,
    tagId: number,
  ) {
    this.ensureStaff(user);

    await this.getTicket(ticketId);
    await this.getTag(tagId);

    const existing = await this.ticketTagsRepository.findOne({
      where: {
        ticketId,
        tagId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Tag is already attached to this ticket',
      );
    }

    const ticketTag = this.ticketTagsRepository.create({
      ticketId,
      tagId,
    });

    await this.ticketTagsRepository.save(ticketTag);

    return {
      message: 'Tag added to ticket',
      ticketId,
      tagId,
    };
  }

  async removeTag(
    user: User,
    ticketId: number,
    tagId: number,
  ) {
    this.ensureStaff(user);

    await this.getTicket(ticketId);
    await this.getTag(tagId);

    const existing = await this.ticketTagsRepository.findOne({
      where: {
        ticketId,
        tagId,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        'Tag is not attached to this ticket',
      );
    }

    await this.ticketTagsRepository.remove(existing);

    return {
      message: 'Tag removed from ticket',
      ticketId,
      tagId,
    };
  }
}
