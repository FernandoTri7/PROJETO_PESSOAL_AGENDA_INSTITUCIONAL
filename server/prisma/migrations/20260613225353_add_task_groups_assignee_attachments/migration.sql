-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskGroup_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'link',
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TaskGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("calendarId", "createdAt", "description", "done", "dueDate", "id", "priority", "title", "userId") SELECT "calendarId", "createdAt", "description", "done", "dueDate", "id", "priority", "title", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_calendarId_done_idx" ON "Task"("calendarId", "done");
CREATE INDEX "Task_groupId_idx" ON "Task"("groupId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TaskGroup_calendarId_idx" ON "TaskGroup"("calendarId");

-- CreateIndex
CREATE INDEX "TaskAttachment_taskId_idx" ON "TaskAttachment"("taskId");
