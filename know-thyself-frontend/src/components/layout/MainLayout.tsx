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
  currentScenarioIndex?: number; // ✅ NEW: Track scenario changes
  onBeginScenario?: () => void; // ✅ NEW: Begin scenario callback
  showAARButton?: boolean; // ✅ NEW: Show AAR Review button
  onStartAAR?: () => void; // ✅ NEW: Start AAR callback
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
  isAARMode = false, // ✅ NEW
  currentScenarioIndex = 0, // ✅ NEW
  onBeginScenario, // ✅ NEW
  showAARButton = false, // ✅ NEW
  onStartAAR // ✅ NEW
}: MainLayoutProps) {
  
  // ✅ NEW: During Cognitive Coach or AAR mode, show only the chat panel (full width)
  if (currentAgent === 'cognitive_coach' || isAARMode) {
    return (
      <main className="h-[calc(100vh-4rem)]">
        <div className="h-full flex items-center justify-center bg-bg-primary">
          <div className="w-full max-w-4xl h-full">
            <ConversationPanel
              key={isAARMode ? `aar-mode` : `cognitive-coach`}
              sessionId={sessionId}
              onVitalsUpdate={onVitalsUpdate}
              onNotesUpdate={onNotesUpdate}
              currentAgent={currentAgent}
              onAgentTransition={onAgentTransition}
              isAARMode={isAARMode}
              onAARComplete={onAARComplete}
              onBeginScenario={onBeginScenario}
              showAARButton={showAARButton}
              onStartAAR={onStartAAR}
            />
          </div>
        </div>
      </main>
    );
  }

  // ✅ FIXED: 2-column layout - Chat left, Vitals+Notes stacked right
  return (
    <main className="h-[calc(100vh-4rem)]">
      <div className="h-full grid grid-cols-12 gap-4 p-4">
        {/* Left Panel - Conversation (wider) */}
        <div className="col-span-8 bg-bg-secondary rounded-lg overflow-hidden">
          <ConversationPanel
            key={`scenario-${currentScenarioIndex}`}
            sessionId={sessionId}
            onVitalsUpdate={onVitalsUpdate}
            onNotesUpdate={onNotesUpdate}
            currentAgent={currentAgent}
            onAgentTransition={onAgentTransition}
            isAARMode={isAARMode}
            onAARComplete={onAARComplete}
            onBeginScenario={onBeginScenario}
            showAARButton={showAARButton}
            onStartAAR={onStartAAR}
          />
        </div>

        {/* Right Panel - Vitals + Clinical Notes stacked vertically */}
        <div className="col-span-4 flex flex-col space-y-4">
          {/* Vitals Monitor (top) */}
          <div className="bg-bg-secondary rounded-lg p-4 overflow-y-auto flex-1">
            <VitalsMonitor
              vitals={currentVitals}
              sessionId={sessionId}
              isAARMode={isAARMode}
              onVitalsUpdate={onVitalsUpdate}
            />
          </div>

          {/* Clinical Notes (bottom) */}
          <div className="bg-bg-secondary rounded-lg p-4 overflow-y-auto flex-1">
            <PatientNotes notes={patientNotes} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default MainLayout;