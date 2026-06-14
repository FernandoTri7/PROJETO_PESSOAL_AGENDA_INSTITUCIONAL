-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "activated" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TaskGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "calendarId", "createdAt", "description", "done", "dueDate", "groupId", "id", "priority", "title", "userId") SELECT "assigneeId", "calendarId", "createdAt", "description", "done", "dueDate", "groupId", "id", "priority", "title", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_calendarId_done_idx" ON "Task"("calendarId", "done");
CREATE INDEX "Task_groupId_idx" ON "Task"("groupId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
