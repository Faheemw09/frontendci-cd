# Clinicy backend

## Quick start

```bash
# 1. Postgres (requires Docker)
docker compose up -d

# 2. Env
cp .env.example .env

# 3. Migrate + seed
npm install
npm run db:setup

# 4. API
npm run dev
```

## What this prompt delivers

1. **Prisma schema + migration** — all MVP tables including `support_tickets` (`prisma/schema.prisma`, `prisma/migrations/…_init`)
2. **JWT + Passport** — all 5 roles (`super_admin`, `clinic_admin`, `staff`, `doctor`, `patient`)
3. **Tenant RBAC** — `clinicScoped()` / `platformScoped()` + `createTenantPrisma()` forces `clinic_id` on every clinic-level query
4. **Clinic signup** — `POST /api/auth/clinic-signup` creates clinic + first `clinic_admin`, slug from name
5. **Seed** — 2 clinics, doctors, staff, global patients, sample ticket

## Auth

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/login` | `{ email, password, clinicSlug?, clinicId?, role? }` |
| POST | `/api/auth/register/patient` | Global patient |
| POST | `/api/auth/clinic-signup` | Clinic + admin + JWT |
| GET | `/api/auth/me` | Any authenticated role |

### Seed logins (password `Password123!` unless noted)

| Role | Email | clinicSlug |
|------|-------|------------|
| super_admin | `admin@clinicy.local` (from `.env`) | — |
| clinic_admin | `admin@kashmir-care.local` | `kashmir-care` |
| staff | `staff@kashmir-care.local` | `kashmir-care` |
| doctor | `dr.raza@kashmir-care.local` | `kashmir-care` |
| patient | `patient.one@clinicy.local` | — |
| clinic_admin | `admin@valley-health.local` | `valley-health` |

## Tenant isolation

```js
const { clinicScoped } = require('./middleware/rbac');
router.get('/', ...clinicScoped('clinic_admin', 'staff'), handler);
// handler uses req.db — clinicId is forced; req.prisma throws for clinic roles
```

Models auto-scoped: User, Doctor, DoctorAvailability, DoctorLeave, Appointment, SupportTicket, NotificationLog.  
**Not** scoped: Clinic, Patient (global identity).

## Scheduling & booking

### Patient funnel (`/api/booking`)
| Step | Method | Path |
|------|--------|------|
| 1. Clinics | GET | `/api/booking/clinics` |
| 2. Doctors | GET | `/api/booking/clinics/:slugOrId/doctors` |
| 3. Slots | GET | `/api/booking/doctors/:doctorId/slots?date=YYYY-MM-DD` |
| 4. Confirm | POST | `/api/booking/confirm` `{ doctorId, date, startTime }` → status `booked` + `sendNotification()` stub |

### Appointments
| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/appointments/confirm` | Same as booking confirm |
| POST | `/api/appointments/walk-in` | Staff/admin: `{ doctorId, date, startTime, patient: { fullName, phone } }` |
| GET | `/api/appointments` | List (role-filtered) |
| POST | `/api/appointments/:id/cancel` | Patient cutoff: `CANCELLATION_CUTOFF_HOURS` (default 2). Clinic cancel returns `offerSupportTicket` + `supportTicketPrompt` |
| PATCH | `/api/appointments/:id/status` | `completed` \| `no_show` \| `cancelled` |

### Support tickets
| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/support-tickets` | Patient/staff/super_admin. Fields: subject, description, category, linkedAppointmentId?, clinicId? |
| GET | `/api/support-tickets` | Scoped by role. Super admin: `?slaBreached=true` aging view (default SLA 48h) |
| GET | `/api/support-tickets/:id` | Includes threaded `messages` |
| PATCH | `/api/support-tickets/:id` | Staff/super_admin: status/assign — status change stubs patient notification |
| POST | `/api/support-tickets/:id/replies` | Threaded reply `{ body }` |

**Categories:** `slot_cancelled`, `no_show_dispute`, `refund_request`, `general_complaint`, `billing`, `other`  
**Statuses:** `open` / `in_progress` / `resolved` / `closed`  
**SLA:** `TICKET_SLA_HOURS` (default 48) → `slaBreached` flag on open/in_progress tickets

After pull: `npx prisma migrate deploy`

## Public SEO HTML (not the Vite SPA)

Vite SPA pages are client-rendered. For search engines, the API also serves HTML:

| Path | Notes |
|------|-------|
| `GET /public/clinics` | Directory |
| `GET /public/clinics/:slug` | Profile + map embed + JSON-LD |
| `GET /public/sitemap.xml` | Sitemap |
| `GET /public/robots.txt` | Robots |

See `docs/PUBLIC_SEO.md`. Env: `PUBLIC_SITE_URL`, `API_PUBLIC_URL`.

### Patient account API
| Method | Path | Notes |
|--------|------|--------|
| GET/PATCH | `/api/patient/me` | Profile |
| POST | `/api/appointments/:id/reschedule` | Patient allowed: `{ date, startTime }` |

