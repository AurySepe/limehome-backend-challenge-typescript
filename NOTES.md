### Code Refactoring & Validation Framework

The project was rewritten using the **NestJS** framework, primarily to leverage its native automatic validation capabilities on endpoints and to manage the underlying infrastructure in a more robust and consistent manner.

The codebase has been reorganized into a **feature-based module structure** (Vertical Slice Architecture):
- Each feature resides in its own dedicated directory containing all the necessary files.
- **DTOs**: precisely define the input and output data types for the APIs.
- **Controllers**: handle request extraction and data mapping.
- **Services**: encapsulate all domain business logic.
- **Tests**: each module includes a dedicated test suite for that feature.

Thanks to the integration of the NestJS OpenAPI module, Swagger documentation is now generated automatically. Furthermore, all types are validated both at compile-time and at runtime: the latter is a fundamental feature, especially in an AI agent-based setup where strict type safety prevents the agent from making mistakes or deviating from constraints, forcing it to follow the exact types defined by the developer.

This specific framework was chosen for simplicity, but there are dozens of similar alternatives; the core takeaway is the demonstrated pattern of type management and feature separation.

### Testing Suite Architecture

The testing setup has been significantly enhanced to include both unit tests and integration tests:
- **Jest & Supertest**: Replaced Node's built-in test runner with Jest and Supertest, taking advantage of a far more mature ecosystem and robust tooling specifically tailored for NestJS.
- **In-Memory Network Simulation**: Supertest simulates HTTP requests directly in memory without binding to actual TCP ports.
- **Isolation & Side-Effect Prevention**: Testing endpoints in memory avoids external side effects and state pollution across test runs. This is critical for preventing flaky tests, which pass or fail unpredictably due to external factors such as database file locks or state leftovers.

### Docker

I implemented a multi-stage Docker build to produce a final image containing only the strict minimum required to run the application. I also integrated a dedicated test stage inside the multi-stage pipeline, making it impossible to produce an image that does not pass the test suite, which is fundamental for preventing the release of broken code to production.

A smaller image also improves startup latency, reduces the attack surface, and lowers upload times and storage costs on the container registry.
