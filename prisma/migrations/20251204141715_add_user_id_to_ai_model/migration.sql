-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKey" TEXT,
    "rpm" INTEGER NOT NULL,
    "tpm" INTEGER NOT NULL,
    "rpd" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 999,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "currentMinuteRequests" INTEGER NOT NULL DEFAULT 0,
    "currentMinuteTokens" INTEGER NOT NULL DEFAULT 0,
    "currentDayRequests" INTEGER NOT NULL DEFAULT 0,
    "lastResetMinute" DATETIME,
    "lastResetDay" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AIModel" ("apiKey", "createdAt", "currentDayRequests", "currentMinuteRequests", "currentMinuteTokens", "displayName", "enabled", "id", "lastResetDay", "lastResetMinute", "modelId", "priority", "rpd", "rpm", "tpm", "updatedAt") SELECT "apiKey", "createdAt", "currentDayRequests", "currentMinuteRequests", "currentMinuteTokens", "displayName", "enabled", "id", "lastResetDay", "lastResetMinute", "modelId", "priority", "rpd", "rpm", "tpm", "updatedAt" FROM "AIModel";
DROP TABLE "AIModel";
ALTER TABLE "new_AIModel" RENAME TO "AIModel";
CREATE INDEX "AIModel_priority_enabled_idx" ON "AIModel"("priority", "enabled");
CREATE INDEX "AIModel_userId_idx" ON "AIModel"("userId");
CREATE UNIQUE INDEX "AIModel_modelId_userId_key" ON "AIModel"("modelId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
