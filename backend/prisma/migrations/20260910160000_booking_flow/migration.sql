-- Appointment states → booked | completed | cancelled | no_show
-- Drop partial unique first: it compares status to 'cancelled' and breaks enum swap
DROP INDEX IF EXISTS "appointments_active_slot_unique";

CREATE TYPE "AppointmentStatus_new" AS ENUM ('booked', 'completed', 'cancelled', 'no_show');

ALTER TABLE "appointments" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "appointments"
  ALTER COLUMN "status" TYPE "AppointmentStatus_new"
  USING (
    CASE
      WHEN "status"::text IN ('pending', 'confirmed') THEN 'booked'::"AppointmentStatus_new"
      WHEN "status"::text = 'completed' THEN 'completed'::"AppointmentStatus_new"
      WHEN "status"::text = 'cancelled' THEN 'cancelled'::"AppointmentStatus_new"
      WHEN "status"::text = 'no_show' THEN 'no_show'::"AppointmentStatus_new"
      ELSE 'booked'::"AppointmentStatus_new"
    END
  );

DROP TYPE "AppointmentStatus";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";

ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'booked'::"AppointmentStatus";

CREATE UNIQUE INDEX "appointments_active_slot_unique"
  ON "appointments" ("doctor_id", "slot_time")
  WHERE "status" <> 'cancelled';

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancelled_by_role" VARCHAR(30);

-- Link support tickets to appointments (clinic-cancel flow)
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "appointment_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_appointment_id_fkey'
  ) THEN
    ALTER TABLE "support_tickets"
      ADD CONSTRAINT "support_tickets_appointment_id_fkey"
      FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_support_tickets_appointment_id" ON "support_tickets"("appointment_id");
