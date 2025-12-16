-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global_config',
    "defaultModelId" TEXT NOT NULL DEFAULT 'gemini-3.0-pro',
    "apiKey" TEXT,
    "minVideoDuration" INTEGER NOT NULL DEFAULT 600,
    "avgSceneDuration" INTEGER NOT NULL DEFAULT 8,
    "speechRate" REAL NOT NULL DEFAULT 2.5,
    "maxWordsPerScene" INTEGER NOT NULL DEFAULT 20,
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
INSERT INTO "new_SystemConfig" ("apiKey", "avgSceneDuration", "backgroundPrompt", "channelName", "characterPrompt", "createdAt", "defaultModelId", "id", "itemsPrompt", "language", "minVideoDuration", "modelRotation", "outlinePrompt", "personaSettings", "scriptsPrompt", "updatedAt", "veo3Prompt", "veo3Template") SELECT "apiKey", "avgSceneDuration", "backgroundPrompt", "channelName", "characterPrompt", "createdAt", "defaultModelId", "id", "itemsPrompt", "language", "minVideoDuration", "modelRotation", "outlinePrompt", "personaSettings", "scriptsPrompt", "updatedAt", "veo3Prompt", "veo3Template" FROM "SystemConfig";
DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
