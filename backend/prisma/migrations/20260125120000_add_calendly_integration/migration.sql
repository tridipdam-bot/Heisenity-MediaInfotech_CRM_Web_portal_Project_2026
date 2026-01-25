-- CreateTable
CREATE TABLE "calendly_meetings" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "calendlyEventUuid" TEXT NOT NULL,
    "calendlyInviteeUuid" TEXT NOT NULL,
    "inviteeName" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "inviteePhone" TEXT,
    "eventName" TEXT NOT NULL,
    "eventDuration" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "calendlyEventUrl" TEXT,
    "rescheduleUrl" TEXT,
    "cancelUrl" TEXT,
    "calendlyData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendly_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendly_meetings_meetingId_key" ON "calendly_meetings"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "calendly_meetings_calendlyEventUuid_key" ON "calendly_meetings"("calendlyEventUuid");

-- CreateIndex
CREATE UNIQUE INDEX "calendly_meetings_calendlyInviteeUuid_key" ON "calendly_meetings"("calendlyInviteeUuid");

-- CreateIndex
CREATE INDEX "calendly_meetings_calendlyEventUuid_idx" ON "calendly_meetings"("calendlyEventUuid");

-- CreateIndex
CREATE INDEX "calendly_meetings_calendlyInviteeUuid_idx" ON "calendly_meetings"("calendlyInviteeUuid");

-- CreateIndex
CREATE INDEX "calendly_meetings_inviteeEmail_idx" ON "calendly_meetings"("inviteeEmail");

-- AddForeignKey
ALTER TABLE "calendly_meetings" ADD CONSTRAINT "calendly_meetings_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;