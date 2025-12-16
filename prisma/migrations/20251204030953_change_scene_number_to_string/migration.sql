-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "sceneNumber" TEXT NOT NULL,
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
INSERT INTO "new_Scene" ("chapterId", "createdAt", "durationSeconds", "id", "sceneNumber", "updatedAt", "veo3Prompt", "visualDesc", "visualDesc_vi", "voiceover", "voiceover_vi") SELECT "chapterId", "createdAt", "durationSeconds", "id", "sceneNumber", "updatedAt", "veo3Prompt", "visualDesc", "visualDesc_vi", "voiceover", "voiceover_vi" FROM "Scene";
DROP TABLE "Scene";
ALTER TABLE "new_Scene" RENAME TO "Scene";
CREATE INDEX "Scene_chapterId_idx" ON "Scene"("chapterId");
CREATE UNIQUE INDEX "Scene_chapterId_sceneNumber_key" ON "Scene"("chapterId", "sceneNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
