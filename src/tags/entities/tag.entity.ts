import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TicketTag } from './ticket-tag.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'text',
    unique: true,
  })
  name!: string;

  @OneToMany(() => TicketTag, (ticketTag) => ticketTag.tag)
  ticketTags!: TicketTag[];
}