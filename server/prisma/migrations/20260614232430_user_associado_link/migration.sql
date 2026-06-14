-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'FUNCIONARIO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "prefs" TEXT,
    "associadoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "Associado" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "createdAt", "email", "id", "kind", "name", "passwordHash", "prefs") SELECT "active", "createdAt", "email", "id", "kind", "name", "passwordHash", "prefs" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_associadoId_key" ON "User"("associadoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
