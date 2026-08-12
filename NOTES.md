This file serves to document the project refactoring, moving it from the trial version of the challenge to a more professional and structured environment. I know it wasn't required by the challenge, which is why it's placed in a separate branch, but I thought it could be a good talking point for the technical interview. If you haven't looked at the main branch yet, there is no need to read this document since it is a continuation of the NOTES.md explanation from the main branch.

### Code Refactoring & Validation Framework

The project was rewritten using the **NestJS** framework, primarily to leverage its native automatic validation capabilities on endpoints and to manage the underlying infrastructure in a more robust and consistent manner.

The codebase has been reorganized into a **feature-based module structure** (Vertical Slice Architecture):
- Each feature resides in its own dedicated directory containing all the necessary files.
- **DTOs**: precisely define the input and output data types for the APIs.
- **Controllers**: handle request extraction anda data mapping.
- **Services**: encapsulate all domain business logic.
- **Tests**: each module includes a dedicated test suite for that feature.

Thanks to the integration of the NestJS OpenAPI module, Swagger documentation is generated automatically directly from codebase metadata. Furthermore, types are strictly validated both at compile-time and runtime. This declarative approach replaces verbose, error-prone manual validation scripts and repetitive `if` checks, significantly reducing the risk of human error.

Importantly, in modern AI-agent-assisted development workflows, preventing human error also directly prevents AI agent error. Because AI coding agents operate similarly to human developers, establishing strict, enforceable runtime contracts forces the agent to adhere to the exact types and constraints defined by the architect without drifting.

While NestJS was chosen here for simplicity, there are numerous alternative tools that achieve similar results; the primary takeaway is the demonstrated pattern of strong type management, declarative validation, and vertical feature separation.

### Testing Suite Architecture

The testing setup has been significantly enhanced to include both unit tests and integration tests:
- **Jest & Supertest**: Replaced Node's built-in test runner with Jest and Supertest, taking advantage of a far more mature ecosystem and robust tooling specifically tailored for NestJS.
- **In-Memory Network Simulation**: Supertest simulates HTTP requests directly in memory without binding to actual TCP ports.
- **Isolation & Side-Effect Prevention**: Testing endpoints in memory avoids external side effects and state pollution across test runs. This is critical for preventing flaky tests, which pass or fail unpredictably due to external factors such as database file locks or state leftovers.

### Docker

I implemented a multi-stage Docker build to produce a final image containing only the strict minimum required to run the application. I also integrated a dedicated test stage inside the multi-stage pipeline, making it impossible to produce an image that does not pass the test suite, which is fundamental for preventing the release of broken code to production.


A smaller image also improves startup latency, reduces the attack surface, and lowers upload times and storage costs on the container registry.

Because development dependencies are pruned in the final production stage (`npm prune --omit=dev`), test runners like Jest are excluded from the runtime container. Consequently, running `docker compose run --rm api npm test` against the production container will intentionally fail. To execute the test suite in an isolated Docker environment without generating the final production image, the dedicated `tester` stage can be built directly:

```bash
docker build --target tester .
```


### Concurrency and Transactions

I identified a TOCTOU (Time-Of-Check / Time-Of-Use) race condition in both the booking creation and the booking extension flows. Since the availability check and the write operation were two separate steps with no atomicity guarantee between them, two concurrent requests could both pass the check and both commit, producing inconsistent state such as double-booked units.

To address this, I wrapped the check and write phases inside a single Prisma interactive transaction with serializable isolation level, initiated and owned by the controller. Service methods receive the transaction client as a parameter, keeping business logic in the service while the controller owns the transactional boundary. I also added a concurrent integration test that fires two identical requests simultaneously and asserts that exactly one succeeds and only one record is created in the database.

### Idempotency

For the stay extension API (`POST /api/v1/booking/:id/extend`), duplicate network requests could accidentally extend a guest's stay multiple times. To guarantee idempotency, I implemented a mandatory `Idempotency-Key` HTTP header. 

A custom NestJS parameter decorator (`@IdempotencyKey`) extracts the header and validates it as a mandatory UUID v4 using `ParseUUIDPipe`. Inside the serializable transaction, the controller checks whether an extension with the same `idempotencyKey` has already been recorded for that booking. If found, it short-circuits execution and returns the current booking immediately (`200 OK`) without re-applying extra nights, guaranteeing safe, repeatable API invocations.


