-- CreateTable
CREATE TABLE "SessaoAnual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "dia" INTEGER,
    "mes" INTEGER,
    "tipo" TEXT NOT NULL DEFAULT 'COMEMORATIVA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SessaoAnual_tipo_idx" ON "SessaoAnual"("tipo");
