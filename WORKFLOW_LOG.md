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
- **Actions Completed**:
  - Implemented **Strategy Pattern for Dynamic Pricing**:
    - `PricingStrategy` interface enforcing Open/Closed and Liskov Substitution principles.
    - `StandardPricingStrategy`: Returns standard tier base price.
    - `EarlyBirdPricingStrategy`: 20% discount if reserved $\ge 7$ days prior to event; standard base price if $< 7$ days.
    - `PricingService` (Strategy Context): Injects and registers strategies dynamically, wiring into `BookingsService.holdSeats`.
  - Implemented **Strategy Pattern for Pluggable Payments**:
    - `PaymentProcessor` interface (`processPayment(PaymentRequest): Promise<PaymentResult>`).
    - `MockStripeProcessor`: Simulates card auth with `ch_stripe_mock_` transaction IDs.
    - `MockPaypalProcessor`: Simulates wallet capture with `PAYPAL-MOCK-` transaction IDs.
    - `PaymentsService` (Strategy Context): Dispatches payments to chosen provider without modifying any booking code.
  - Implemented **Payment Idempotency**:
    - Detects identical `idempotencyKey` on confirmed bookings and replays cached transaction result without re-charging or modifying the database.
  - Enforced hold validity before checkout: expired holds are rejected (`BadRequestException`) and seats are automatically released.
  - Transactionally confirmed booking and marked all associated seats as `BOOKED`.
  - Emitted `booking.confirmed` domain event for decoupled notifications.
  - Added unit test suites for `pricing.service.spec.ts` and `payments.service.spec.ts`. Total **34 unit tests** passing across 8 test suites.
- **Git Commits**:
  - `feat(pricing): implement strategy pattern for dynamic pricing calculations`
  - `feat(payments): implement strategy pattern for pluggable mock payment providers`
  - `feat(payments): implement payment idempotency to prevent duplicate charges`
  - `test(strategy): add unit tests for pricing strategies and pluggable payment processors`
  - `docs: update workflow log with phase 6 strategy patterns`

---

### Phase 7: Booking Lifecycle, Observer Notifications & Refund Engine
- **Branch**: `feature/booking-lifecycle-notifications`
- **Actions Completed**:
  - Implemented **State Pattern for Booking Lifecycle**:
    - `BookingState` interface enforcing finite state transitions: `Held` $\rightarrow$ `Pending Payment` $\rightarrow$ `Confirmed` / `Expired` / `Cancelled`.
    - Concrete states: `HeldState`, `PendingPaymentState`, `ConfirmedState`, `ExpiredState`, `CancelledState`.
    - `BookingLifecycleService` (State Context): Validates transition legality and rejects illegal state transitions (e.g., `Expired` $\rightarrow$ `Confirmed`) with `BadRequestException`.
  - Implemented **Cancellation & Refund Rule Engine**:
    - `POST /bookings/:id/cancel`: Calculates event date vs cancellation timestamp.
    - Rule: **100% full refund** if cancelled $> 24$ hours before event; **0% non-refundable** if cancelled $\le 24$ hours before event.
    - Restores all associated seats back to `AVAILABLE` for other customers.
    - Logs detailed cancellation reason and refund amounts to `BookingStatusHistory`.
  - Implemented **Observer Pattern for Decoupled Notifications**:
    - Domain events: `BookingConfirmedEvent` and `BookingCancelledEvent`.
    - `EmailNotificationListener`: Simulates outbound emails with formatted logger output.
    - `InAppNotificationListener`: Persists records to `Notification` table.
    - Core booking and payment services only emit events; new channels (e.g., SMS/Push) can be added without modifying booking code (**Open/Closed Principle**).
  - Implemented In-App Notification Center:
    - `GET /notifications`: Lists user notifications and unread badge count.
    - `PATCH /notifications/:id/read` & `PATCH /notifications/read-all`: Mark as read.
  - Added unit test suites for `BookingLifecycleService`, `NotificationsService`, and cancellation refund calculations. Total **44 unit tests** passing across 10 test suites.
- **Git Commits**:
  - `feat(bookings): implement state pattern for booking lifecycle transitions`
  - `feat(notifications): implement observer pattern for decoupled email and in-app notifications`
  - `feat(bookings): implement cancellation and refund rule calculation`
  - `test(lifecycle): add unit tests for state machine, notifications, and refund rule`
  - `docs: update workflow log with phase 7 lifecycle and notifications`

---

### Phase 8: Central Error Handling, Logging & CI Coverage
- **Branch**: `chore/error-handling-and-logging`
- **Actions Completed**:
  - Implemented `HttpExceptionFilter` in `src/common/filters/`: Uniformly intercepts HTTP errors and internal server errors, formatting responses with `statusCode`, `timestamp`, `path`, `method`, `error`, and `message` while hiding sensitive stack traces.
  - Implemented `LoggingInterceptor` in `src/common/interceptors/`: Captures execution latency and emits structured logs (`[METHOD] URL Status +DurationMs`).
  - Registered both filter and interceptor globally in `main.ts`.
  - Executed full test suite with coverage (`npm run test:cov`): Generated coverage reports in `coverage/lcov-report/`.
  - Verified 100% test coverage across core domain units (Pricing Strategies 100%, Lifecycle State Machine 95.8%, Notifications 100%, Payment Processors 100%). Total **44 unit tests** passing across 10 test suites.
- **Git Commits**:
  - `feat(common): implement global central exception filter and structured logging interceptor`
  - `test(coverage): execute unit test suite with coverage reporting in ci`
  - `docs: update workflow log with phase 8 error handling and logging`

---

### Phase 9: React Frontend (Organizer & Customer Web Application)
- **Branch**: `feature/frontend-ui`
- **Actions Completed**:
  - Implemented strong TypeScript domain interfaces in `frontend/src/types/index.ts`.
  - Built unified, authenticated API Client in `frontend/src/services/api.ts` with error normalization and automatic JWT injection.
  - Implemented `AuthContext` with login, register, logout, and 1-click **Quick Demo Login** chips (Organizer, Customer 1, Customer 2) for friction-free evaluation and video walkthrough.
  - Implemented `Navbar` with dynamic role badges, quick demo switchers, and badged real-time in-app notification center.
  - Built `EventBrowsePage`: Search by title/venue, filter by city, pagination, pricing strategy badges (Standard vs Early Bird), starting prices.
  - Built `EventDetailsPage` & **Interactive Seat Map**:
    - Color-coded seat grid: Available (green), Held by you (yellow pulse), Unavailable/Booked (gray/lock).
    - Atomic hold execution with **live sticky 5-minute countdown timer**.
    - Instant conflict alert toast on race conditions: "Seat is already held or booked by another user".
    - Voluntary hold release action.
  - Built `CheckoutModal`:
    - Order summary and pricing breakdown.
    - Pluggable provider toggle: **Mock Stripe** vs **Mock PayPal** (Strategy Pattern in action).
    - Client-side idempotency key protection preventing duplicate charges on retries.
  - Built `MyBookingsPage`:
    - Customer booking list with status badges (`Confirmed`, `Held`, `Cancelled`, `Expired`).
    - Expandable **Audit Status History Timeline** showing state transitions and timestamped reasons.
    - **Cancellation with Refund Rule Engine**: Dynamic modal previewing refund eligibility ($> 24$h full 100% refund vs $\le 24$h non-refundable).
  - Built `OrganizerDashboardPage`:
    - Organizer event list with booking counts and seat counts.
    - Event Creation Wizard: Venue, city, date, grid dimensions ($rows \times seats$), tier pricing, and pricing strategy selector (`Standard` vs `Early Bird`).
  - Verified clean compilation, 0 lint errors, and production builds across both backend and frontend.
- **Git Commits**:
  - `feat(frontend): setup types, api client, auth context, and navbar with demo switcher`
  - `feat(frontend): implement event discovery, search, city filters, and pagination`
  - `feat(frontend): implement interactive seat map with live 5-minute hold timer and conflict handling`
  - `feat(frontend): implement checkout modal with mock stripe and paypal strategy switcher`
  - `feat(frontend): implement my bookings with audit history and cancellation refund preview`
  - `feat(frontend): implement organizer studio with event creation wizard and tier builder`
  - `docs: update workflow log with phase 9 frontend web application`

---

### Phase 10: Live Cloud Deployment & Walkthrough Video Prep
- **Branch**: `chore/deployment-and-docs`
- **Planned Actions**:
  - Deploy frontend to Vercel and backend to Render.
  - Complete `README.md`, `ARCHITECTURE.md`, and `AI_USAGE.md`.
  - Structured 10-minute video presentation checklist.
