-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "inputContent" TEXT NOT NULL,
    "videoRatio" TEXT NOT NULL DEFAULT '16:9',
    "styleStorytelling" TEXT NOT NULL DEFAULT '',
    "mainCharacterDesc" TEXT NOT NULL DEFAULT '',
    "visualStyle" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "outlineData" TEXT NOT NULL DEFAULT '{}',
    "fullScript" TEXT NOT NULL DEFAULT '[]',
    "characterVisual" TEXT NOT NULL DEFAULT '',
    "characterVisualVi" TEXT NOT NULL DEFAULT '',
    "backgroundVisual" TEXT NOT NULL DEFAULT '',
    "backgroundVisualVi" TEXT NOT NULL DEFAULT '',
    "visualStyleGuide" TEXT NOT NULL DEFAULT '{}',
    "channelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("backgroundVisual", "backgroundVisualVi", "channelId", "characterVisual", "characterVisualVi", "createdAt", "fullScript", "id", "inputContent", "mainCharacterDesc", "outlineData", "status", "styleStorytelling", "title", "updatedAt", "videoRatio", "visualStyleGuide") SELECT "backgroundVisual", "backgroundVisualVi", "channelId", "characterVisual", "characterVisualVi", "createdAt", "fullScript", "id", "inputContent", "mainCharacterDesc", "outlineData", "status", "styleStorytelling", "title", "updatedAt", "videoRatio", "visualStyleGuide" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_channelId_idx" ON "Project"("channelId");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE TABLE "new_Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "voiceover" TEXT NOT NULL,
    "voiceover_vi" TEXT NOT NULL DEFAULT '',
    "visualDesc" TEXT NOT NULL,
    "visualDesc_vi" TEXT NOT NULL DEFAULT '',
    "veo3Prompt" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scene_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Scene" ("chapterId", "createdAt", "durationSeconds", "id", "sceneNumber", "updatedAt", "veo3Prompt", "visualDesc", "voiceover") SELECT "chapterId", "createdAt", "durationSeconds", "id", "sceneNumber", "updatedAt", "veo3Prompt", "visualDesc", "voiceover" FROM "Scene";
DROP TABLE "Scene";
ALTER TABLE "new_Scene" RENAME TO "Scene";
CREATE INDEX "Scene_chapterId_idx" ON "Scene"("chapterId");
CREATE UNIQUE INDEX "Scene_chapterId_sceneNumber_key" ON "Scene"("chapterId", "sceneNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
