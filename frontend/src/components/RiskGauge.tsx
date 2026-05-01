import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { riskMeta, type RiskLevel } from "@/lib/mockData";

const colorVar: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  moderate: "var(--risk-moderate)",
  high: "var(--risk-high)",
  severe: "var(--risk-severe)",
};

export function RiskGauge({
  score,
  risk,
  size = 220,
}: {
  score: number;
  risk: RiskLevel;
  size?: number;
}) {
  const data = [
    { name: "score", value: score },
    { name: "rest", value: 100 - score },
  ];
  const color = colorVar[risk];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={220}
            endAngle={-40}
            innerRadius={size * 0.36}
            outerRadius={size * 0.46}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="var(--muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-semibold tracking-tight" style={{ color }}>
          {score}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
          Risk Score
        </div>
        <div className="text-sm font-medium mt-2" style={{ color }}>
          {riskMeta[risk].label}
        </div>
      </div>
    </div>
  );
}
