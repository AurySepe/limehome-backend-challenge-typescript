# API Development Guidelines: NestJS, DTOs, Controllers & Services

This document provides a structured set of architectural guidelines and conventions for building NestJS applications. Strong validation, type safety, and Swagger OpenAPI inheritance ensure a clean and maintainable codebase.

---

## 1. Architectural Directory & Module Structure

The application is structured into **Feature-Driven (Vertical Slice) Modules**. Each functional domain resides in its own isolated directory inside `src/modules/<feature-name>/`.

### Root & Application Layout

```text
src/
├── app.module.ts            # Root NestJS module aggregating feature modules
├── prisma.ts                # Shared Prisma ORM client instance
├── server.ts                # Application bootstrap (ValidationPipe, SwaggerModule)
└── modules/
    ├── health/              # Health check domain module
    │   ├── health.dto.ts
    │   ├── health.controller.ts
    │   ├── health.module.ts
    │   └── health.test.ts
    ├── bookings/            # Core booking management module
    │   ├── booking.dto.ts
    │   ├── booking.controller.ts
    │   ├── booking.service.ts
    │   ├── booking.module.ts
    │   └── booking.test.ts
    └── booking-extension/   # Booking extension feature module
        ├── booking-extension.dto.ts
        ├── booking-extension.controller.ts
        ├── booking-extension.service.ts
        ├── booking-extension.module.ts
        └── booking-extension.test.ts
```

### Module File Responsibilities

| File Pattern | Purpose & Responsibilities |
| :--- | :--- |
| `<feature>.dto.ts` | Defines input/output DTO classes decorated with `@ApiProperty()` and `class-validator` rules, containing standard constructors. |
| `<feature>.controller.ts` | NestJS `@Controller()` handling HTTP endpoints, request extraction, service calls, and explicit DTO response mapping. |
| `<feature>.service.ts` | NestJS `@Injectable()` service encapsulating business logic, domain checks, and Prisma ORM database calls. |
| `<feature>.module.ts` | NestJS `@Module()` registering the feature's controllers, providers, and exports. |
| `<feature>.test.ts` | Integration and unit test suite verifying feature endpoints and business logic. |

---

## 2. DTOs (Data Transfer Objects)

DTOs act both as validation schemas for incoming JSON payloads and as OpenAPI contracts for TypeScript and Swagger. DTOs MUST be built using `class-validator`, `class-transformer`, and `@nestjs/swagger`.

### Swagger Inheritance Principle

Define a single base class for entity reading/responses (e.g., `CustomerDto`), and derive write DTOs (e.g., `CreateCustomerDto`) using `@nestjs/swagger` utilities.

- **`@ApiProperty()`**: Every single property returned by a Controller or used in a request payload MUST be decorated with `@ApiProperty()`.
- **Specific Number Types**: In TypeScript, integers and floats share the `number` type. Specify integer properties explicitly: `@ApiProperty({ type: 'integer' })`.
- **`OmitType`**: Use `OmitType` for creation DTOs when auto-generated fields (such as `id`) should be excluded.

### Standard Constructor for Compile-Time Type Safety

Every DTO **MUST** feature a constructor accepting an object of its own type, using `plainToInstance`:

```typescript
import { plainToInstance } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerDto {
  @ApiProperty({ type: 'integer' })
  @IsNumber()
  id!: number;

  @ApiProperty()
  @IsString()
  name!: string;

  constructor(data: CustomerDto) {
    Object.assign(this, plainToInstance(CustomerDto, data));
  }
}
```

---

## 3. Controllers

Controllers process HTTP requests, invoke Services, and explicitly map domain objects to DTOs.

### Mandatory Return Type Annotations & Explicit Mapping

Every endpoint MUST have an explicit DTO return type annotation (`Promise<MyResponseDto>`).

> [!IMPORTANT]
> Controllers MUST NEVER return raw database entities (e.g., Prisma objects) directly. The Controller's responsibility is to map Service results manually into DTO instances.

### Strict Prohibition of `any`

Unsafe type casting (`as any`, `as unknown as Type`) is **STRICTLY BANNED**. All parameters, variables, and return values MUST be strongly typed.

---

## 4. Services

Services encapsulate core domain logic and database interactions using **Prisma ORM**.

- Inject `PrismaService` into Services.
- Execute independent queries in parallel using `Promise.all()`.
