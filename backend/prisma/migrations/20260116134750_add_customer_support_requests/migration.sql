-- CreateEnum
CREATE TYPE "CustomerSupportStatus" AS ENUM ('PENDING', 'ACCEPTED', 'TICKET_CREATED', 'CANCELLED');

-- CreateTable
CREATE TABLE "customer_support_requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "documents" TEXT,
    "status" "CustomerSupportStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedBy" TEXT,
    "ticketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_support_requests_ticketId_key" ON "customer_support_requests"("ticketId");

-- CreateIndex
CREATE INDEX "customer_support_requests_customerId_idx" ON "customer_support_requests"("customerId");

-- CreateIndex
CREATE INDEX "customer_support_requests_acceptedBy_idx" ON "customer_support_requests"("acceptedBy");

-- CreateIndex
CREATE INDEX "customer_support_requests_status_idx" ON "customer_support_requests"("status");

-- AddForeignKey
ALTER TABLE "customer_support_requests" ADD CONSTRAINT "customer_support_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_support_requests" ADD CONSTRAINT "customer_support_requests_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_support_requests" ADD CONSTRAINT "customer_support_requests_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
