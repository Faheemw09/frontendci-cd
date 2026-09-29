-- Applied after Prisma migrate for constraints Prisma cannot express.

-- Platform users (super_admin, patient): email unique when clinic_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS users_platform_email_unique
  ON users (email)
  WHERE clinic_id IS NULL;

-- Active appointment slots unique by absolute slot_time; cancelled slots may be rebooked
DROP INDEX IF EXISTS appointments_active_slot_unique;
CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_unique
  ON appointments (doctor_id, slot_time)
  WHERE status <> 'cancelled';
