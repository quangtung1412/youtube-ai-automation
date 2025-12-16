/*
  Warnings:

  - You are about to drop the column `scriptData` on the `Chapter` table. All the data in the column will be lost.
  - You are about to drop the column `veo3Assets` on the `Project` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "voiceover" TEXT NOT NULL,
    "visualDesc" TEXT NOT NULL,
    "veo3Prompt" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scene_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "visualDesc" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL DEFAULT '',
    "contentSummary" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("chapterNumber", "contentSummary", "createdAt", "durationSeconds", "id", "projectId", "title", "updatedAt") SELECT "chapterNumber", "contentSummary", "createdAt", "durationSeconds", "id", "projectId", "title", "updatedAt" FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";
CREATE INDEX "Chapter_projectId_idx" ON "Chapter"("projectId");
CREATE UNIQUE INDEX "Chapter_projectId_chapterNumber_key" ON "Chapter"("projectId", "chapterNumber");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "inputContent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "outlineData" TEXT NOT NULL DEFAULT '{}',
    "fullScript" TEXT NOT NULL DEFAULT '[]',
    "characterVisual" TEXT NOT NULL DEFAULT '',
    "backgroundVisual" TEXT NOT NULL DEFAULT '',
    "visualStyleGuide" TEXT NOT NULL DEFAULT '{}',
    "channelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("channelId", "createdAt", "fullScript", "id", "inputContent", "outlineData", "status", "title", "updatedAt") SELECT "channelId", "createdAt", "fullScript", "id", "inputContent", "outlineData", "status", "title", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_channelId_idx" ON "Project"("channelId");
CREATE INDEX "Project_status_idx" ON "Project"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Scene_chapterId_idx" ON "Scene"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_chapterId_sceneNumber_key" ON "Scene"("chapterId", "sceneNumber");

-- CreateIndex
CREATE INDEX "ProjectItem_projectId_idx" ON "ProjectItem"("projectId");
