export type RiskLevel = "low" | "moderate" | "high" | "severe";

export const riskMeta: Record<RiskLevel, { label: string; tone: string; bg: string; text: string; border: string }> = {
  low: { label: "Low Risk", tone: "risk-low", bg: "bg-risk-low-soft", text: "text-risk-low", border: "border-risk-low/30" },
  moderate: { label: "Moderate Risk", tone: "risk-moderate", bg: "bg-risk-moderate-soft", text: "text-risk-moderate", border: "border-risk-moderate/30" },
  high: { label: "High Risk", tone: "risk-high", bg: "bg-risk-high-soft", text: "text-risk-high", border: "border-risk-high/30" },
  severe: { label: "Severe Risk", tone: "risk-severe", bg: "bg-risk-severe-soft", text: "text-risk-severe", border: "border-risk-severe/30" },
};

export interface OrganResult {
  id: string;
  name: string;
  icon: string;
  risk: RiskLevel;
  score: number; // 0-100
  confidence: number;
  findings: string[];
  abnormalValues?: { name: string; value: string; normal: string; flag: boolean }[];
  hasImage?: boolean;
  trend?: { month: string; value: number; normal: number }[];
  explanation: string;
}

export const mockResults: { overallRisk: RiskLevel; overallScore: number; organs: OrganResult[] } = {
  overallRisk: "high",
  overallScore: 72,
  organs: [
    {
      id: "retina",
      name: "Retina",
      icon: "Eye",
      risk: "high",
      score: 74,
      confidence: 92,
      hasImage: true,
      findings: [
        "Mild non-proliferative diabetic retinopathy detected",
        "Microaneurysms present in superior temporal quadrant",
        "No macular edema observed",
      ],
      explanation:
        "Image analysis identified early-stage retinopathy markers consistent with prolonged hyperglycemia. Annual ophthalmologic follow-up recommended.",
      trend: [
        { month: "Jan", value: 45, normal: 30 },
        { month: "Mar", value: 55, normal: 30 },
        { month: "Jun", value: 62, normal: 30 },
        { month: "Sep", value: 70, normal: 30 },
        { month: "Dec", value: 74, normal: 30 },
      ],
    },
    {
      id: "kidney",
      name: "Kidney",
      icon: "Activity",
      risk: "moderate",
      score: 48,
      confidence: 88,
      findings: [
        "eGFR slightly reduced (68 mL/min/1.73m²)",
        "Microalbuminuria detected",
        "Serum creatinine within upper range",
      ],
      abnormalValues: [
        { name: "eGFR", value: "68", normal: "≥90 mL/min", flag: true },
        { name: "ACR", value: "42", normal: "<30 mg/g", flag: true },
        { name: "Creatinine", value: "1.2", normal: "0.7–1.3 mg/dL", flag: false },
      ],
      explanation:
        "Early signs of diabetic nephropathy. ACE inhibitor therapy and 6-month renal panel monitoring advised.",
      trend: [
        { month: "Jan", value: 35, normal: 25 },
        { month: "Mar", value: 38, normal: 25 },
        { month: "Jun", value: 42, normal: 25 },
        { month: "Sep", value: 45, normal: 25 },
        { month: "Dec", value: 48, normal: 25 },
      ],
    },
    {
      id: "heart",
      name: "Heart",
      icon: "Heart",
      risk: "high",
      score: 68,
      confidence: 85,
      findings: [
        "ECG: Mild ST-segment changes",
        "Elevated LDL cholesterol",
        "Resting heart rate elevated (88 bpm)",
      ],
      abnormalValues: [
        { name: "LDL", value: "162", normal: "<100 mg/dL", flag: true },
        { name: "HDL", value: "38", normal: ">40 mg/dL", flag: true },
        { name: "BP", value: "142/92", normal: "<130/80", flag: true },
      ],
      explanation:
        "Cardiovascular risk markers elevated. Cardiology consultation and lipid management recommended.",
    },
    {
      id: "foot",
      name: "Foot & Skin",
      icon: "Footprints",
      risk: "low",
      score: 22,
      confidence: 94,
      hasImage: true,
      findings: [
        "No visible ulceration or lesions",
        "Normal skin perfusion",
        "Recommend monthly self-examination",
      ],
      explanation: "No concerning skin or peripheral findings. Maintain daily foot inspection routine.",
    },
    {
      id: "blood",
      name: "Blood Markers",
      icon: "Droplet",
      risk: "high",
      score: 78,
      confidence: 96,
      findings: [
        "HbA1c elevated at 8.4%",
        "Fasting glucose 168 mg/dL",
        "Triglycerides borderline high",
      ],
      abnormalValues: [
        { name: "HbA1c", value: "8.4%", normal: "<7.0%", flag: true },
        { name: "Fasting Glucose", value: "168", normal: "70–110 mg/dL", flag: true },
        { name: "Triglycerides", value: "188", normal: "<150 mg/dL", flag: true },
      ],
      explanation:
        "Glycemic control is suboptimal. Consider medication adjustment and structured lifestyle intervention.",
      trend: [
        { month: "Jan", value: 7.2, normal: 6.5 },
        { month: "Mar", value: 7.6, normal: 6.5 },
        { month: "Jun", value: 7.9, normal: 6.5 },
        { month: "Sep", value: 8.1, normal: 6.5 },
        { month: "Dec", value: 8.4, normal: 6.5 },
      ],
    },
  ],
};

export const recommendations = {
  referrals: [
    { specialist: "Endocrinologist", urgency: "Within 2 weeks", reason: "Glycemic control optimization" },
    { specialist: "Ophthalmologist", urgency: "Within 1 month", reason: "Diabetic retinopathy follow-up" },
    { specialist: "Cardiologist", urgency: "Within 1 month", reason: "Cardiovascular risk assessment" },
    { specialist: "Nephrologist", urgency: "Within 3 months", reason: "Early nephropathy monitoring" },
  ],
  lifestyle: [
    "Adopt a low-glycemic, Mediterranean-style diet",
    "150 minutes of moderate aerobic activity per week",
    "Reduce sodium intake to under 2,300 mg/day",
    "Maintain consistent sleep schedule (7–9 hours)",
    "Smoking cessation if applicable",
  ],
  monitoring: [
    { item: "Blood glucose", frequency: "Daily, fasting & post-meal" },
    { item: "Blood pressure", frequency: "Twice weekly" },
    { item: "HbA1c", frequency: "Every 3 months" },
    { item: "Lipid panel", frequency: "Every 6 months" },
    { item: "Renal panel", frequency: "Every 6 months" },
  ],
  timeline: [
    { week: "Week 1", action: "Schedule endocrinology consultation" },
    { week: "Week 2", action: "Begin daily glucose logging" },
    { week: "Month 1", action: "Ophthalmology and cardiology visits" },
    { week: "Month 3", action: "Repeat HbA1c and lipid panel" },
    { week: "Month 6", action: "Comprehensive risk re-assessment" },
  ],
};
