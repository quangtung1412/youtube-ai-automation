-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKey" TEXT,
    "rpm" INTEGER NOT NULL,
    "tpm" INTEGER NOT NULL,
    "rpd" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 999,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "currentMinuteRequests" INTEGER NOT NULL DEFAULT 0,
    "currentMinuteTokens" INTEGER NOT NULL DEFAULT 0,
    "currentDayRequests" INTEGER NOT NULL DEFAULT 0,
    "lastResetMinute" DATETIME,
    "lastResetDay" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIAPICall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT,
    "operation" TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationMs" INTEGER,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "promptPreview" TEXT,
    "responsePreview" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "estimatedCost" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIAPICall_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global_config',
    "defaultModelId" TEXT NOT NULL DEFAULT 'gemini-3.0-pro',
    "apiKey" TEXT,
    "minVideoDuration" INTEGER NOT NULL DEFAULT 600,
    "avgSceneDuration" INTEGER NOT NULL DEFAULT 8,
    "veo3Template" TEXT NOT NULL DEFAULT '[STYLE] of [CHARACTER] doing [ACTION], [BG], [LIGHTING]',
    "channelName" TEXT NOT NULL DEFAULT 'My Channel',
    "language" TEXT NOT NULL DEFAULT 'Vietnamese',
    "personaSettings" TEXT NOT NULL DEFAULT '{}',
    "outlinePrompt" TEXT NOT NULL DEFAULT '',
    "scriptsPrompt" TEXT NOT NULL DEFAULT '',
    "veo3Prompt" TEXT NOT NULL DEFAULT '',
    "characterPrompt" TEXT NOT NULL DEFAULT '',
    "backgroundPrompt" TEXT NOT NULL DEFAULT '',
    "itemsPrompt" TEXT NOT NULL DEFAULT '',
    "modelRotation" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemConfig" ("apiKey", "avgSceneDuration", "backgroundPrompt", "channelName", "characterPrompt", "createdAt", "defaultModelId", "id", "itemsPrompt", "language", "minVideoDuration", "outlinePrompt", "personaSettings", "scriptsPrompt", "updatedAt", "veo3Prompt", "veo3Template") SELECT "apiKey", "avgSceneDuration", "backgroundPrompt", "channelName", "characterPrompt", "createdAt", "defaultModelId", "id", "itemsPrompt", "language", "minVideoDuration", "outlinePrompt", "personaSettings", "scriptsPrompt", "updatedAt", "veo3Prompt", "veo3Template" FROM "SystemConfig";
DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_modelId_key" ON "AIModel"("modelId");

-- CreateIndex
CREATE INDEX "AIModel_priority_enabled_idx" ON "AIModel"("priority", "enabled");

-- CreateIndex
CREATE INDEX "AIAPICall_modelId_startedAt_idx" ON "AIAPICall"("modelId", "startedAt");

-- CreateIndex
CREATE INDEX "AIAPICall_operation_startedAt_idx" ON "AIAPICall"("operation", "startedAt");

-- CreateIndex
CREATE INDEX "AIAPICall_projectId_startedAt_idx" ON "AIAPICall"("projectId", "startedAt");

-- CreateIndex
CREATE INDEX "AIAPICall_status_startedAt_idx" ON "AIAPICall"("status", "startedAt");
