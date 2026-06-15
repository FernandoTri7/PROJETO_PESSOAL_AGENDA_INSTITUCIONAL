-- CreateTable
CREATE TABLE "SessionParticipation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "associadoId" TEXT,
    "nomeTexto" TEXT,
    "grau" TEXT,
    "nucleo" TEXT,
    "funcao" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    CONSTRAINT "SessionParticipation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionParticipation_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "Associado" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SessionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ESCALA',
    "title" TEXT,
    "dirigente" TEXT,
    "assistente" TEXT,
    "auxAssistente" TEXT,
    "som" TEXT,
    "leituraDocumentos" TEXT,
    "explanacao" TEXT,
    "vegetalDescricao" TEXT,
    "coadoLitros" REAL,
    "comungadoLitros" REAL,
    "retornoLitros" REAL,
    "coposSimples" INTEGER,
    "coposDuplos" INTEGER,
    "coposCriancas" INTEGER,
    "repeticoes" INTEGER,
    "transmissaoAssistencia" BOOLEAN NOT NULL DEFAULT false,
    "dirigidaPorAutoridade" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SessionRecord_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionRecord_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SessionRecord" ("assistente", "auxAssistente", "calendarId", "coadoLitros", "comungadoLitros", "coposCriancas", "coposDuplos", "coposSimples", "createdAt", "creatorId", "date", "dirigente", "explanacao", "id", "leituraDocumentos", "observacoes", "repeticoes", "retornoLitros", "som", "title", "type", "updatedAt", "vegetalDescricao") SELECT "assistente", "auxAssistente", "calendarId", "coadoLitros", "comungadoLitros", "coposCriancas", "coposDuplos", "coposSimples", "createdAt", "creatorId", "date", "dirigente", "explanacao", "id", "leituraDocumentos", "observacoes", "repeticoes", "retornoLitros", "som", "title", "type", "updatedAt", "vegetalDescricao" FROM "SessionRecord";
DROP TABLE "SessionRecord";
ALTER TABLE "new_SessionRecord" RENAME TO "SessionRecord";
CREATE INDEX "SessionRecord_calendarId_date_idx" ON "SessionRecord"("calendarId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SessionParticipation_funcao_data_idx" ON "SessionParticipation"("funcao", "data");

-- CreateIndex
CREATE INDEX "SessionParticipation_associadoId_funcao_idx" ON "SessionParticipation"("associadoId", "funcao");

-- CreateIndex
CREATE INDEX "SessionParticipation_sessionId_idx" ON "SessionParticipation"("sessionId");
