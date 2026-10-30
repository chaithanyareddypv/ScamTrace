export type UserRole = 'ADMINISTRATOR' | 'INVESTIGATOR' | 'VIEWER';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnalysisInputType =
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'MESSAGE'
  | 'UPI'
  | 'TRANSACTION';

export type ScamCategory =
  | 'PHISHING'
  | 'UPI_FRAUD'
  | 'FAKE_JOB'
  | 'INVESTMENT_SCAM'
  | 'DELIVERY_SCAM'
  | 'IMPERSONATION'
  | 'PAYMENT_REQUEST'
  | 'TECH_SUPPORT';

export type CaseStatus =
  | 'NEW'
  | 'UNDER_INVESTIGATION'
  | 'PENDING_REVIEW'
  | 'RESOLVED'
  | 'CLOSED';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  avatarColor: string;
}

export interface TriggeredFactorDetail {
  ruleId?: string;
  ruleCode: string;
  factorName: string;
  category: string;
  severity: RiskLevel;
  scoreContribution: number;
  matchedEvidence: string;
  explanation: string;
  description: string;
}

export interface ExtractedIndicatorItem {
  type: string;
  value: string;
  normalizedValue: string;
  context: string;
  matchedInDatabase?: boolean;
  existingIndicatorId?: string;
  existingRiskScore?: number;
}

export interface ExplainableAnalysisOutput {
  id?: string;
  inputType: AnalysisInputType;
  rawInput: string;
  normalizedInput: string;
  riskScore: number;
  riskLevel: RiskLevel;
  heuristicConfidence: number;
  verdictSummary: string;
  detailedExplanation: string;
  triggeredFactors: TriggeredFactorDetail[];
  extractedIndicators: ExtractedIndicatorItem[];
  recommendedActions: string[];
  limitations: string[];
  scoreCalculationBreakdown: {
    baseScore: number;
    rawRuleSum: number;
    threatIntelBonus: number;
    corroborationMultiplier: number;
    cappedFinalScore: number;
    formulaDescription: string;
  };
  engineVersion: string;
  evaluatedRulesCount: number;
  createdAt: string;
}

