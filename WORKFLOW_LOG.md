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
- **Branch**: `feature/database-modeling` *(Current Target)*
- **Planned Actions**:
  - Configure Prisma ORM with Supabase PostgreSQL connection strings (`DATABASE_URL` & `DIRECT_URL`).
  - Define relational schema:
    - `User`: Roles (`ORGANIZER`, `CUSTOMER`), authentication credentials.
    - `Event`: Venues, dates, grid dimensions ($rows \times seats$), pricing strategy selector.
    - `SeatTier` & `Seat`: Tiered pricing, row labels, seat numbers, hold statuses (`AVAILABLE`, `HELD`, `BOOKED`), hold expiry timestamps, and concurrency versions.
    - `Booking`, `BookingSeat`, `BookingStatusHistory`: Audit log and lifecycle tracking.
    - `Notification`: In-app notification center data store.
  - Create database seed script with working demo accounts for both roles and sample events with full seat maps.

---

### Phase 3: Authentication & RBAC (Organizer vs Customer)
- **Branch**: `feature/auth-rbac`
- **Planned Actions**:
  - User registration with `bcryptjs` password hashing and input validation DTOs.
  - JWT token generation and Passport JWT strategy.
  - `@Roles('ORGANIZER' | 'CUSTOMER')` guard intercepting unauthorized actions.

---

### Phase 4: Event Management & Public Discovery
- **Branch**: `feature/events-and-discovery`
- **Planned Actions**:
  - Organizer-only event creation with automatic seat grid matrix generation.
  - Public search by name, city filter, date filter, and pagination.
  - Dynamic seat map endpoint with lazy hold expiration logic.

---

### Phase 5: Concurrency-Safe Seat Hold Engine
- **Branch**: `feature/concurrency-seat-hold`
- **Planned Actions**:
  - Atomic conditional update query ensuring strictly 1 user succeeds when multiple users click the same seat.
  - 5-minute hold reservation window.
  - Concurrency simulation test script verifying zero double-booking under load.

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
