# API Development Guidelines: Express, Prisma, TypeScript, @ts-rest & Zod

This document outlines the core coding guidelines, architectural standards, and contract-first patterns for our **Express.js + Prisma + TypeScript** applications. The focus is on **Contract-First API Architecture with `@ts-rest`**, **end-to-end type safety with Zod**, **Feature-Driven (Vertical Slice) modules**, and **automatic OpenAPI documentation**.

---

## 1. Architectural Structure (Feature-Driven & Contract-First)

Applications are organized by functional domain (Feature Modules). Each module encapsulates its API contract, controllers, services, utilities, and tests under `src/modules/<feature-name>/`.

### Module Directory Standard

```text
src/modules/<feature-name>/
├── <feature>.contract.ts   # @ts-rest contract & Zod input/output schemas
├── <feature>.controller.ts # @ts-rest express handler implementation & response mappers
├── <feature>.service.ts    # Core domain business logic & Prisma database calls
├── <feature>.utils.ts      # Domain-specific helper utilities & calculations
└── <feature>.test.ts       # Feature-specific integration & unit tests
```

---

## 2. Contract-First API Design (@ts-rest + Zod)

All HTTP endpoints MUST be defined in a feature contract using `@ts-rest/core` and **Zod** before implementing controllers or services.

### Strict Prohibition of `any`

> [!CAUTION]
> The use of `any` (or unsafe type casting such as `as any` or `as unknown as Type`) is **STRICTLY BANNED** across the entire codebase under any circumstances.
> Every variable, schema, request parameter, and response body MUST be strongly and explicitly typed.

### Contract & Schema Definition Standard

- **Single Source of Truth**: Define API contracts using `initContract().router(...)`.
- **Input Validation**: Use Zod schemas for `body`, `pathParams`, and `query`.
- **Response Schemas**: Specify expected Zod schemas for every HTTP status code (`200`, `400`, `404`, etc.).

```typescript
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const BookingResponseSchema = z.object({
  id: z.number().int(),
  guestName: z.string(),
  unitID: z.string(),
  checkInDate: z.string().datetime(),
  numberOfNights: z.number().int(),
  checkOutDate: z.string().datetime(),
});

export const bookingContract = c.router({
  extendBooking: {
    method: 'POST',
    path: '/api/v1/booking/:id/extend',
    pathParams: z.object({
      id: z.coerce.number().int(),
    }),
    body: z.object({
      extraNights: z.number().int().positive('extraNights must be a positive integer'),
    }),
    responses: {
      200: BookingResponseSchema,
      400: z.string(),
      404: z.string(),
    },
    summary: 'Extend an active booking',
  },
});
```

---

## 3. Controllers & Static Type Safety (@ts-rest/express)

Controllers implement the contract using `@ts-rest/express` (`initServer().router(...)`).

### Prohibition of Un-Typed `res.json()`

- Handlers MUST NOT use raw, untyped Express `res.json(...)` or `res.status(...)` calls.
- Handlers MUST return a typed object matching the contract structure: `{ status: <statusCode>, body: <data> }`.
- **Compiler Safety**: If the object in `body` does not match the contract Zod schema for that status code, the TypeScript compiler WILL fail the build at compile time.

```typescript
import { initServer } from '@ts-rest/express';
import { bookingContract } from './booking.contract.js';

const s = initServer();

export const bookingController = s.router(bookingContract, {
  extendBooking: async ({ params, body }) => {
    // Input (params & body) is automatically parsed & typed by @ts-rest and Zod
    const outcome = await bookingService.extendBooking(params.id, body.extraNights);

    if (!outcome.success) {
      return { status: 400, body: outcome.reason };
    }

    // Static compiler check: returning non-matching body fields triggers a build error
    return {
      status: 200,
      body: outcome.booking,
    };
  },
});
```

### Zero-Drift OpenAPI / Swagger Generation

- Do NOT manually edit JSON or YAML OpenAPI files.
- Automatically generate the OpenAPI specification directly from `@ts-rest` contracts and serve it via `swagger-ui-express`. This guarantees 100% synchronization between implementation and documentation.

---

## 4. Service Layer & Database Access (Prisma ORM)

Services encapsulate domain logic and database queries using **Prisma Client**.

### Express Decoupling

- Service functions MUST be completely decoupled from Express HTTP objects (`Request`, `Response`).
- Services accept typed inputs and return domain-specific types or result objects.

### Parallel Query Execution

- For pagination or multi-query operations, execute queries in parallel using `Promise.all()` to minimize latency:

```typescript
const [bookings, total] = await Promise.all([
  prisma.booking.findMany({ where: { unitID }, skip, take }),
  prisma.booking.count({ where: { unitID } }),
]);
```

### Transaction Safety

- Multi-record state updates MUST execute within a Prisma transaction (`prisma.$transaction([...])`) to ensure atomic operations and rollback safety.
