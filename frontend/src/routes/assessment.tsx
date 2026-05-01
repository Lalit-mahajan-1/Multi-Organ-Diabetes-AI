import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { AppHeader, MedicalDisclaimer } from "@/components/AppHeader";
import { FileUploader } from "@/components/FileUploader";
import { PatientForm } from "@/components/PatientForm";
import { StepIndicator } from "@/components/StepIndicator";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { assessmentStore, type UploadedFile, type PatientInfo } from "@/lib/assessmentStore";
import { apiUploadFiles } from "@/lib/api";

export const Route = createFileRoute("/assessment")({
  component: AssessmentPage,
});

function AssessmentPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [patient, setPatient] = useState<PatientInfo>({
    age: "",
    duration: "",
    medications: "",
    symptoms: [],
    bloodPressure: "",
    weight: "",
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredFilled = patient.age.trim() !== "" && patient.duration.trim() !== "";
  const canSubmit = requiredFilled && files.length > 0 && !uploading;

  const step = useMemo(() => {
    if (!files.length) return 0;
    if (!requiredFilled) return 1;
    return 2;
  }, [files.length, requiredFilled]);

  if (!user) return null;

  async function start() {
    setError(null);
    setUploading(true);

    try {
      // Collect raw File objects from uploaded files
      const rawFiles = files
        .map((f) => f.rawFile)
        .filter((f): f is File => f != null);

      if (rawFiles.length === 0) {
        throw new Error("No valid files to upload");
      }

      // Upload to backend
      const response = await apiUploadFiles(rawFiles, {
        age: patient.age,
        duration: patient.duration,
        medications: patient.medications,
        symptoms: patient.symptoms,
        bloodPressure: patient.bloodPressure,
        weight: patient.weight,
      });

      // Store session data
      assessmentStore.setFiles(files);
      assessmentStore.setPatient(patient);
      assessmentStore.setSessionId(response.session_id);

      navigate({ to: "/processing" });
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4 border border-accent/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            Clinical-grade AI · HIPAA-aligned workflow
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight text-foreground">
            Multi-organ diabetes <span className="text-gradient-primary">risk assessment</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Upload medical reports and clinical images to receive an AI-assisted risk profile across
            retina, kidney, heart, foot, and blood markers — designed for use alongside qualified
            medical advice.
          </p>
        </motion.section>

        {/* Steps */}
        <div className="mt-10 max-w-3xl mx-auto">
          <StepIndicator steps={["Upload", "Patient Info", "Ready"]} current={step} />
        </div>

        {/* Body */}
        <div className="mt-8 grid lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 clinical-card p-6">
            <header className="mb-5">
              <h2 className="text-lg font-display font-semibold text-foreground">1. Medical reports & images</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Files are auto-classified by type. Add as many as needed.
              </p>
            </header>
            <FileUploader onChange={setFiles} />
          </section>

          <section className="lg:col-span-2 clinical-card p-6">
            <header className="mb-5">
              <h2 className="text-lg font-display font-semibold text-foreground">2. Patient information</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Required: age and duration of diabetes.
              </p>
            </header>
            <PatientForm onChange={setPatient} />
          </section>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 max-w-3xl mx-auto rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!canSubmit}
            onClick={start}
            className={`inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all
              ${canSubmit ? "btn-premium" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze Risk Profile
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
          {!canSubmit && !uploading && (
            <p className="text-xs text-muted-foreground">
              {files.length === 0
                ? "Upload at least one report or image to continue."
                : "Please fill in age and duration of diabetes."}
            </p>
          )}
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <MedicalDisclaimer />
        </div>
      </main>
    </div>
  );
}
