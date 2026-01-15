/*
  Warnings:

  - You are about to drop the column `amountDue` on the `project_payments` table. All the data in the column will be lost.
  - You are about to drop the column `amountPaid` on the `project_payments` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `project_payments` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `project_payments` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `project_payments` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `project_payments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "project_payments" DROP COLUMN "amountDue",
DROP COLUMN "amountPaid",
DROP COLUMN "dueDate",
DROP COLUMN "invoiceNumber",
DROP COLUMN "remarks",
DROP COLUMN "status",
ADD COLUMN     "pendingPayment" DECIMAL(10,2),
ADD COLUMN     "receivedPayment" DECIMAL(10,2),
ADD COLUMN     "totalContractValue" DECIMAL(10,2);
