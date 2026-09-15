-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uan" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameLocal" TEXT,
    "phone" TEXT NOT NULL,
    "isSmartphone" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'hi',
    "gender" TEXT NOT NULL,
    "yearOfBirth" INTEGER NOT NULL,
    "skillCategory" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "homeState" TEXT NOT NULL,
    "homeDistrict" TEXT NOT NULL,
    "currentState" TEXT NOT NULL,
    "currentDistrict" TEXT NOT NULL,
    "lastSeenAt" DATETIME NOT NULL,
    "consentWelfare" BOOLEAN NOT NULL DEFAULT true,
    "consentCrisis" BOOLEAN NOT NULL DEFAULT true,
    "consentHistory" BOOLEAN NOT NULL DEFAULT true,
    "consentResearch" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentEvent_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "regNo" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Worksite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "geofenceRadius" INTEGER NOT NULL DEFAULT 300,
    "qrSecret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Worksite_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "worksiteId" TEXT,
    "method" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "coarsened" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" DATETIME NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasOffline" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CheckIn_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_worksiteId_fkey" FOREIGN KEY ("worksiteId") REFERENCES "Worksite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MigrationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "fromDistrict" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "toDistrict" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL,
    CONSTRAINT "MigrationEvent_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "worksiteId" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "daysWorked" INTEGER NOT NULL DEFAULT 0,
    "proofHash" TEXT NOT NULL,
    CONSTRAINT "WorkRecord_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkRecord_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkRecord_worksiteId_fkey" FOREIGN KEY ("worksiteId") REFERENCES "Worksite" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Officer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "scopeState" TEXT,
    "scopeDistrict" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetWorkerId" TEXT,
    "targetDistrict" TEXT,
    "legalBasis" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_targetWorkerId_fkey" FOREIGN KEY ("targetWorkerId") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrisisEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "declaredById" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CrisisEvent_declaredById_fkey" FOREIGN KEY ("declaredById") REFERENCES "Officer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crisisId" TEXT,
    "workerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'hi',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "Alert_crisisId_fkey" FOREIGN KEY ("crisisId") REFERENCES "CrisisEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alert_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SosRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "SosRequest_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Worker_uan_key" ON "Worker"("uan");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_phone_key" ON "Worker"("phone");

-- CreateIndex
CREATE INDEX "Worker_currentState_currentDistrict_idx" ON "Worker"("currentState", "currentDistrict");

-- CreateIndex
CREATE INDEX "Worker_homeState_homeDistrict_idx" ON "Worker"("homeState", "homeDistrict");

-- CreateIndex
CREATE INDEX "Worker_lastSeenAt_idx" ON "Worker"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Worker_sector_idx" ON "Worker"("sector");

-- CreateIndex
CREATE INDEX "ConsentEvent_workerId_createdAt_idx" ON "ConsentEvent"("workerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Employer_regNo_key" ON "Employer"("regNo");

-- CreateIndex
CREATE UNIQUE INDEX "Worksite_qrSecret_key" ON "Worksite"("qrSecret");

-- CreateIndex
CREATE INDEX "Worksite_state_district_idx" ON "Worksite"("state", "district");

-- CreateIndex
CREATE INDEX "CheckIn_district_recordedAt_idx" ON "CheckIn"("district", "recordedAt");

-- CreateIndex
CREATE INDEX "CheckIn_workerId_recordedAt_idx" ON "CheckIn"("workerId", "recordedAt");

-- CreateIndex
CREATE INDEX "CheckIn_state_recordedAt_idx" ON "CheckIn"("state", "recordedAt");

-- CreateIndex
CREATE INDEX "MigrationEvent_toState_detectedAt_idx" ON "MigrationEvent"("toState", "detectedAt");

-- CreateIndex
CREATE INDEX "MigrationEvent_fromState_toState_idx" ON "MigrationEvent"("fromState", "toState");

-- CreateIndex
CREATE INDEX "MigrationEvent_detectedAt_idx" ON "MigrationEvent"("detectedAt");

-- CreateIndex
CREATE INDEX "WorkRecord_workerId_startDate_idx" ON "WorkRecord"("workerId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Officer_email_key" ON "Officer"("email");

-- CreateIndex
CREATE INDEX "AuditLog_targetWorkerId_createdAt_idx" ON "AuditLog"("targetWorkerId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_officerId_createdAt_idx" ON "AuditLog"("officerId", "createdAt");

-- CreateIndex
CREATE INDEX "CrisisEvent_state_district_active_idx" ON "CrisisEvent"("state", "district", "active");

-- CreateIndex
CREATE INDEX "Alert_workerId_sentAt_idx" ON "Alert"("workerId", "sentAt");

-- CreateIndex
CREATE INDEX "SosRequest_status_createdAt_idx" ON "SosRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SosRequest_state_district_idx" ON "SosRequest"("state", "district");
