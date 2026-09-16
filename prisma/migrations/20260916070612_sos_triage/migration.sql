-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SosRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'routine',
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "spokenText" TEXT,
    "spokenLanguage" TEXT,
    "triageSuggested" TEXT,
    "triageAccepted" BOOLEAN NOT NULL DEFAULT false,
    "summaryEnglish" TEXT,
    CONSTRAINT "SosRequest_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SosRequest" ("createdAt", "district", "id", "lat", "lng", "note", "resolvedAt", "state", "status", "type", "workerId") SELECT "createdAt", "district", "id", "lat", "lng", "note", "resolvedAt", "state", "status", "type", "workerId" FROM "SosRequest";
DROP TABLE "SosRequest";
ALTER TABLE "new_SosRequest" RENAME TO "SosRequest";
CREATE INDEX "SosRequest_status_createdAt_idx" ON "SosRequest"("status", "createdAt");
CREATE INDEX "SosRequest_state_district_idx" ON "SosRequest"("state", "district");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
