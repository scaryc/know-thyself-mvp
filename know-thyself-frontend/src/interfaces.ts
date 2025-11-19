export interface Vitals {
  HR: number;
  RR: number;
  SpO2: number;
  BP: string;
  Temp: number;
  GCS: number;
  Glycemia: number;
}

export interface DispatchInfo {
  timeOfCall: string;
  location: string;
  chiefComplaint: string;
  callerInfo?: string;
}

export interface PatientInfo {
  name: string;
  age: string | number;
  gender: string;
}

export interface ScenarioData {
  dispatchInfo: DispatchInfo;
  patientInfo: PatientInfo;
  initialSceneDescription?: string;
}

export interface StartSessionBody {
  scenarioId: string;
  studentId?: string;
  scenarioQueue?: string[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  scenarioId: string;
  startTime: number;
  status: 'active' | 'paused' | 'complete';
}