import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TicketStatus } from '../enums/ticket-status.enum';

export class StatusTicketDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
