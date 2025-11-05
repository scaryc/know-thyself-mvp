export interface Vitals {
  HR: number;
  RR: number;
  SpO2: number;
  BP: string;
  Temp: number;
  GCS: number;
  Glycemia: number;
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