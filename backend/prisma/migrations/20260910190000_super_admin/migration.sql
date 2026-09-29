CREATE TYPE "ClinicPlan" AS ENUM ('free', 'basic', 'pro');
ALTER TABLE "clinics" ADD COLUMN "plan" "ClinicPlan" NOT NULL DEFAULT 'basic';

CREATE TYPE "PlatformIssueStatus" AS ENUM ('open', 'investigating', 'resolved', 'closed');
CREATE TYPE "PlatformIssueSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE "platform_issues" (
  "id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "category" VARCHAR(100) NOT NULL DEFAULT 'general',
  "severity" "PlatformIssueSeverity" NOT NULL DEFAULT 'medium',
  "status" "PlatformIssueStatus" NOT NULL DEFAULT 'open',
  "created_by" UUID NOT NULL,
  "resolved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "platform_issues_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "platform_issues"
  ADD CONSTRAINT "platform_issues_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "idx_platform_issues_status_created" ON "platform_issues"("status", "created_at");
CREATE INDEX "idx_platform_issues_severity" ON "platform_issues"("severity");
