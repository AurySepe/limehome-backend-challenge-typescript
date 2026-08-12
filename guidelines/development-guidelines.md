# API Development Guidelines: Express, Prisma & TypeScript

This document outlines the core coding guidelines and patterns for our **Express.js + Prisma + TypeScript** application. The focus is on **strict type safety**, **clean request/response handling**, and **maintaining explicit API contracts**.

---

## 1. Type Safety & Contracts

### Strict Prohibition of `any`

> [!CAUTION]
> The use of `any` (or unsafe type casting such as `as any` or `as unknown as Type`) is **STRICTLY BANNED** across the entire codebase under any circumstances.
> You must **never** write, accept, or approve code that uses `any` to bypass TypeScript checks. Every variable, function parameter, and return value MUST be strongly and explicitly typed.

### Interfaces & Types
- Define explicit TypeScript `interface` or `type` definitions for request payloads and response bodies.
- Keep optional fields (`fieldName?: string`) distinct from nullable fields (`fieldName: string | null`):
  - `fieldName?: string` means the field can be omitted from the JSON body.
  - `fieldName: string | null` means the key must exist, but its value can explicitly be `null`.

---

## 2. Controllers & HTTP Handlers

Controllers are responsible for receiving HTTP requests, processing business logic directly via Prisma ORM, and returning JSON responses.

### Explicit Response Mapping (Preventing Data Leaks)
- **FUNDAMENTAL RULE**: Controllers must NEVER directly return raw database instances output by Prisma if they contain sensitive or internal database fields.
- Always map raw Prisma query results explicitly to your response types before returning them in `res.json()` (e.g., `return res.status(200).json({ id: result.id, guestName: result.guestName })`).

### Handling Non-Error Missing States
- When a queried resource is absent, but its absence is a **valid and expected state** in the application domain (e.g., a guest with no current booking):
  - Do not throw an unhandled server error.
  - Return a clean `200 OK` response with a structured JSON indicating the empty/null state (e.g., `{ booking: null }`).

### No-Content Responses
- Endpoints that perform state-changing operations (such as updates or deletes) where returning data to the client is unnecessary should respond with `204 No Content` or `200 OK` with an explicit acknowledgment status.

---

## 3. Database Access (Prisma ORM)

All database operations are performed directly within handlers/helpers using **Prisma Client**.

### Parallel Query Execution
- When fetching dataset lists alongside total counts (e.g., for pagination or multi-table queries), always execute queries in parallel using `Promise.all()` to minimize HTTP response times:

```typescript
const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where: { unitID }, skip, take }),
    prisma.booking.count({ where: { unitID } }),
]);
```

### Business Rule Checks
- Keep domain checks (e.g., checking unit availability, guest conflict rules) clearly structured into helper functions to keep main route handlers clean and readable.
