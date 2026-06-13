-- CreateTable
CREATE TABLE "EventCalendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    CONSTRAINT "EventCalendar_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventCalendar_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EventCalendar_calendarId_idx" ON "EventCalendar"("calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCalendar_eventId_calendarId_key" ON "EventCalendar"("eventId", "calendarId");
