# Clinicy frontend

## Run

```bash
# terminal 1 — API (+ Postgres)
cd backend && docker compose up -d && npm run dev

# terminal 2 — UI
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 — **patient clinic directory** (default home).

Staff dashboards: `/login` → `/admin`, `/doctor`, `/super`.

## Patient site

| Route | Purpose |
|-------|---------|
| `/` | Clinic directory |
| `/clinics/:slug` | Profile (doctors, specialties, map) |
| `/clinics/:slug/book` | Booking flow |
| `/account/login` · `/account/register` | Patient auth |
| `/account/appointments` | History, cancel, reschedule |
| `/account/tickets` | Raise / view tickets |
| `/account/profile` | Edit profile |

Seed patient: `patient.one@clinicy.local` / `Password123!`

**SEO:** the Vite SPA is client-rendered. Indexable HTML for crawlers is on the API at `/public/clinics` (see `docs/PUBLIC_SEO.md`). Vite proxies `/api` and `/public` to `:4000`.

## Super admin dashboard

Route: `/super`

Seed login: `admin@clinicy.local` / `ChangeMe123!` (from backend `.env`)

- Overview stats (clinics, bookings this month, active vs suspended, SLA)
- Clinics list: plan + approve/suspend
- All tickets across clinics with SLA flags
- Platform issue log (non-clinic problems)

## Doctor dashboard

Mobile-first UI at `/doctor`.

Seed login: `dr.raza@kashmir-care.local` / `Password123!` / slug `kashmir-care`

- Today + upcoming schedule  
- Tap appointment → read-only patient phone/email + mark completed / no-show  
- Hours tab: edit own availability (API enforces clinic opening-hour bounds)  

## Clinic admin tabs

1. Overview — today’s appointments + quick stats + open tickets  
2. Doctors — add doctors, fees, weekday hours  
3. Appointments — list/calendar, search, walk-in, cancel (ticket offer), reschedule  
4. Staff — invite/deactivate receptionist (`staff`) accounts  
5. Tickets — clinic-scoped thread + resolve  
6. Settings — profile, logo stub, hours, holidays  

API base: `VITE_API_URL` (empty in dev = same-origin proxy to `:4000`)
