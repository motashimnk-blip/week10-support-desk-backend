import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
describe('Support Desk API (e2e)', () => {
  let app: INestApplication<App>;

  let customerToken: string;
  let agentToken: string;
  let adminToken: string;

  let customerTicketId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    const customerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'customer1@example.com',
        password: 'Password123!',
      })
      .expect(200);

    customerToken = customerLogin.body.accessToken;

    const agentLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'agent1@supportdesk.com',
        password: 'Password123!',
      })
      .expect(200);

    agentToken = agentLogin.body.accessToken;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@supportdesk.com',
        password: 'Password123!',
      })
      .expect(200);

    adminToken = adminLogin.body.accessToken;
  });

  describe('Authentication', () => {
    it('rejects protected endpoint without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('returns authenticated customer from /auth/me', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('customer1@example.com');
      expect(response.body.user.role).toBe('customer');
      expect(response.body.user.passwordHash).toBeUndefined();
    });
    });

  describe('Tickets', () => {
    it('allows customer to create a ticket', async () => {
      const response = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          subject: 'E2E test ticket',
          body: 'Created by automated E2E test.',
          priority: 'normal',
        })
        .expect(201);

      customerTicketId = response.body.id;

      expect(response.body.status).toBe('open');
      expect(response.body.requesterId).toBeDefined();
      expect(response.body.dueAt).toBeDefined();
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('rejects dueAt in create ticket DTO', async () => {
      await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          subject: 'Invalid due date test',
          body: 'dueAt must be server controlled.',
          priority: 'normal',
          dueAt: '2030-01-01T00:00:00.000Z',
        })
        .expect(400);
    });

    it('supports ticket search', async () => {
      const response = await request(app.getHttpServer())
        .get('/tickets?q=E2E%20test')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('supports pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/tickets?page=1&pageSize=1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(1);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('allows agent to assign a ticket', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/assign`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          assigneeId: 3,
        })
        .expect(201);

      expect(response.body.assigneeId).toBe(3);
    });

    it('allows valid status transition', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'in_progress',
        })
        .expect(201);

      expect(response.body.status).toBe('in_progress');
    });

    it('rejects invalid status transition', async () => {
      await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'closed',
        })
        .expect(409);
    });
  });

  describe('Comments', () => {
    it('allows customer to create a normal comment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/comments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          body: 'E2E normal comment',
          isInternal: false,
        })
        .expect(201);

      expect(response.body.isInternal).toBe(false);
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('rejects customer internal comment', async () => {
      await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/comments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          body: 'Customer internal comment',
          isInternal: true,
        })
        .expect(403);
    });

    it('allows agent to create an internal comment', async () => {
      await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          body: 'E2E internal staff note',
          isInternal: true,
        })
        .expect(201);
    });

    it('does not expose internal comments to customer', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets/${customerTicketId}/comments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(
        response.body.some(
          (comment: { isInternal: boolean }) =>
            comment.isInternal === true,
        ),
      ).toBe(false);
    });
  });

  describe('Tags', () => {
    it('allows customer to read tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/tags')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(6);
    });

    it('rejects customer from creating tags', async () => {
      await request(app.getHttpServer())
        .post('/tags')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'e2e-customer-tag',
        })
        .expect(403);
    });

    it('allows agent to attach a tag', async () => {
      await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/tags/1`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(201);
    });

    it('rejects duplicate tag attachment', async () => {
      await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/tags/1`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(409);
    });
  });

  describe('Events', () => {
    it('returns ticket audit events', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tickets/${customerTicketId}/events`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const statusEvent = response.body.find(
        (event: {
          fromStatus: string | null;
          toStatus: string | null;
        }) =>
          event.fromStatus === 'open' &&
          event.toStatus === 'in_progress',
      );

      expect(statusEvent).toBeDefined();
    });
  });

  describe('Authorization', () => {
    it('does not allow customer to assign tickets', async () => {
      await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/assign`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          assigneeId: 3,
        })
        .expect(403);
    });

    it('does not allow customer to change ticket status', async () => {
      await request(app.getHttpServer())
        .post(`/tickets/${customerTicketId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'resolved',
        })
        .expect(403);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});



