-- AlterTable: absolute slot timestamp for double-booking constraint
ALTER TABLE "appointments" ADD COLUMN "slot_time" TIMESTAMPTZ(6);

-- Backfill from date + start_time (interpret as UTC wall clock)
UPDATE "appointments"
SET "slot_time" = (
  ("appointment_date"::text || ' ' || "start_time" || ':00')::timestamp AT TIME ZONE 'UTC'
)
WHERE "slot_time" IS NULL;

ALTER TABLE "appointments" ALTER COLUMN "slot_time" SET NOT NULL;

CREATE INDEX "idx_appointments_doctor_slot_time" ON "appointments"("doctor_id", "slot_time");

-- Replace date+start partial unique with (doctor_id, slot_time)
DROP INDEX IF EXISTS "appointments_active_slot_unique";

CREATE UNIQUE INDEX "appointments_active_slot_unique"
  ON "appointments" ("doctor_id", "slot_time")
  WHERE "status" <> 'cancelled';
