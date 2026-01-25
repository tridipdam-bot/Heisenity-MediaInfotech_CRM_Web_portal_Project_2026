-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('INTERNAL', 'CLIENT', 'VENDOR', 'TRAINING', 'REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "MeetingPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('INVITED', 'CONFIRMED', 'DECLINED', 'TENTATIVE', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "AttendeeResponse" AS ENUM ('ACCEPTED', 'DECLINED', 'TENTATIVE');

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meetingType" "MeetingType" NOT NULL DEFAULT 'INTERNAL',
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "priority" "MeetingPriority" NOT NULL DEFAULT 'MEDIUM',
    "organizerId" TEXT NOT NULL,
    "customerId" TEXT,
    "meetingLink" TEXT,
    "agenda" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attendees" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "AttendeeStatus" NOT NULL DEFAULT 'INVITED',
    "response" "AttendeeResponse",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_tasks" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meetings_organizerId_idx" ON "meetings"("organizerId");

-- CreateIndex
CREATE INDEX "meetings_customerId_idx" ON "meetings"("customerId");

-- CreateIndex
CREATE INDEX "meetings_startTime_idx" ON "meetings"("startTime");

-- CreateIndex
CREATE INDEX "meetings_status_idx" ON "meetings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendees_meetingId_employeeId_key" ON "meeting_attendees"("meetingId", "employeeId");

-- CreateIndex
CREATE INDEX "meeting_attendees_meetingId_idx" ON "meeting_attendees"("meetingId");

-- CreateIndex
CREATE INDEX "meeting_attendees_employeeId_idx" ON "meeting_attendees"("employeeId");

-- CreateIndex
CREATE INDEX "meeting_tasks_meetingId_idx" ON "meeting_tasks"("meetingId");

-- CreateIndex
CREATE INDEX "meeting_tasks_assigneeId_idx" ON "meeting_tasks"("assigneeId");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_tasks" ADD CONSTRAINT "meeting_tasks_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_tasks" ADD CONSTRAINT "meeting_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;