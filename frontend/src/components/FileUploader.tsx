import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Image as ImageIcon, X, CheckCircle2 } from "lucide-react";
import { assessmentStore, type UploadedFile } from "@/lib/assessmentStore";

function detectType(name: string): UploadedFile["type"] {
  const n = name.toLowerCase();
  if (n.includes("retina") || n.includes("fundus") || n.includes("eye")) return "retina";
  if (n.includes("tongue")) return "tongue";
  if (n.includes("foot") || n.includes("skin")) return "foot";
  if (n.includes("blood") || n.includes("cbc") || n.includes("hba1c")) return "blood-report";
  if (n.includes("kidney") || n.includes("renal")) return "kidney-report";
  if (n.includes("ecg") || n.includes("ekg")) return "ecg";
  if (n.endsWith(".pdf")) return "blood-report";
  return "other";
}

const typeLabels: Record<UploadedFile["type"], string> = {
  retina: "Retina",
  tongue: "Tongue",
  foot: "Foot / Skin",
  "blood-report": "Blood Report",
  "kidney-report": "Kidney Report",
  ecg: "ECG",
  other: "Document",
};

export function FileUploader({ onChange }: { onChange: (files: UploadedFile[]) => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const mapped: UploadedFile[] = accepted.map((f) => {
        const isImage = f.type.startsWith("image/");
        return {
          id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: f.name,
          size: f.size,
          type: detectType(f.name),
          category: isImage ? "image" : "pdf",
          preview: isImage ? URL.createObjectURL(f) : undefined,
          rawFile: f,
        };
      });
      const next = [...files, ...mapped];
      setFiles(next);
      assessmentStore.setFiles(next);
      onChange(next);
    },
    [files, onChange]
  );

  const remove = (id: string) => {
    const next = files.filter((f) => f.id !== id);
    setFiles(next);
    assessmentStore.setFiles(next);
    onChange(next);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer p-10 text-center
          ${
            isDragActive
              ? "border-accent bg-accent/5"
              : "border-border bg-muted/30 hover:border-secondary hover:bg-secondary/5"
          }`}
      >
        <input {...getInputProps()} />
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <UploadCloud className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {isDragActive ? "Drop files here" : "Upload medical reports & images"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag & drop or click to browse — JPG, PNG, PDF
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Retina · Tongue · Foot/Skin images · Blood, Kidney, ECG reports
        </p>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid gap-3 sm:grid-cols-2"
          >
            {files.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="clinical-card p-3 flex items-center gap-3"
              >
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {f.preview ? (
                    <img src={f.preview} alt={f.name} className="h-full w-full object-cover" />
                  ) : f.category === "pdf" ? (
                    <FileText className="h-6 w-6 text-secondary" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-secondary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                    <CheckCircle2 className="h-3.5 w-3.5 text-risk-low shrink-0" />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent">
                      {typeLabels[f.type]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(f.id);
                  }}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
