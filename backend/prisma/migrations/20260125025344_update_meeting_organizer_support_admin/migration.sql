/*
  Warnings:

  - You are about to drop the column `organizerId` on the `meetings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_organizerId_fkey";

-- DropIndex
DROP INDEX "meetings_organizerId_idx";

-- AlterTable
ALTER TABLE "meetings" DROP COLUMN "organizerId",
ADD COLUMN     "organizerAdminId" TEXT,
ADD COLUMN     "organizerEmployeeId" TEXT;

-- CreateIndex
CREATE INDEX "meetings_organizerAdminId_idx" ON "meetings"("organizerAdminId");

-- CreateIndex
CREATE INDEX "meetings_organizerEmployeeId_idx" ON "meetings"("organizerEmployeeId");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organizerAdminId_fkey" FOREIGN KEY ("organizerAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organizerEmployeeId_fkey" FOREIGN KEY ("organizerEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
