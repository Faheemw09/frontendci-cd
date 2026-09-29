# Clinicy MVP Scope — Locked

**Audience:** first 5–10 private clinics (Kashmir)  
**Status:** LOCKED — confirmed by product owner (2026-09-10)  
**Schema:** `backend/prisma/schema.prisma`  
**Out of product until later:** Phase 2 / Phase 3 items below

---

## In scope (build now)

### Platform & tenancy
- Multi-tenant clinics; isolation via `clinic_id` at the query layer
- Roles: `super_admin`, `clinic_admin`, `staff`, `doctor`, `patient`
- Patients are a **global** identity (no `clinic_id` on `patients`); cross-clinic history via `appointments`
- JWT + Passport auth; S3-compatible storage for clinic logos / doctor photos (basic)

### Doctor scheduling
- Weekly `doctor_availability` windows
- `doctor_leave` date ranges
- Per-doctor `slot_duration_minutes`
- Slots **derived** (not stored): availability − leave − non-cancelled appointments

### Slot booking
- Patient or staff books a free slot
- Appointment statuses: `pending` → `confirmed` → `completed` / `cancelled` / `no_show`
- Cancelled slots can be rebooked (partial unique index)

### Clinic admin dashboard
- Manage doctors and staff users for the clinic
- Availability overview; today’s / upcoming appointments
- Clinic settings: name, logo, contact, status (soft suspend via platform)

### Doctor dashboard
- Own schedule only
- Set / clear leave
- Today’s patients; update appointment status

### Patient
- Register / login (platform account)
- Browse clinic / doctor, book slot, view own history (all clinics), cancel own booking

### Staff (limited permissions)
**Can:** book/manage appointments; look up/create patient links for booking; handle support tickets for their clinic  
**Cannot:** clinic settings, create/edit doctors or change roles, platform admin, billing

### Support ticketing
- Create / assign / resolve tickets
- Single `description` field (no reply thread in MVP)

### Reminders (WhatsApp / SMS)
- Reminder job + write to `notifications_log`
- Provider call **stubbed** (log payload, mark `sent` / `failed`)
- Real Twilio/Meta/etc. wiring → later

---

## Explicitly deferred

### Phase 2
- Token / walk-in queue mode
- Custom domains per clinic
- Payments / invoicing
- Reviews / ratings
- Multi-language UI (Kashmiri / Urdu / English)

### Phase 3
- Analytics dashboards
- Referral program

### Also not in MVP (unless reopened)
- Ticket message threads
- Live email/SMS/WhatsApp provider
- Pharmacy / inventory, EMR / prescriptions
- Public marketing site builder

---

## Success bar
A clinic can go live with doctors + weekly hours, patients booking slots, staff/admin running the day, doctors seeing their list, and appointment reminders recorded via the stub provider.

---

## Build order (after final go-ahead)
1. ~~Clinic staff/doctor user CRUD + availability/leave~~ ✅  
2. ~~Slot generation + appointment booking APIs~~ ✅  
3. ~~Booking flow (confirm, cancel cutoff, walk-in, tickets)~~ ✅  
4. ~~Support tickets (categories, threads, SLA)~~ ✅  
5. ~~Clinic Admin dashboard (React)~~ ✅  
6. ~~Doctor dashboard~~ ✅  
7. ~~Super Admin dashboard~~ ✅  
8. Patient booking UI  
9. Reminder stub worker  
10. S3 logo/photo upload (real)  

---

*To reopen scope, edit this file and call out the change explicitly before implementation.*
