-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- AlterTable
-- Cast the existing text values into the new enum in place, instead of
-- dropping and recreating the column - the auto-generated diff for this
-- change does a DROP COLUMN + ADD COLUMN, which would silently wipe every
-- row back to the default ('open'), destroying real resolved/dismissed
-- status data already in production.
ALTER TABLE "findings"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "FindingStatus" USING ("status"::"FindingStatus"),
  ALTER COLUMN "status" SET DEFAULT 'open';
