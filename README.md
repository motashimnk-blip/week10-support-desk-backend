# Support Desk Backend

A complete backend API for a Support Desk / Ticket Management system built with **NestJS**, **TypeScript**, **PostgreSQL**, **TypeORM**, **JWT authentication**, and **bcrypt**.

The project supports customers, agents, and administrators with role-based access control, ticket management, comments, tags, audit events, SQL filtering, searching, sorting, and pagination.

## Tech Stack

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- JWT authentication
- bcrypt password hashing
- class-validator / class-transformer
- Jest / Supertest
- GitHub Actions CI

## Features

### Authentication

- Customer registration
- Login with email and password
- JWT access tokens
- Protected endpoints
- Authenticated user endpoint
- Passwords stored using bcrypt hashes
- Password hashes are never returned by the API
- New registrations are always created as customers

### Roles

The system has three roles:

- `customer`
- `agent`
- `admin`

Customers can manage and view their own tickets.

Agents can manage tickets, assignments, status changes, comments, and tags.

Administrators have staff-level access plus administrative operations such as ticket deletion.

### Tickets

Tickets contain:

- Subject
- Body
- Status
- Priority
- Requester
- Assignee
- Due date
- Created date
- Updated date

Supported statuses:

- `open`
- `in_progress`
- `resolved`
- `closed`

Supported priorities:

- `low`
- `normal`
- `high`
- `urgent`

Due dates are calculated by the server from priority:

- urgent: +4 hours
- high: +24 hours
- normal: +72 hours
- low: +168 hours

Clients cannot provide their own `dueAt` when creating a ticket.

### Ticket List

`GET /tickets` supports:

- status filtering
- priority filtering
- assignee filtering
- tag filtering
- case-insensitive subject/body search
- overdue filtering
- sorting
- ascending/descending order
- pagination

Pagination uses:

- `page` starting at 1
- `pageSize` default 20
- `pageSize` maximum 100

Response format:

```json
{
  "data": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
````

### Comments

Tickets support public and internal comments.

* Customers can create normal comments.
* Customers cannot create internal comments.
* Agents and administrators can create internal comments.
* Customers never receive internal comments.

### Tags

* Customers can view tags.
* Agents and administrators can create tags.
* Agents and administrators can attach tags to tickets.
* Agents and administrators can remove tags.
* Duplicate ticket/tag relationships are rejected.

### Audit Events

Ticket status and assignment changes create audit events.

Events record:

* Ticket
* Actor
* Previous status
* New status
* Note
* Creation time

## Database

The application uses PostgreSQL with TypeORM migrations.

The schema contains six main tables:

1. `users`
2. `tickets`
3. `comments`
4. `tags`
5. `ticket_tags`
6. `ticket_events`

PostgreSQL enum types are used for ticket status, ticket priority, and user roles.

TypeORM synchronization is disabled. Database changes are managed through migrations.

An ERD is available at:

```text
docs/ERD.md
```

## Project Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file based on `.env.example`.

Example:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_DATABASE=support_desk

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d

CORS_ORIGIN=http://localhost:3000
```

Do not commit `.env` to GitHub.

## Database Commands

Run the database migration:

```bash
npm run migration:run
```

Revert the latest migration:

```bash
npm run migration:revert
```

Seed the database:

```bash
npm run seed
```

The seed is designed to be idempotent.

## Seed Credentials

All seeded users use:

```text
Password123!
```

Example accounts:

```text
Admin:
admin@supportdesk.com

Agent:
agent1@supportdesk.com

Agent:
agent2@supportdesk.com

Customer:
customer1@example.com
```

## Running the Application

Development:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

Production:

```bash
npm run start:prod
```

The API runs on:

```text
http://localhost:3000
```

## API Endpoints

### Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/me
```

### Tickets

```text
POST   /tickets
GET    /tickets
GET    /tickets/:id
PATCH  /tickets/:id
POST   /tickets/:id/assign
POST   /tickets/:id/status
DELETE /tickets/:id
```

### Comments

```text
POST /tickets/:ticketId/comments
GET  /tickets/:ticketId/comments
```

### Events

```text
GET /tickets/:ticketId/events
```

### Tags

```text
GET    /tags
POST   /tags
POST   /tickets/:ticketId/tags/:tagId
DELETE /tickets/:ticketId/tags/:tagId
```

## Testing

Run the end-to-end test suite:

```bash
npm run test:e2e
```

Current E2E coverage includes authentication, authorization, tickets, search, pagination, comments, internal comments, tags, duplicate tags, and audit events.

## Validation

The application uses NestJS `ValidationPipe` with:

* `whitelist: true`
* `forbidNonWhitelisted: true`
* `transform: true`

This prevents unsupported request properties from being silently accepted.

## CI

GitHub Actions runs the following pipeline:

1. Checkout repository
2. Setup Node.js
3. Install dependencies with `npm ci`
4. Build the application
5. Run database migrations
6. Seed the PostgreSQL database
7. Run E2E tests

Workflow:

```text
.github/workflows/ci.yml
```

## Repository Structure

```text
src/
├── auth/
├── comments/
├── database/
├── migrations/
├── tags/
├── tickets/
├── users/
├── app.module.ts
└── main.ts

test/
└── app.e2e-spec.ts

docs/
└── ERD.md

.github/
└── workflows/
    └── ci.yml
```

## License

This project is created as part of the Coding Pixel internship program.
## Development Status

The Week 10 Support Desk backend is implemented and tested.

- Build: passing
- E2E tests: 20/20 passing
- Database migrations: verified
- Database seeding: verified
- GitHub Actions CI: configured
'@