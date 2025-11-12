// src/components/layout/MainLayout.tsx
import ConversationPanel from '../conversation/ConversationPanel';
import VitalsMonitor from '../clinical/VitalsMonitor';
import PatientNotes from '../clinical/PatientNotes';

interface MainLayoutProps {
  sessionId: string;
  currentVitals: any;
  onVitalsUpdate: (vitals: any) => void;
  patientNotes: string[];
  onNotesUpdate: (notes: string[]) => void;
  currentAgent: 'cognitive_coach' | 'core' | null; // ✅ NEW
  onAgentTransition: (newAgent: 'core', scenarioData: any) => void; // ✅ NEW
  onAARComplete?: () => void; // ✅ NEW
  isAARMode?: boolean; // ✅ NEW
}

function MainLayout({
  sessionId,
  currentVitals,
  onVitalsUpdate,
  patientNotes,
  onNotesUpdate,
  currentAgent, // ✅ NEW
  onAgentTransition, // ✅ NEW
  onAARComplete, // ✅ NEW
  isAARMode = false // ✅ NEW
}: MainLayoutProps) {
  
  // ✅ NEW: During Cognitive Coach, show only the chat panel (full width)
  if (currentAgent === 'cognitive_coach') {
    return (
      <main className="h-[calc(100vh-4rem)]">
        <div className="h-full flex items-center justify-center bg-bg-primary">
          <div className="w-full max-w-4xl h-full">
            <ConversationPanel
              sessionId={sessionId}
              onVitalsUpdate={onVitalsUpdate}
              onNotesUpdate={onNotesUpdate}
              currentAgent={currentAgent}
              onAgentTransition={onAgentTransition}
              isAARMode={isAARMode}
              onAARComplete={onAARComplete}
            />
          </div>
        </div>
      </main>
    );
  }

  // ✅ EXISTING: Normal 3-column layout for Core Agent mode
  return (
    <main className="h-[calc(100vh-4rem)]">
      <div className="h-full grid grid-cols-12 gap-4 p-4">
        {/* Left Panel - Conversation */}
        <div className="col-span-6 bg-bg-secondary rounded-lg overflow-hidden">
          <ConversationPanel
            sessionId={sessionId}
            onVitalsUpdate={onVitalsUpdate}
            onNotesUpdate={onNotesUpdate}
            currentAgent={currentAgent}
            onAgentTransition={onAgentTransition}
            isAARMode={isAARMode}
            onAARComplete={onAARComplete}
          />
        </div>

        {/* Middle Panel - Vitals Monitor */}
        <div className="col-span-3 bg-bg-secondary rounded-lg p-4 overflow-y-auto">
          <VitalsMonitor
            vitals={currentVitals}
            sessionId={sessionId}
            isAARMode={isAARMode}
            onVitalsUpdate={onVitalsUpdate}
          />
        </div>

        {/* Right Panel - Clinical Data */}
        <div className="col-span-3 space-y-4">
          <div className="bg-bg-secondary rounded-lg p-4">
            <PatientNotes notes={patientNotes} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default MainLayout;