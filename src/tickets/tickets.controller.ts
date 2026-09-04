import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { User, UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { StatusTicketDto } from './dto/status-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(user, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query() query: Record<string, string>,
  ) {
    return this.ticketsService.findAll(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketsService.findOne(user, id);
  }

  @Get(':id/events')
  getEvents(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketsService.getEvents(user, id);
  }
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(user, id, dto);
  }

  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  assign(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assign(user, id, dto);
  }

  @Post(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusTicketDto,
  ) {
    return this.ticketsService.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketsService.remove(id);
  }
}

