import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Ticket } from '../../tickets/entities/ticket.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { TicketEvent } from '../../tickets/entities/ticket-event.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  email!: string;

  @Column({ type: 'text', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'text', name: 'full_name' })
  fullName!: string;

  @Column({
    type: 'enum',
    enum: Object.values(UserRole),
    enumName: 'user_role',
  })
  role!: UserRole;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt!: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.requester)
  requestedTickets!: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.assignee)
  assignedTickets!: Ticket[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments!: Comment[];

  @OneToMany(() => TicketEvent, (event) => event.actor)
  ticketEvents!: TicketEvent[];
}