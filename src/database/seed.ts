import 'dotenv/config';

import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';

import { User, UserRole } from '../users/entities/user.entity';
import { Ticket, TicketPriority } from '../tickets/entities/ticket.entity';
import { TicketStatus } from '../tickets/enums/ticket-status.enum';
import { Comment } from '../comments/entities/comment.entity';
import { Tag } from '../tags/entities/tag.entity';
import { TicketTag } from '../tags/entities/ticket-tag.entity';
import { TicketEvent } from '../tickets/entities/ticket-event.entity';

async function seed() {
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(User);
  const ticketRepository = AppDataSource.getRepository(Ticket);
  const commentRepository = AppDataSource.getRepository(Comment);
  const tagRepository = AppDataSource.getRepository(Tag);
  const ticketTagRepository = AppDataSource.getRepository(TicketTag);
  const eventRepository = AppDataSource.getRepository(TicketEvent);

  console.log('Starting database seed...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const userData = [
    {
      email: 'admin@supportdesk.com',
      fullName: 'Support Admin',
      role: UserRole.ADMIN,
    },
    {
      email: 'agent1@supportdesk.com',
      fullName: 'Agent One',
      role: UserRole.AGENT,
    },
    {
      email: 'agent2@supportdesk.com',
      fullName: 'Agent Two',
      role: UserRole.AGENT,
    },
    {
      email: 'customer1@example.com',
      fullName: 'Customer One',
      role: UserRole.CUSTOMER,
    },
    {
      email: 'customer2@example.com',
      fullName: 'Customer Two',
      role: UserRole.CUSTOMER,
    },
    {
      email: 'customer3@example.com',
      fullName: 'Customer Three',
      role: UserRole.CUSTOMER,
    },
    {
      email: 'customer4@example.com',
      fullName: 'Customer Four',
      role: UserRole.CUSTOMER,
    },
    {
      email: 'customer5@example.com',
      fullName: 'Customer Five',
      role: UserRole.CUSTOMER,
    },
  ];

  const users: User[] = [];

  for (const data of userData) {
    let user = await userRepository.findOne({
      where: { email: data.email },
    });

    if (!user) {
      user = userRepository.create({
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        passwordHash,
      });

      user = await userRepository.save(user);
    }

    users.push(user);
  }

  const admin = users.find((u) => u.role === UserRole.ADMIN)!;
  const agents = users.filter((u) => u.role === UserRole.AGENT);
  const customers = users.filter((u) => u.role === UserRole.CUSTOMER);

  console.log('Users ready.');

  const priorities = [
    TicketPriority.URGENT,
    TicketPriority.HIGH,
    TicketPriority.NORMAL,
    TicketPriority.LOW,
  ];

  const statuses = [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ];

  const ticketDefinitions = Array.from({ length: 25 }, (_, index) => {
    const priority = priorities[index % priorities.length];
    const status = statuses[index % statuses.length];

    return {
      subject: `Seed support ticket ${index + 1}`,
      body: `This is seeded support ticket number ${index + 1}.`,
      priority,
      status,
      requester: customers[index % customers.length],
      assignee:
        status === TicketStatus.OPEN
          ? null
          : agents[index % agents.length],
    };
  });

  const tickets: Ticket[] = [];

  for (const definition of ticketDefinitions) {
    let ticket = await ticketRepository.findOne({
      where: { subject: definition.subject },
    });

    if (!ticket) {
      const hoursByPriority: Record<TicketPriority, number> = {
        [TicketPriority.URGENT]: 4,
        [TicketPriority.HIGH]: 24,
        [TicketPriority.NORMAL]: 72,
        [TicketPriority.LOW]: 168,
      };

      const dueAt = new Date(
        Date.now() + hoursByPriority[definition.priority] * 60 * 60 * 1000,
      );

      ticket = ticketRepository.create({
        subject: definition.subject,
        body: definition.body,
        status: definition.status,
        priority: definition.priority,
        requesterId: definition.requester.id,
        assigneeId: definition.assignee?.id ?? null,
        dueAt,
      });

      ticket = await ticketRepository.save(ticket);
    }

    tickets.push(ticket);
  }

  console.log(`${tickets.length} tickets ready.`);

  // Make the first 3 tickets overdue.
  for (let i = 0; i < 3; i++) {
    tickets[i].dueAt = new Date(Date.now() - (i + 1) * 60 * 60 * 1000);
    await ticketRepository.save(tickets[i]);
  }

  // Six required tags.
  const tagNames = [
    'billing',
    'technical',
    'account',
    'login',
    'bug',
    'feature-request',
  ];

  const tags: Tag[] = [];

  for (const name of tagNames) {
    let tag = await tagRepository.findOne({
      where: { name },
    });

    if (!tag) {
      tag = tagRepository.create({ name });
      tag = await tagRepository.save(tag);
    }

    tags.push(tag);
  }

  console.log(`${tags.length} tags ready.`);

  // Create at least 20 ticket-tag links.
  for (let i = 0; i < 20; i++) {
    const ticket = tickets[i];
    const tag = tags[i % tags.length];

    const existing = await ticketTagRepository.findOne({
      where: {
        ticketId: ticket.id,
        tagId: tag.id,
      },
    });

    if (!existing) {
      await ticketTagRepository.save(
        ticketTagRepository.create({
          ticketId: ticket.id,
          tagId: tag.id,
        }),
      );
    }
  }

  console.log('Ticket-tag links ready.');

  // Create at least 15 comments, including 5 internal comments.
  for (let i = 0; i < 15; i++) {
    const ticket = tickets[i % tickets.length];

    const existing = await commentRepository.findOne({
      where: {
        ticketId: ticket.id,
        body: `Seed comment ${i + 1}`,
      },
    });

    if (!existing) {
      await commentRepository.save(
        commentRepository.create({
          ticketId: ticket.id,
          authorId:
            i < 5
              ? agents[i % agents.length].id
              : customers[i % customers.length].id,
          body: `Seed comment ${i + 1}`,
          isInternal: i < 5,
        }),
      );
    }
  }

  console.log('Comments ready.');

  // Create audit events for tickets that left the open state.
  for (const ticket of tickets) {
    if (ticket.status === TicketStatus.OPEN) {
      continue;
    }

    const existing = await eventRepository.findOne({
      where: {
        ticketId: ticket.id,
        toStatus: ticket.status,
      },
    });

    if (!existing) {
      await eventRepository.save(
        eventRepository.create({
          ticketId: ticket.id,
          actorId: ticket.assigneeId ?? admin.id,
          fromStatus: TicketStatus.OPEN,
          toStatus: ticket.status,
          note: 'Seeded ticket status history',
        }),
      );
    }
  }

  // Create assignment audit events.
  for (const ticket of tickets) {
    if (!ticket.assigneeId) {
      continue;
    }

    const existing = await eventRepository.findOne({
      where: {
        ticketId: ticket.id,
        actorId: ticket.assigneeId,
        note: 'Seeded assignment',
      },
    });

    if (!existing) {
      await eventRepository.save(
        eventRepository.create({
          ticketId: ticket.id,
          actorId: ticket.assigneeId,
          fromStatus: null,
          toStatus: null,
          note: 'Seeded assignment',
        }),
      );
    }
  }

  console.log('Ticket events ready.');
  console.log('');
  console.log('====================================');
  console.log('DATABASE SEED COMPLETE');
  console.log('====================================');
  console.log('');
  console.log('Seed password for all seeded users:');
  console.log('Password123!');
  console.log('');
  console.log('Admin:    admin@supportdesk.com');
  console.log('Agent 1:  agent1@supportdesk.com');
  console.log('Agent 2:  agent2@supportdesk.com');
  console.log('Customer: customer1@example.com');
  console.log('');

  await AppDataSource.destroy();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  process.exit(1);
});
