import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';

import { CreateTagDto } from './dto/create-tag.dto';
import { TagsService } from './tags.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
  ) {}

  @Get('tags')
  findAll() {
    return this.tagsService.findAll();
  }

  @Post('tags')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateTagDto,
  ) {
    return this.tagsService.create(user, dto);
  }

  @Post('tickets/:ticketId/tags/:tagId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  addTag(
    @CurrentUser() user: User,
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('tagId', ParseIntPipe) tagId: number,
  ) {
    return this.tagsService.addTag(
      user,
      ticketId,
      tagId,
    );
  }

  @Delete('tickets/:ticketId/tags/:tagId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  removeTag(
    @CurrentUser() user: User,
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('tagId', ParseIntPipe) tagId: number,
  ) {
    return this.tagsService.removeTag(
      user,
      ticketId,
      tagId,
    );
  }
}
