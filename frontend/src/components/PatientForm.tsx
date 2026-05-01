import { useState } from "react";
import { assessmentStore, type PatientInfo } from "@/lib/assessmentStore";

const SYMPTOMS = [
  "Increased thirst",
  "Frequent urination",
  "Fatigue",
  "Blurred vision",
  "Slow wound healing",
  "Numbness in extremities",
  "Unexplained weight loss",
  "Recurrent infections",
];

export function PatientForm({ onChange }: { onChange: (p: PatientInfo) => void }) {
  const [data, setData] = useState<PatientInfo>(assessmentStore.get().patient);

  const update = (patch: Partial<PatientInfo>) => {
    const next = { ...data, ...patch };
    setData(next);
    assessmentStore.setPatient(next);
    onChange(next);
  };

  const toggleSymptom = (s: string) => {
    const exists = data.symptoms.includes(s);
    update({ symptoms: exists ? data.symptoms.filter((x) => x !== s) : [...data.symptoms, s] });
  };

  const inputCls =
    "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-all";

  const Field = ({
    label,
    children,
    required,
  }: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Age" required>
          <input
            type="number"
            min="1"
            max="120"
            placeholder="e.g. 54"
            value={data.age}
            onChange={(e) => update({ age: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Duration of diabetes (years)" required>
          <input
            type="number"
            min="0"
            placeholder="e.g. 8"
            value={data.duration}
            onChange={(e) => update({ duration: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Current medications">
          <input
            type="text"
            placeholder="e.g. Metformin 500mg"
            value={data.medications}
            onChange={(e) => update({ medications: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Blood pressure (systolic/diastolic)">
          <input
            type="text"
            placeholder="e.g. 130/85"
            value={data.bloodPressure}
            onChange={(e) => update({ bloodPressure: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Weight (kg)">
          <input
            type="number"
            min="1"
            placeholder="e.g. 78"
            value={data.weight}
            onChange={(e) => update({ weight: e.target.value })}
            className={inputCls}
          />
        </Field>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground">Symptoms (select all that apply)</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => {
            const active = data.symptoms.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-secondary hover:text-secondary"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
