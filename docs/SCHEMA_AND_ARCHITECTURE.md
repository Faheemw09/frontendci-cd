# Clinicy — Locked Schema & Architecture (MVP)

## Locked decisions

1. **Appointments**: partial unique on `(doctor_id, appointment_date, start_time)` where status ≠ `cancelled` (see `prisma/extras.sql`) so cancelled slots can be rebooked.
2. **Patients**: **global platform identity** — no `clinic_id` on `patients`; 1:1 with `users` (`role=patient`, `clinic_id` NULL). Cross-clinic history via `appointments.patient_id`.
3. **Support tickets**: MVP single `description`; `ticket_messages` deferred to v2.
4. **Clinics**: soft lifecycle via `status` (`pending` / `active` / `suspended`); hard delete is rare admin wipe (CASCADE).

Prisma source of truth: `backend/prisma/schema.prisma`

---

## Entity relationship

```
User (platform: super_admin | patient → clinic_id NULL)
 └── Patient (global, user_id unique) ──┬── Appointment (clinic_id) ── Clinic
                                        └── SupportTicket (clinic_id) ── Clinic

Clinic (tenant)
 ├── User (clinic_admin | staff | doctor)
 ├── Doctor → DoctorAvailability, DoctorLeave
 ├── Appointment
 ├── SupportTicket
 └── NotificationLog
```

Slots are **derived**: availability − leave − non-cancelled appointments.

---

## Cascading

| Table | `clinic_id` | ON DELETE clinic | Notes |
|-------|-------------|------------------|--------|
| `users` | nullable | CASCADE | NULL for `super_admin` & `patient` |
| `doctors` | required | CASCADE | `user_id` RESTRICT |
| `doctor_availability` | required | CASCADE | |
| `doctor_leave` | required | CASCADE | |
| `patients` | **none** | — | Global; CASCADE from `users` |
| `appointments` | required | CASCADE | doctor/patient RESTRICT |
| `support_tickets` | required | CASCADE | `patient_id` optional FK |
| `notifications_log` | nullable | CASCADE | |

---

## Tenant-scoped models (Prisma injection allowlist)

`User`, `Doctor`, `DoctorAvailability`, `DoctorLeave`, `Appointment`, `SupportTicket`, `NotificationLog`

**Not** clinic-scoped: `Clinic`, `Patient`

---

## Folder structure

See repo under `backend/src` and `frontend/src/pages/{role}`.

---

## RBAC + query-layer isolation

- JWT: `{ sub, role, clinicId }` — `clinicId` null for `super_admin` / `patient`
- Stack: `authenticate` → `authorize(...roles)` → `tenantScope` (clinic roles only)
- Clinic roles use scoped Prisma (inject `clinicId`); never trust client `clinicId`
- Patients: unscoped for own profile; appointments/tickets filtered by `patientId === req.user.patientProfile.id`
- Clinic staff listing “patients at this clinic”: patients who have appointments (or tickets) with that `clinicId`
