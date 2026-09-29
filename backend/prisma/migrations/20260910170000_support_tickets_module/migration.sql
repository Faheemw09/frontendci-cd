-- Ticket categories
CREATE TYPE "TicketCategory" AS ENUM (
  'slot_cancelled',
  'no_show_dispute',
  'refund_request',
  'general_complaint',
  'billing',
  'other'
);

-- Rename columns to match product field names
ALTER TABLE "support_tickets" RENAME COLUMN "appointment_id" TO "linked_appointment_id";
ALTER TABLE "support_tickets" RENAME COLUMN "created_by_user_id" TO "raised_by";
ALTER TABLE "support_tickets" RENAME COLUMN "assigned_to_user_id" TO "assigned_to";

-- Rename FK constraints if they exist (ignore errors via DROP IF EXISTS pattern)
ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_appointment_id_fkey";
ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_created_by_user_id_fkey";
ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_assigned_to_user_id_fkey";

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_linked_appointment_id_fkey"
  FOREIGN KEY ("linked_appointment_id") REFERENCES "appointments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_raised_by_fkey"
  FOREIGN KEY ("raised_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_assigned_to_fkey"
  FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets" ADD COLUMN "category" "TicketCategory" NOT NULL DEFAULT 'general_complaint';

CREATE INDEX IF NOT EXISTS "idx_support_tickets_status_created" ON "support_tickets"("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_support_tickets_category" ON "support_tickets"("category");

-- Threaded replies
CREATE TABLE "ticket_messages" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ticket_messages"
  ADD CONSTRAINT "ticket_messages_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ticket_messages"
  ADD CONSTRAINT "ticket_messages_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "idx_ticket_messages_ticket_created" ON "ticket_messages"("ticket_id", "created_at");
