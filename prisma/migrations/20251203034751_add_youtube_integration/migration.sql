-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Channel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "youtubeChannelId" TEXT,
    "youtubeThumbnail" TEXT,
    "personaSettings" TEXT NOT NULL DEFAULT '{}',
    "defaultOutlinePrompt" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Channel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Channel" ("createdAt", "id", "name", "personaSettings", "updatedAt", "userId") SELECT "createdAt", "id", "name", "personaSettings", "updatedAt", "userId" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE UNIQUE INDEX "Channel_youtubeChannelId_key" ON "Channel"("youtubeChannelId");
CREATE INDEX "Channel_userId_idx" ON "Channel"("userId");
CREATE INDEX "Channel_youtubeChannelId_idx" ON "Channel"("youtubeChannelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
