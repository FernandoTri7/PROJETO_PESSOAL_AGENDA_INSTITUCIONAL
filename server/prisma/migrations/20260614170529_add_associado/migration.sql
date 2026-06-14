-- CreateTable
CREATE TABLE "Associado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "grau" TEXT,
    "diaNasc" INTEGER,
    "mesNasc" INTEGER,
    "nascimento" DATETIME,
    "cpf" TEXT,
    "status" TEXT,
    "celular" TEXT,
    "residencial" TEXT,
    "email" TEXT,
    "emailAlt" TEXT,
    "endResidencial" TEXT,
    "endComercial" TEXT,
    "endOutro" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Associado_cpf_key" ON "Associado"("cpf");

-- CreateIndex
CREATE INDEX "Associado_nome_idx" ON "Associado"("nome");

-- CreateIndex
CREATE INDEX "Associado_status_idx" ON "Associado"("status");
