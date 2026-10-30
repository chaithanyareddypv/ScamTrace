-- ScamTrace Initial Relational Database Migration
-- Supports full relational integrity across 15 domain tables

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'INVESTIGATOR',
    "department" TEXT NOT NULL DEFAULT 'Threat Operations',
    "avatarColor" TEXT NOT NULL DEFAULT '#4F46E5',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyHighRisk" BOOLEAN NOT NULL DEFAULT true,
    "notifyCaseAssign" BOOLEAN NOT NULL DEFAULT true,
    "notifyEvidence" BOOLEAN NOT NULL DEFAULT true,
    "notifyRules" BOOLEAN NOT NULL DEFAULT false,
    "themePreference" TEXT NOT NULL DEFAULT 'light',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "InvestigationCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolutionSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvestigationCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ThreatPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "commonTacticsJson" TEXT NOT NULL,
    "targetPersona" TEXT NOT NULL,
    "detectionCount" INTEGER NOT NULL,
    "weeklyGrowthPct" REAL NOT NULL,
    "confidenceLimitation" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL DEFAULT 'Synthetic Intelligence Corpus v2.4',
    "isEmerging" BOOLEAN NOT NULL DEFAULT false,
    "firstObservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Indicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL DEFAULT 85,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "summaryReason" TEXT NOT NULL,
    "technicalAttributesJson" TEXT NOT NULL,
    "sourceClassification" TEXT NOT NULL DEFAULT 'SYNTHETIC_SEED',
    "associationCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT,
    "threatPatternId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Indicator_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Indicator_threatPatternId_fkey" FOREIGN KEY ("threatPatternId") REFERENCES "ThreatPattern" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ScamReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "submittedIndicatorValue" TEXT NOT NULL,
    "submittedIndicatorType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reporterChannel" TEXT NOT NULL DEFAULT 'WEB_PORTAL',
    "detectionExplanation" TEXT NOT NULL,
    "triggeredRulesJson" TEXT NOT NULL,
    "financialLossAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "caseId" TEXT,
    "indicatorId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScamReport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScamReport_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScamReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "MessageSample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sampleCode" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "senderIdentifier" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "extractedIndicatorsJson" TEXT NOT NULL,
    "linguisticSignalsJson" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "indicatorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageSample_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "TransactionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "paymentRail" TEXT NOT NULL,
    "senderHandle" TEXT NOT NULL,
    "receiverHandle" TEXT NOT NULL,
    "merchantDisplayName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scamCategory" TEXT NOT NULL,
    "anomalyFlagsJson" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "indicatorId" TEXT,
    "caseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionEvent_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evidenceCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "storageMode" TEXT NOT NULL DEFAULT 'metadata-local',
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "chainOfCustodyNotes" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "reportId" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "DetectionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetTypes" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "scoreWeight" INTEGER NOT NULL,
    "maxWeight" INTEGER NOT NULL DEFAULT 45,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "precisionEstimate" REAL NOT NULL DEFAULT 0.89,
    "patternConfigJson" TEXT NOT NULL,
    "explanationTemplate" TEXT NOT NULL,
    "lastTriggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inputType" TEXT NOT NULL,
    "rawInput" TEXT NOT NULL,
    "normalizedInput" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "heuristicConfidence" INTEGER NOT NULL,
    "verdictSummary" TEXT NOT NULL,
    "detailedExplanation" TEXT NOT NULL,
    "extractedIndicatorsJson" TEXT NOT NULL,
    "recommendedActionsJson" TEXT NOT NULL,
    "limitationsJson" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL DEFAULT 'ScamTrace Explainable Engine v2.4 (Rule-Based)',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "DetectionFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleCode" TEXT NOT NULL,
    "factorName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "scoreContribution" INTEGER NOT NULL,
    "matchedEvidence" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DetectionFactor_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AnalysisResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DetectionFactor_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "DetectionRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "EntityRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceRiskLevel" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "targetRiskLevel" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "evidenceSummary" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CaseNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'ANALYST_NOTE',
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "InvestigationCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "relatedEntityId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT,
    "ipAddress" TEXT NOT NULL DEFAULT '127.0.0.1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_email_idx" ON "User"("email");

CREATE UNIQUE INDEX "InvestigationCase_caseNumber_key" ON "InvestigationCase"("caseNumber");
CREATE INDEX "InvestigationCase_status_idx" ON "InvestigationCase"("status");
CREATE INDEX "InvestigationCase_riskLevel_idx" ON "InvestigationCase"("riskLevel");
CREATE INDEX "InvestigationCase_priority_idx" ON "InvestigationCase"("priority");
CREATE INDEX "InvestigationCase_assignedToId_idx" ON "InvestigationCase"("assignedToId");
CREATE INDEX "InvestigationCase_createdAt_idx" ON "InvestigationCase"("createdAt");

CREATE UNIQUE INDEX "ThreatPattern_code_key" ON "ThreatPattern"("code");
CREATE INDEX "ThreatPattern_category_idx" ON "ThreatPattern"("category");
CREATE INDEX "ThreatPattern_severity_idx" ON "ThreatPattern"("severity");

CREATE UNIQUE INDEX "Indicator_value_key" ON "Indicator"("value");
CREATE INDEX "Indicator_type_idx" ON "Indicator"("type");
CREATE INDEX "Indicator_riskLevel_idx" ON "Indicator"("riskLevel");
CREATE INDEX "Indicator_category_idx" ON "Indicator"("category");
CREATE INDEX "Indicator_caseId_idx" ON "Indicator"("caseId");
CREATE INDEX "Indicator_riskScore_idx" ON "Indicator"("riskScore");

CREATE UNIQUE INDEX "ScamReport_reportNumber_key" ON "ScamReport"("reportNumber");
CREATE INDEX "ScamReport_category_idx" ON "ScamReport"("category");
CREATE INDEX "ScamReport_riskLevel_idx" ON "ScamReport"("riskLevel");
CREATE INDEX "ScamReport_status_idx" ON "ScamReport"("status");
CREATE INDEX "ScamReport_caseId_idx" ON "ScamReport"("caseId");
CREATE INDEX "ScamReport_indicatorId_idx" ON "ScamReport"("indicatorId");
CREATE INDEX "ScamReport_createdAt_idx" ON "ScamReport"("createdAt");

CREATE UNIQUE INDEX "MessageSample_sampleCode_key" ON "MessageSample"("sampleCode");
CREATE INDEX "MessageSample_category_idx" ON "MessageSample"("category");
CREATE INDEX "MessageSample_riskLevel_idx" ON "MessageSample"("riskLevel");
CREATE INDEX "MessageSample_channel_idx" ON "MessageSample"("channel");

CREATE UNIQUE INDEX "TransactionEvent_referenceId_key" ON "TransactionEvent"("referenceId");
CREATE INDEX "TransactionEvent_paymentRail_idx" ON "TransactionEvent"("paymentRail");
CREATE INDEX "TransactionEvent_riskLevel_idx" ON "TransactionEvent"("riskLevel");
CREATE INDEX "TransactionEvent_scamCategory_idx" ON "TransactionEvent"("scamCategory");

CREATE UNIQUE INDEX "Evidence_evidenceCode_key" ON "Evidence"("evidenceCode");
CREATE INDEX "Evidence_caseId_idx" ON "Evidence"("caseId");
CREATE INDEX "Evidence_type_idx" ON "Evidence"("type");
CREATE INDEX "Evidence_verificationStatus_idx" ON "Evidence"("verificationStatus");

CREATE UNIQUE INDEX "DetectionRule_code_key" ON "DetectionRule"("code");
CREATE INDEX "DetectionRule_category_idx" ON "DetectionRule"("category");
CREATE INDEX "DetectionRule_isActive_idx" ON "DetectionRule"("isActive");

CREATE INDEX "AnalysisResult_inputType_idx" ON "AnalysisResult"("inputType");
CREATE INDEX "AnalysisResult_riskLevel_idx" ON "AnalysisResult"("riskLevel");
CREATE INDEX "AnalysisResult_createdAt_idx" ON "AnalysisResult"("createdAt");

CREATE INDEX "DetectionFactor_analysisId_idx" ON "DetectionFactor"("analysisId");
CREATE INDEX "DetectionFactor_ruleId_idx" ON "DetectionFactor"("ruleId");

CREATE INDEX "EntityRelationship_sourceId_idx" ON "EntityRelationship"("sourceId");
CREATE INDEX "EntityRelationship_targetId_idx" ON "EntityRelationship"("targetId");
CREATE INDEX "EntityRelationship_relationshipType_idx" ON "EntityRelationship"("relationshipType");

CREATE INDEX "CaseNote_caseId_idx" ON "CaseNote"("caseId");

CREATE INDEX "Alert_isRead_idx" ON "Alert"("isRead");
CREATE INDEX "Alert_category_idx" ON "Alert"("category");
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

