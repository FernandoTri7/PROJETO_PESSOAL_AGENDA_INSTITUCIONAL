-- Fase 3 da identidade central: remove a coluna legada User.role.
-- O papel agora vive em Membership.role (por projeto). Demais colunas preservadas.
-- SQLite não suporta DROP COLUMN com FKs/índices: recria a tabela (padrão RedefineTables do Prisma).
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("active", "createdAt", "email", "id", "kind", "name", "passwordHash", "prefs") SELECT "active", "createdAt", "email", "id", "kind", "name", "passwordHash", "prefs" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
