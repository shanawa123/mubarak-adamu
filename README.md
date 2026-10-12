# ShinkafiRide.ng

**Full-Stack Ride-Hailing, Transport Management, and Security Platform**  
*Initially architected for Shinkafi, Zamfara State, Nigeria — Expandable to Northwest Nigeria & National Corridors.*

---

## 1. Executive Summary

ShinkafiRide.ng is an enterprise-grade, full-stack mobility platform designed to solve the acute transportation and transit security challenges of Shinkafi and surrounding transit routes (Shinkafi – Gusau, Shinkafi – Kaura Namoda – Sokoto).

The system integrates five distinct stakeholder roles into a unified architecture:
1. **Passengers**: Landmark-based booking, authoritative server pricing, 4-digit verification codes (OTP), and 24/7 Emergency SOS integration.
2. **Drivers**: Online/offline availability dispatch, trip milestone tracking, OTP validation before trip start, transparent 85/15 earnings ledger, and route compliance.
3. **Transport Operators**: Fleets, vehicles, driver assignments, and isolated organizational performance metrics.
4. **Administrators**: Centralized control, user lifecycle management with documented audit reasons, driver vetting, configurable regional fare rules, and immutable audit logs.
5. **Security Officers**: Dedicated safety department with an incident triage room, ticket investigations, timeline notes, evidence retention, and direct escalation to the Zamfara State Police Command and corridor patrol units.

---

## 2. Technology Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons, Plus Jakarta Sans & JetBrains Mono typography.
- **Backend**: Node.js & Express REST API with server-side business logic, rate limiting, and cookie/session RBAC.
- **Authoritative Server Pricing**: Distance (Haversine formula), base fare, per-kilometer rate, per-minute rate, and minimum fare computed on the server.
- **Database Schema**: 32 normalized entities represented in `prisma/schema.prisma` and PostgreSQL DDL `db/schema.sql`.
- **Mapping & Location**: SVG and OpenStreetMap tile vector adapter with landmark presets for Shinkafi (Central Market, General Hospital, Galadi Road, Badarawa Motor Park, Emir's Palace, Katuru Gate, LGA Secretariat).
- **Payment & Compliance**: Nigerian Naira (NGN), Paystack/Flutterwave webhook signature validation, cash ledger tracking, and compliance with the **Nigeria Data Protection Act (NDPA) 2023**.

---

## 3. Directory Structure

```
├── .env.example                # Environment variables template
├── db/
│   ├── schema.sql              # Production PostgreSQL DDL (32 normalized tables)
│   └── seed.sql                # Seed data for Zamfara service areas & fare rules
├── prisma/
│   └── schema.prisma           # Prisma schema definition
├── server/
│   ├── db.ts                   # In-memory relational database store & seed generator
│   ├── auth.ts                 # Argon2/PBKDF2 hashing, session management, RBAC middleware
│   ├── fareCalculator.ts       # Server-side authoritative fare calculations
│   └── routes/
│       ├── authRoutes.ts       # Registration, login, logout, demo persona switcher
│       ├── ridesRoutes.ts      # Fare estimate, booking, status, cancel, ratings
│       ├── passengerRoutes.ts  # Profile, active trip, SOS panic dispatch
│       ├── driverRoutes.ts     # Availability, requests queue, arrived, OTP start, complete, earnings
│       ├── operatorRoutes.ts   # Fleet vehicles, driver assignment, isolation
│       ├── adminRoutes.ts      # Metrics, user suspension, driver vetting, fare rules, audit logs
│       ├── securityRoutes.ts   # Incident triage, evidence dossier, police escalation
│       ├── paymentRoutes.ts    # Paystack/Flutterwave initialize, verify, webhook
│       └── testRoutes.ts       # In-app automated test suite runner
├── server.ts                   # Express server entry point mounting Vite middleware
├── src/
│   ├── assets/images/          # Generated photo assets (Hero, Safety, Driver, Fleet)
│   ├── components/
│   │   ├── layout/             # Strict Top Bar Navbar & Footer
│   │   ├── map/                # Interactive Shinkafi map with live GPS markers
│   │   ├── public/             # Homepage with fare estimator & corridor notices
│   │   ├── passenger/          # Passenger Dashboard
│   │   ├── driver/             # Driver Dashboard
│   │   ├── operator/           # Operator Fleet Dashboard
│   │   ├── admin/              # Centralized Admin Dashboard
│   │   ├── security/           # Safety & Incident Response Dashboard
│   │   └── tests/              # E2E Automated Test Suite Modal
│   ├── context/AuthContext.tsx # Authentication & active role state
│   ├── types/index.ts          # Shared TypeScript interfaces
│   ├── App.tsx                 # Main application controller
│   └── main.tsx                # Client entry point
```

---

## 4. Default Seed Personas (Password: `Password@123`)

| Role | Name | Phone / Identifier | Access Level |
| :--- | :--- | :--- | :--- |
| **Passenger** | Hajiya Fatima Aliyu | `+2348037770007` | Book rides, view OTP, history, SOS alert |
| **Driver** | Aminu Garba Shinkafi | `+2348034440004` | Online toggle, accept rides, verify OTP, earnings |
| **Operator** | Alhaji Bashir Dan-Alhaji | `+2348033330003` | Dan-Alhaji Trans-Zamfara Fleet, assign vehicles |
| **Administrator** | Mallam Usman Shinkafi | `+2348031110001` | Full oversight, user suspension, driver vetting |
| **Security Officer** | Insp. Lawal Zamfara (Rtd.) | `+2348032220002` | Incident triage, SOS alarms, police escalation |

*Use the **Demo User** dropdown in the navigation bar to switch between personas instantly.*

---

## 5. Security & Invariant Guarantees

1. **Server-Side Pricing**: The client cannot alter fare totals; fares are re-calculated on the backend from landmark coordinates and stored fare rules.
2. **Trip Verification OTP**: Drivers cannot transition a ride from `driver_arrived` to `in_progress` without providing the exact 4-digit code generated on the passenger's screen.
3. **Concurrent Ride Lock**: Two drivers attempting to accept the same trip simultaneously are serialized; only the first succeeds while the second receives an idempotent conflict error.
4. **Data Isolation**: Transport operators can only inspect and manage vehicles registered under their own organization identifier.
5. **Audited Actions**: User suspensions and driver vetting decisions mandate an audit reason that is recorded immutably in `audit_logs`.

---

## 6. Local Development & Deployment

### Run Locally:
```bash
# Install dependencies
npm install

# Start the full-stack development server on port 3000
npm run dev
```

### Production Build:
```bash
npm run build
npm start
```
