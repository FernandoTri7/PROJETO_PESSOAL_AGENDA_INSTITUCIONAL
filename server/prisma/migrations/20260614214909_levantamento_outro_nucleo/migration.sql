-- AlterTable
ALTER TABLE "Levantamento" ADD COLUMN "assistenteGrau" TEXT;
ALTER TABLE "Levantamento" ADD COLUMN "assistenteNome" TEXT;
ALTER TABLE "Levantamento" ADD COLUMN "assistenteNucleo" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LevantamentoAuxiliar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "levantamentoId" TEXT NOT NULL,
    "associadoId" TEXT,
    "nome" TEXT,
    "grau" TEXT,
    "nucleo" TEXT,
    CONSTRAINT "LevantamentoAuxiliar_levantamentoId_fkey" FOREIGN KEY ("levantamentoId") REFERENCES "Levantamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LevantamentoAuxiliar_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "Associado" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LevantamentoAuxiliar" ("associadoId", "id", "levantamentoId") SELECT "associadoId", "id", "levantamentoId" FROM "LevantamentoAuxiliar";
DROP TABLE "LevantamentoAuxiliar";
ALTER TABLE "new_LevantamentoAuxiliar" RENAME TO "LevantamentoAuxiliar";
CREATE INDEX "LevantamentoAuxiliar_levantamentoId_idx" ON "LevantamentoAuxiliar"("levantamentoId");
CREATE UNIQUE INDEX "LevantamentoAuxiliar_levantamentoId_associadoId_key" ON "LevantamentoAuxiliar"("levantamentoId", "associadoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
