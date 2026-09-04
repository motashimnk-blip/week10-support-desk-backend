import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Ticket } from './ticket.entity';
import { TicketStatus } from '../enums/ticket-status.enum';

@Entity('ticket_events')
export class TicketEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'integer',
    name: 'ticket_id',
  })
  ticketId!: number;

  @Column({
    type: 'integer',
    name: 'actor_id',
    nullable: true,
  })
  actorId!: number | null;

  @Column({
    type: 'enum',
    enum: Object.values(TicketStatus),
    nullable: true,
    name: 'from_status',
  })
  fromStatus!: TicketStatus | null;

  @Column({
    type: 'enum',
    enum: Object.values(TicketStatus),
    nullable: true,
    name: 'to_status',
  })
  toStatus!: TicketStatus | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  note!: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt!: Date;

  @ManyToOne(() => Ticket, (ticket) => ticket.events, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @ManyToOne(() => User, (user) => user.ticketEvents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'actor_id' })
  actor!: User | null;
}