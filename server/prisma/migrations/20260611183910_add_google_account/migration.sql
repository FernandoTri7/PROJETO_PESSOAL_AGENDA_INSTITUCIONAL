-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiry" DATETIME,
    "scope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_userId_key" ON "GoogleAccount"("userId");
