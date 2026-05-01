// Lightweight in-memory store for assessment flow between routes.
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: "retina" | "tongue" | "foot" | "blood-report" | "kidney-report" | "ecg" | "other";
  category: "image" | "pdf";
  preview?: string;
  rawFile?: File;  // actual File object for upload
}

export interface PatientInfo {
  age: string;
  duration: string;
  medications: string;
  symptoms: string[];
  bloodPressure: string;
  weight: string;
}

interface AssessmentState {
  files: UploadedFile[];
  patient: PatientInfo;
  sessionId: string;
}

const defaultPatient: PatientInfo = {
  age: "",
  duration: "",
  medications: "",
  symptoms: [],
  bloodPressure: "",
  weight: "",
};

let state: AssessmentState = { files: [], patient: defaultPatient, sessionId: "" };

export const assessmentStore = {
  get: () => state,
  setFiles: (files: UploadedFile[]) => {
    state = { ...state, files };
  },
  setPatient: (patient: PatientInfo) => {
    state = { ...state, patient };
  },
  setSessionId: (sessionId: string) => {
    state = { ...state, sessionId };
  },
  reset: () => {
    state = { files: [], patient: defaultPatient, sessionId: "" };
  },
};
