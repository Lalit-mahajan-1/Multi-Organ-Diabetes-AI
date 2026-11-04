export type RiskLevel = "low" | "moderate" | "high" | "severe";

export const riskMeta: Record<
  RiskLevel,
  { label: string; tone: string; bg: string; text: string; border: string }
> = {
  low: {
    label: "Low Risk",
    tone: "risk-low",
    bg: "bg-risk-low-soft",
    text: "text-risk-low",
    border: "border-risk-low/30",
  },
  moderate: {
    label: "Moderate Risk",
    tone: "risk-moderate",
    bg: "bg-risk-moderate-soft",
    text: "text-risk-moderate",
    border: "border-risk-moderate/30",
  },
  high: {
    label: "High Risk",
    tone: "risk-high",
    bg: "bg-risk-high-soft",
    text: "text-risk-high",
    border: "border-risk-high/30",
  },
  severe: {
    label: "Severe Risk",
    tone: "risk-severe",
    bg: "bg-risk-severe-soft",
    text: "text-risk-severe",
    border: "border-risk-severe/30",
  },
};

export interface OrganResult {
  id: string;
  name: string;
  icon: string;
  risk: RiskLevel;
  score: number;
  confidence: number;
  findings: string[];
  abnormalValues?: {
    name: string;
    value: string;
    normal: string;
    flag: boolean;
  }[];
  hasImage?: boolean;
  trend?: { month: string; value: number; normal: number }[];
  explanation: string;
}
