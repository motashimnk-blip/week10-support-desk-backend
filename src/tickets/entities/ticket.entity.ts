import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { TicketEvent } from './ticket-event.entity';
import { TicketTag } from '../../tags/entities/ticket-tag.entity';

import { TicketStatus } from '../enums/ticket-status.enum';

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  subject!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({
    type: 'enum',
    enum: Object.values(TicketStatus),
    enumName: 'ticket_status',
  })
  status!: TicketStatus;

  @Column({
    type: 'enum',
    enum: Object.values(TicketPriority),
    enumName: 'ticket_priority',
  })
  priority!: TicketPriority;

  @Column({
    type: 'integer',
    name: 'requester_id',
  })
  requesterId!: number;

  @Column({
    type: 'integer',
    name: 'assignee_id',
    nullable: true,
  })
  assigneeId!: number | null;

  @Column({
    type: 'timestamptz',
    name: 'due_at',
  })
  dueAt!: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
  })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.requestedTickets, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'requester_id' })
  requester!: User;

  @ManyToOne(() => User, (user) => user.assignedTickets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: User | null;

  @OneToMany(() => Comment, (comment) => comment.ticket)
  comments!: Comment[];

  @OneToMany(() => TicketEvent, (event) => event.ticket)
  events!: TicketEvent[];

  @OneToMany(() => TicketTag, (ticketTag) => ticketTag.ticket)
  ticketTags!: TicketTag[];
}