import VitalsMonitor from './VitalsMonitor';
import PatientNotes from './PatientNotes';

interface ClinicalDataPanelProps {
  sessionId: string;
  vitals: any;
  patientNotes: string[];  // ✅ CHANGED
}

function ClinicalDataPanel({ sessionId, vitals, patientNotes }: ClinicalDataPanelProps) {
  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Vitals Monitor */}
      <VitalsMonitor vitals={vitals} />

      {/* Patient Notes - Simplified */}
      <div className="flex-1 p-4 overflow-y-auto">
        <PatientNotes notes={patientNotes} />
      </div>
    </div>
  );
}

export default ClinicalDataPanel;