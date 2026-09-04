import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { Ticket } from '../../tickets/entities/ticket.entity';
import { Tag } from './tag.entity';

@Entity('ticket_tags')
export class TicketTag {
  @PrimaryColumn({
    type: 'integer',
    name: 'ticket_id',
  })
  ticketId!: number;

  @PrimaryColumn({
    type: 'integer',
    name: 'tag_id',
  })
  tagId!: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.ticketTags, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @ManyToOne(() => Tag, (tag) => tag.ticketTags, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag!: Tag;
}