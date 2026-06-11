/*
  Warnings:

  - The required column `token` was added to the `EventGuest` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventGuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventGuest" ("createdAt", "email", "eventId", "id", "name", "status") SELECT "createdAt", "email", "eventId", "id", "name", "status" FROM "EventGuest";
DROP TABLE "EventGuest";
ALTER TABLE "new_EventGuest" RENAME TO "EventGuest";
CREATE UNIQUE INDEX "EventGuest_token_key" ON "EventGuest"("token");
CREATE INDEX "EventGuest_eventId_idx" ON "EventGuest"("eventId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
