# TicketFlow: Workflow & Execution Log

This document records the exact step-by-step progress, architectural decisions, and Git commit log for the **TicketFlow** project (CPS Academy InterviewQuest-3 Round 5 Assignment).

---

## Project Snapshot
- **Architecture**: Clean 3-Tier Layered Architecture (Controller $\rightarrow$ Service $\rightarrow$ Repository)
- **Backend Stack**: Node.js, NestJS, TypeScript, Prisma ORM
- **Database**: PostgreSQL (hosted on Supabase)
- **Frontend Stack**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Design Patterns Implemented**:
  - **Strategy Pattern**: Pluggable mock payment processors (`MockStripeProvider`, `MockPaypalProvider`) & dynamic pricing (`StandardPricing`, `EarlyBirdPricing`).
  - **Observer Pattern**: Decoupled domain event emission for booking notifications (Email log + In-App records).
  - **State Pattern**: Explicit booking lifecycle management (`HELD` $\rightarrow$ `PENDING_PAYMENT` $\rightarrow$ `CONFIRMED` / `CANCELLED` / `EXPIRED`).
  - **Atomic Conditional Updates**: Prevents double-booking race conditions directly in PostgreSQL without slow table locks.
  - **Lazy Expiration (Just-In-Time)**: 5-minute hold auto-release evaluated seamlessly upon access.

---

## Execution Log by Phase

### Phase 1: Repository Scaffolding & Initial Setup
- **Branch**: `setup/project-scaffolding`
- **Actions Completed**:
  - Initialized Git repository on `main` branch with root `.gitignore` and monorepo workspace scripts.
  - Created NestJS backend scaffold with validation pipes, Swagger documentation (`/api/docs`), CORS, and environment configuration.
  - Created React Vite frontend scaffold with Tailwind CSS, Lucide icons, and responsive health landing layout.
  - Created GitHub Actions CI workflow (`.github/workflows/ci.yml`) to automatically lint, test with coverage, and build both frontend and backend on every push and pull request.
- **Git Commits**:
  - `chore: initialize repository structure and root gitignore`
  - `chore(backend): bootstrap nestjs application with typescript and configuration`
  - `chore(frontend): bootstrap react vite application with tailwind css and lucide`
  - `ci: setup github actions pipeline for lint, build, and test`

---

### Phase 2: Database Schema & Modeling (Prisma + Supabase)
- **Branch**: `feature/database-modeling`
- **Actions Completed**:
  - Configured Prisma with PostgreSQL datasource supporting Supabase pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connections.
  - Defined relational database schema:
    - `User`: Roles (`ORGANIZER`, `CUSTOMER`), password hashing, audit timestamps.
    - `Event`: Title, venue, city, dates, grid dimensions ($rows \times seats$), pricing strategy enum (`STANDARD`, `EARLY_BIRD`).
    - `SeatTier` & `Seat`: Tiered pricing (VIP, Regular, Economy), row labels, seat numbers, hold statuses (`AVAILABLE`, `HELD`, `BOOKED`), hold expiration timestamp, and optimistic version counter. Unique constraint on `[eventId, rowLabel, seatNumber]` guarantees physical seat uniqueness.
    - `Booking`, `BookingSeat`, `BookingStatusHistory`: Full audit trail for booking lifecycle transitions (`HELD` $\rightarrow$ `PENDING_PAYMENT` $\rightarrow$ `CONFIRMED` / `EXPIRED` / `CANCELLED`), refund amounts, and idempotency key uniqueness.
    - `Notification`: In-app notification center store.
  - Implemented injectable `PrismaService` and global `PrismaModule` in NestJS.
  - Created automated database seeder (`prisma/seed.ts`) with demo credentials for Organizer and Customers, plus 2 showcase events with full seat maps (64 interactive seats total).
- **Git Commits**:
  - `feat(backend): configure prisma with supabase postgresql connection`
  - `feat(backend): define relational schema for users, events, seat tiers, and seats`
  - `feat(backend): define schema for bookings, status history, and in-app notifications`
  - `feat(backend): implement prisma service and database seed script with demo credentials`

---

### Phase 3: Authentication & RBAC (Organizer vs Customer)
- **Branch**: `feature/auth-rbac`
- **Actions Completed**:
  - Implemented `RegisterDto`, `LoginDto`, and `AuthResponseDto` with strict class-validator rules and Swagger documentation.
  - Implemented `AuthService` with secure password hashing (`bcryptjs`), JWT token generation, and account lookup.
  - Implemented `JwtStrategy` and `JwtAuthGuard` extracting Bearer tokens and validating sessions.
  - Implemented `RolesGuard` and `@Roles('ORGANIZER' | 'CUSTOMER')` metadata decorator enforcing role-based access control.
  - Implemented `@CurrentUser()` parameter decorator to extract the authenticated user context.
  - Created endpoints: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/organizer-check`, `GET /auth/customer-check`.
  - Added unit test suites for `AuthService` (registration conflict, password validation, login) and `RolesGuard` (role allowance and forbidden rejection). All 9 tests passing.
- **Git Commits**:
  - `feat(auth): implement user registration, login, and jwt signing`
  - `feat(auth): implement rbac with roles guard and current user decorator`
  - `test(auth): add unit tests for auth service and roles guard`
  - `docs: update workflow log with phase 3 auth and rbac`

---

### Phase 4: Event Management & Public Discovery
- **Branch**: `feature/events-and-discovery`
- **Actions Completed**:
  - Implemented `CreateEventDto`, `UpdateEventDto`, `EventQueryDto`, and `SeatMapResponseDto` with nested validation.
  - Implemented `EventsService` with transactional event creation, automatic tier row validation, and automatic seat grid generator ($rows \times seats$ mapped to letters 'A', 'B', etc.).
  - Enforced strict business rule: **Organizers can only manage and delete their own events** (`ForbiddenException` thrown on violation).
  - Implemented public discovery endpoint `GET /events` supporting full-text search (title/venue/city), city filtering, date ranges, and pagination, calculating lowest starting price per event.
  - Implemented dynamic seat map query `GET /events/:id/seats` with **dynamic lazy hold expiration**: automatically treats held seats with `holdExpiresAt < NOW()` as `AVAILABLE`, and computes `secondsRemaining` and `isHeldByMe` for active holds.
  - Added unit test suite in `events.service.spec.ts` covering tier validation, ownership enforcement, and lazy hold expiration. Total 16 unit tests passing across 4 suites.
- **Git Commits**:
  - `feat(events): implement event management and automatic seat grid generator`
  - `feat(events): enforce organizer ownership and public discovery with pagination`
  - `feat(events): implement dynamic seat map query with lazy hold expiry`
  - `test(events): add unit tests for event creation, ownership, and seat map expiry`
  - `docs: update workflow log with phase 4 events and discovery`

---

### Phase 5: Concurrency-Safe Seat Hold Engine
- **Branch**: `feature/concurrency-seat-hold`
- **Actions Completed**:
  - Implemented `HoldSeatsDto` with UUID array validation and `BookingResponseDto` with live hold countdown.
  - Implemented atomic conditional update logic in `BookingsService.holdSeats`:
    ```sql
    UPDATE "Seat"
    SET "status" = 'HELD', "heldByUserId" = :userId, "holdExpiresAt" = :holdExpiresAt, "version" = "version" + 1
    WHERE "id" = :seatId AND ("status" = 'AVAILABLE' OR ("status" = 'HELD' AND "holdExpiresAt" < NOW()))
    ```
  - Guaranteed zero double-booking under concurrent load: throws `409 ConflictException` if affected rows = 0.
  - Created booking in `HELD` status, associated `BookingSeat` records, and logged initial transition in `BookingStatusHistory`.
  - Implemented voluntary hold release endpoint `POST /bookings/:id/release` restoring seats to `AVAILABLE` and setting status to `EXPIRED`.
  - Implemented customer booking queries `GET /bookings/my-bookings` and `GET /bookings/:id` with remaining hold timer calculation.
  - Added concurrency simulation test suite (`concurrency-hold.spec.ts`) executing 10 simultaneous requests targeting the same seat: verified strictly 1 succeeds and 9 fail with 409 Conflict.
  - Added unit test suite for bookings service. Total **23 unit tests** passing across 6 test suites.
- **Git Commits**:
  - `feat(seats): implement atomic conditional update seat hold mechanism`
  - `feat(bookings): initialize booking in held state with status history and voluntary release`
  - `test(concurrency): add concurrency test suite verifying zero double-booking under 10 simultaneous requests`
  - `docs: update workflow log with phase 5 concurrency seat hold`

---

### Phase 6: Strategy Patterns (Pricing & Pluggable Payments)
- **Branch**: `feature/strategy-pricing-payments`
- **Planned Actions**:
  - `PricingStrategy` interface with `Standard` and `EarlyBird` implementations.
  - `PaymentProcessor` interface with `MockStripe` and `MockPayPal` providers.
  - Idempotency key protection to prevent duplicate charges on network retries.

---

### Phase 7: Booking Lifecycle, Observer Notifications & Refund Engine
- **Branch**: `feature/booking-lifecycle-notifications`
- **Planned Actions**:
  - State pattern for booking lifecycle transitions.
  - Domain event emission for notifications (Email logger + In-App database store).
  - Cancellation refund engine: 100% refund if $> 24$h before event, 0% refund if $\le 24$h.

---

### Phase 8: Unit Testing Suite & Coverage
- **Branch**: `test/unit-test-suite`
- **Planned Actions**:
  - Unit tests for booking state machine, pricing calculations, hold expiry, and refund policies.
  - Code coverage reporting verified in CI pipeline.

---

### Phase 9: React Frontend (Organizer & Customer Experiences)
- **Branch**: `feature/frontend-ui`
- **Planned Actions**:
  - Responsive event catalog with search, filters, and cards.
  - Interactive seat grid with live 5-minute hold timer.
  - Checkout modal with payment provider switcher.
  - My Bookings dashboard with cancellation & refund preview.
  - In-app notification center.
  - Organizer dashboard for event creation.

---

### Phase 10: Live Cloud Deployment & Walkthrough Video Prep
- **Branch**: `chore/deployment-and-docs`
- **Planned Actions**:
  - Deploy frontend to Vercel and backend to Render.
  - Complete `README.md`, `ARCHITECTURE.md`, and `AI_USAGE.md`.
  - Structured 10-minute video presentation checklist.
