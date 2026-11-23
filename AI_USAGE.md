# TicketFlow — AI Usage & Engineering Disclosure

This document provides a transparent and detailed disclosure of AI tool usage during the design, development, and testing of **TicketFlow** for the **CPS Academy InterviewQuest-3 Round 5 Assignment**, in full accordance with academic and competition integrity guidelines.

---

## 1. AI Tools & Assistant Environment

- **Primary AI Assistant**: Antigravity (Powered by Google Gemini 2.5 Pro).
- **Execution Model**: Human-in-the-Loop Pair Programming & Architecture Co-pilot.
- **Workflow**: The human developer formulated architectural requirements, domain constraints, database schemas, and design pattern boundaries. The AI assistant was utilized to generate boilerplate code, assist with TypeScript typings, draft test fixtures, and accelerate frontend layout scaffolding.

---

## 2. Breakdown of AI Contributions vs. Human Engineering

| Project Area | AI Assistance Provided | Human Developer Architectural Direction & Refinement |
|---|---|---|
| **System Architecture** | Generating Mermaid diagram syntax; drafting initial DTO signatures. | Designed the 3-Tier Layered Architecture; selected and specified GoF patterns (Strategy for Pricing & Payments, State for Booking Lifecycle, Observer for Notifications); defined separation of concerns. |
| **Database Modeling** | Generating initial Prisma model schema syntax and relations. | Defined composite index constraints (`@@unique([eventId, rowLabel, seatNumber])`), atomic optimistic locking versioning (`version Int @default(1)`), and explicit audit trail relations (`BookingStatusHistory`). |
| **Concurrency Control** | Proposed standard transactions and Redis-based locking. | **Rejected external Redis locks**. Designed native PostgreSQL **Atomic Conditional Row Updates** (`UPDATE "Seat" SET ... WHERE status = 'AVAILABLE' OR (status = 'HELD' AND holdExpiresAt < NOW())`) to guarantee zero double-booking without external infrastructure latency. |
| **Seat Hold Expiration** | Proposed `@nestjs/schedule` background cron polling every 10 seconds. | **Rejected background cron polling**. Identified that free-tier cloud containers (Render/Railway) idle and sleep after 15 minutes, which stops cron timers and causes seats to remain locked indefinitely. Designed **Lazy (Just-In-Time) Expiration** within queries. |
| **Design Patterns** | Assisted with boilerplate class declarations implementing interfaces. | Architected the `PaymentProcessor` and `PricingStrategy` interfaces; designed the `BookingState` transitions and the refund rule engine; wired domain event dispatching through `EventEmitter2`. |
| **Testing & Coverage** | Generated initial test mock fixtures for NestJS testing modules. | Designed the 10-user simultaneous concurrency race condition test (`concurrency-hold.spec.ts`); wrote edge cases for 24-hour refund threshold boundary conditions; ensured 44 unit tests pass with coverage reports. |
| **Frontend UI** | Scaffolding Tailwind CSS grid classes and layout structure. | Built the interactive seat grid state management, real-time 5-minute hold timer, checkout provider switcher, status history timeline, and 1-click Quick Demo Switcher chips for frictionless evaluation. |
| **CI/CD Automation** | Generated GitHub Actions workflow syntax for matrix builds. | Configured Node.js 20 environment, Monorepo working directories, Prisma client generation, coverage reporting, and linting enforcement. |

---

## 3. Critical Mistakes Caught, Audited, and Corrected

During development, the AI assistant made several suggestions that contained architectural flaws, edge-case bugs, or TypeScript compilation errors. The human developer audited, diagnosed, and corrected these issues:

### Mistake 1: Fragile Background Polling Cron for Seat Hold Expiration
- **AI Proposal**: Use `@nestjs/schedule` with an `@Interval(10000)` cron worker querying `prisma.seat.updateMany({ where: { status: 'HELD', holdExpiresAt: { lt: new Date() } }, data: { status: 'AVAILABLE' } })`.
- **Flaw Detected**: On free-tier cloud deployments (such as Render or Railway), containers automatically spin down into a sleep state after 15 minutes of inactivity. When a container sleeps, internal event loops and cron schedules freeze completely. Any seats placed on hold before inactivity would remain permanently locked in `HELD` state until an arbitrary external HTTP request wakes the server.
- **Correction Made**: Replaced the polling cron with **Lazy (Just-In-Time) Expiration**. In the read endpoint (`GET /events/:id/seats`) and the atomic hold endpoint (`POST /bookings/hold`), expiration is evaluated dynamically directly in SQL:
  ```sql
  WHERE "status" = 'AVAILABLE' OR ("status" = 'HELD' AND "holdExpiresAt" < NOW())
  ```
  This guarantees immediate seat availability upon expiration without relying on any running background thread.

---

### Mistake 2: TypeScript Array Element Narrowing in State Pattern
- **AI Proposal**: In `held.state.ts` and `pending-payment.state.ts`, the AI generated:
  ```typescript
  const validTransitions = ['PENDING_PAYMENT', 'CANCELLED', 'EXPIRED'];
  return validTransitions.includes(targetStatus);
  ```
- **Flaw Detected**: TypeScript compiler error `TS2345: Argument of type 'BookingStatus' is not assignable to parameter of type '"PENDING_PAYMENT" | "CANCELLED" | "EXPIRED"'` because `validTransitions` was inferred as `string[]` rather than a typed subset of `BookingStatus`.
- **Correction Made**: Explicitly typed the transition array as `const validTransitions: BookingStatus[] = [...]`, ensuring strict compile-time type safety across all state machine transitions.

---

### Mistake 3: Unmocked Domain Services in Concurrency Unit Tests
- **AI Proposal**: When unit tests were scaffolded for `concurrency-hold.spec.ts`, the AI instantiated `BookingsService` without providing mocks for the newly introduced `BookingLifecycleService` and `EventEmitter2` dependencies.
- **Flaw Detected**: NestJS dependency injection threw `NullPointerException` during test suite initialization because the constructor dependencies were missing from the testing module provider list.
- **Correction Made**: Created dedicated mock providers for `BookingLifecycleService` and `EventEmitter2` in `concurrency-hold.spec.ts` and `bookings.service.spec.ts`, restoring clean compilation and passing all 44 unit tests.

---

### Mistake 4: Missing Frontend Environment Type Declarations
- **AI Proposal**: Directly accessing `import.meta.env.VITE_API_URL` inside `frontend/src/services/api.ts`.
- **Flaw Detected**: TypeScript build failed with `error TS2339: Property 'env' does not exist on type 'ImportMeta'`.
- **Correction Made**: Added `frontend/src/vite-env.d.ts` with explicit `/// <reference types="vite/client" />` declarations and defensive fallback casting `(import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'`, ensuring smooth builds in both development and production CI pipelines.

---

## 4. Reflections on AI-Augmented Software Engineering

The development of TicketFlow illustrates the modern engineering standard of **AI-assisted, human-directed development**:
1. **Speed Multiplier**: AI eliminated mundane typing overhead (repetitive DTO class decorators, boilerplate interfaces, and test fixtures), allowing development to progress from concept to fully tested full-stack monorepo in record time.
2. **Human Architectural Primacy**: AI cannot replace system architecture, concurrency analysis, or failure-mode engineering. Without deep developer understanding of PostgreSQL row locks, cloud container sleep cycles, and state machine integrity, the resulting system would have contained severe production race conditions and reliability issues.
3. **Verification Rigor**: Every line of code generated was subjected to automated linting, strict TypeScript type-checking, and comprehensive unit tests with coverage verification.
