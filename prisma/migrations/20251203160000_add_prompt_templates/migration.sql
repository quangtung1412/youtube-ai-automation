-- AlterTable: Remove old defaultOutlinePrompt and add new prompt fields
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data from old table
INSERT INTO "new_SystemConfig" ("id", "defaultModelId", "apiKey", "minVideoDuration", "avgSceneDuration", "veo3Template", "channelName", "language", "personaSettings", "outlinePrompt", "createdAt", "updatedAt")
SELECT "id", "defaultModelId", "apiKey", "minVideoDuration", "avgSceneDuration", "veo3Template", "channelName", "language", "personaSettings", COALESCE("defaultOutlinePrompt", ''), "createdAt", "updatedAt"
FROM "SystemConfig";

DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";

PRAGMA foreign_keys=ON;
