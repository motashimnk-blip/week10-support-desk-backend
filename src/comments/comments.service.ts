import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserRole } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,

    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
  ) {}

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private sanitizeComment(comment: Comment) {
    return {
      id: comment.id,
      ticketId: comment.ticketId,
      authorId: comment.authorId,
      body: comment.body,
      isInternal: comment.isInternal,
      createdAt: comment.createdAt,
      author: comment.author
        ? this.sanitizeUser(comment.author)
        : undefined,
    };
  }

  private async getTicketForUser(user: User, ticketId: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: {
        requester: true,
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

  async create(
    user: User,
    ticketId: number,
    dto: CreateCommentDto,
  ) {
    const ticket = await this.getTicketForUser(user, ticketId);

    if (dto.isInternal && user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException(
        'Customers cannot create internal comments',
      );
    }

    const comment = this.commentsRepository.create({
      ticketId: ticket.id,
      authorId: user.id,
      body: dto.body,
      isInternal: dto.isInternal,
    });

    const savedComment = await this.commentsRepository.save(comment);

    const result = await this.commentsRepository.findOne({
      where: { id: savedComment.id },
      relations: {
        author: true,
      },
    });

    if (!result) {
      throw new NotFoundException('Comment not found');
    }

    return this.sanitizeComment(result);
  }

  async findAll(user: User, ticketId: number) {
    await this.getTicketForUser(user, ticketId);

    const qb = this.commentsRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .where('comment.ticket_id = :ticketId', { ticketId })
      .orderBy('comment.created_at', 'ASC');

    if (user.role === UserRole.CUSTOMER) {
      qb.andWhere('comment.is_internal = false');
    }

    const comments = await qb.getMany();

    return comments.map((comment) => this.sanitizeComment(comment));
  }
}
