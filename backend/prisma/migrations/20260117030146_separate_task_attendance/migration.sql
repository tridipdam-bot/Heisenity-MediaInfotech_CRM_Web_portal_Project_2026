/*
  Warnings:

  - You are about to drop the column `taskEndTime` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `taskId` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `taskLocation` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `taskStartTime` on the `attendances` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_taskId_fkey";

-- DropIndex
DROP INDEX "attendances_taskId_idx";

-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "taskEndTime",
DROP COLUMN "taskId",
DROP COLUMN "taskLocation",
DROP COLUMN "taskStartTime";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "checkIn" TIMESTAMP(3),
ADD COLUMN     "checkOut" TIMESTAMP(3);
