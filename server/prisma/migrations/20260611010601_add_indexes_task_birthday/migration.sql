-- CreateIndex
CREATE INDEX "Birthday_calendarId_idx" ON "Birthday"("calendarId");

-- CreateIndex
CREATE INDEX "Task_calendarId_done_idx" ON "Task"("calendarId", "done");
