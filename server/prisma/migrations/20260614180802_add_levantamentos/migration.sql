-- CreateTable
CREATE TABLE "Levantamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "assistenteId" TEXT,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Levantamento_assistenteId_fkey" FOREIGN KEY ("assistenteId") REFERENCES "Associado" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LevantamentoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "levantamentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "origem" TEXT,
    "litros" REAL NOT NULL,
    "local" TEXT NOT NULL DEFAULT 'FORA',
    "notas" TEXT,
    CONSTRAINT "LevantamentoItem_levantamentoId_fkey" FOREIGN KEY ("levantamentoId") REFERENCES "Levantamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LevantamentoAuxiliar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "levantamentoId" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    CONSTRAINT "LevantamentoAuxiliar_levantamentoId_fkey" FOREIGN KEY ("levantamentoId") REFERENCES "Levantamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LevantamentoAuxiliar_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "Associado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Levantamento_data_idx" ON "Levantamento"("data");

-- CreateIndex
CREATE INDEX "LevantamentoItem_levantamentoId_idx" ON "LevantamentoItem"("levantamentoId");

-- CreateIndex
CREATE INDEX "LevantamentoAuxiliar_levantamentoId_idx" ON "LevantamentoAuxiliar"("levantamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "LevantamentoAuxiliar_levantamentoId_associadoId_key" ON "LevantamentoAuxiliar"("levantamentoId", "associadoId");
