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
    "personaSettings" TEXT NOT NULL DEFAULT '{}',
    "defaultOutlinePrompt" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemConfig" ("apiKey", "avgSceneDuration", "createdAt", "defaultModelId", "id", "minVideoDuration", "updatedAt", "veo3Template") SELECT "apiKey", "avgSceneDuration", "createdAt", "defaultModelId", "id", "minVideoDuration", "updatedAt", "veo3Template" FROM "SystemConfig";
DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
