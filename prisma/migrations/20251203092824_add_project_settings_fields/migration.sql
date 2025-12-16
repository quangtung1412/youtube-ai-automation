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
INSERT INTO "new_Project" ("backgroundVisual", "channelId", "characterVisual", "createdAt", "fullScript", "id", "inputContent", "outlineData", "status", "title", "updatedAt", "visualStyleGuide") SELECT "backgroundVisual", "channelId", "characterVisual", "createdAt", "fullScript", "id", "inputContent", "outlineData", "status", "title", "updatedAt", "visualStyleGuide" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_channelId_idx" ON "Project"("channelId");
CREATE INDEX "Project_status_idx" ON "Project"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
