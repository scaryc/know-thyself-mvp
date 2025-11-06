import { useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import Header from './components/layout/Header';
import SessionComplete from './components/SessionComplete';
import { api } from './services/api';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [scenarioStartTime, setScenarioStartTime] = useState<number>(Date.now());
  const [currentVitals, setCurrentVitals] = useState<any>(null);
  const [dispatchInfo, setDispatchInfo] = useState<any>(null);  
  const [patientInfo, setPatientInfo] = useState<any>(null);    
  const [patientNotes, setPatientNotes] = useState<string[]>([]);
  const [scenarioQueue, setScenarioQueue] = useState<string[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);

  // ✅ NEW: Track current agent
  const [currentAgent, setCurrentAgent] = useState<'cognitive_coach' | 'core' | null>(null);

  // ✅ NEW: Track AAR mode (Task 0.2)
  const [isAARMode, setIsAARMode] = useState(false);

  // ✅ NEW: Track session completion
  const [sessionComplete, setSessionComplete] = useState(false);

  const handleStartSession = async () => {
    // Define all available scenarios and randomly select 3
    const allScenarios = ['ASTHMA_MVP_001', 'STEMI_MVP_001', 'SEIZURE_MVP_001', 'TBI_MVP_001'];
    const shuffled = [...allScenarios].sort(() => Math.random() - 0.5);
    const selectedScenarios = shuffled.slice(0, 3); // Pick 3 random scenarios

    setScenarioQueue(selectedScenarios);
    setCurrentScenarioIndex(0);
    setCompletedScenarios([]);

    console.log('Selected scenarios for this session:', selectedScenarios);

    // Start first scenario
    const response = await api.startSession(selectedScenarios[0]);
    console.log('Backend response:', response);
    
    setSessionId(response.sessionId);
    setIsActive(true);
    
    // ✅ NEW: Set current agent from response
    setCurrentAgent(response.currentAgent || 'cognitive_coach');
    
    // ✅ FIXED: Only set scenario data if it exists in response (NOT during Cognitive Coach)
    if (response.dispatchInfo) {
      setDispatchInfo(response.dispatchInfo);
    }
    if (response.patientInfo) {
      setPatientInfo(response.patientInfo);
    }
    if (response.initialSceneDescription) {
      sessionStorage.setItem('initialScene', response.initialSceneDescription);
    }
    
    // ✅ FIXED: Only set timer start if we're in Core Agent mode
    if (response.currentAgent === 'core') {
      setScenarioStartTime(Date.now());
      setCurrentVitals(null);
      setPatientNotes([]);
    }
  };

  const handleCompleteScenario = async () => {
    // Mark current scenario as completed
    const currentScenario = scenarioQueue[currentScenarioIndex];
    setCompletedScenarios(prev => [...prev, currentScenario]);

    console.log(`Scenario ${currentScenarioIndex + 1} completed: ${currentScenario}`);

    // Check if there are more scenarios
    if (currentScenarioIndex < scenarioQueue.length - 1) {
      // Load next scenario
      const nextIndex = currentScenarioIndex + 1;
      const nextScenario = scenarioQueue[nextIndex];

      console.log(`Loading scenario ${nextIndex + 1} of ${scenarioQueue.length}: ${nextScenario}`);

      // Start next scenario (reusing same session)
      const response = await api.startSession(nextScenario);
      setCurrentScenarioIndex(nextIndex);
      setScenarioStartTime(Date.now());
      setCurrentVitals(null);
      setPatientNotes([]);
      setDispatchInfo(response.dispatchInfo);
      setPatientInfo(response.patientInfo);

      if (response.initialSceneDescription) {
        sessionStorage.setItem('initialScene', response.initialSceneDescription);
      }
    } else {
      // ALL 3 SCENARIOS COMPLETED → Transition to AAR (Task 0.2)
      console.log('All scenarios completed! Transitioning to AAR Agent...');

      // Set AAR mode
      setIsAARMode(true);
      setIsActive(false);

      // Initialize AAR Agent
      if (sessionId) {
        const aarResponse = await api.startAAR(sessionId);

        // Clear scenario UI
        setDispatchInfo(null);
        setPatientInfo(null);
        setCurrentVitals(null);

        // Store AAR introduction message for ConversationPanel
        sessionStorage.setItem('aarIntroduction', aarResponse.message);

        console.log('AAR mode activated:', aarResponse);
      }
    }
  };
  
  // ✅ NEW: Handle agent transition (from Cognitive Coach to Core Agent)
  const handleAgentTransition = (newAgent: 'core', scenarioData: any) => {
    console.log('🔄 Transitioning to Core Agent');
    setCurrentAgent(newAgent);

    // Now set all the scenario data that was delayed
    if (scenarioData.dispatchInfo) {
      setDispatchInfo(scenarioData.dispatchInfo);
    }
    if (scenarioData.patientInfo) {
      setPatientInfo(scenarioData.patientInfo);
    }
    if (scenarioData.initialSceneDescription) {
      sessionStorage.setItem('initialScene', scenarioData.initialSceneDescription);
    }

    // Start the timer NOW
    setScenarioStartTime(Date.now());
    setCurrentVitals(scenarioData.initialVitals || null);
    setPatientNotes([]);
  };

  // ✅ NEW: Handle AAR completion
  const handleAARComplete = () => {
    console.log('✅ AAR Complete - showing completion screen');
    setSessionComplete(true);
  };

  // ✅ NEW: Reset session for new training
  const handleResetSession = () => {
    setSessionId(null);
    setIsActive(false);
    setScenarioStartTime(Date.now());
    setCurrentVitals(null);
    setDispatchInfo(null);
    setPatientInfo(null);
    setPatientNotes([]);
    setScenarioQueue([]);
    setCurrentScenarioIndex(0);
    setCompletedScenarios([]);
    setCurrentAgent(null);
    setIsAARMode(false);
    setSessionComplete(false);
    sessionStorage.clear();
  };

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      <Header
        isActive={isActive}
        scenarioStartTime={scenarioStartTime}
        dispatchInfo={dispatchInfo}
        patientInfo={patientInfo}
        onCompleteScenario={handleCompleteScenario}
        currentScenario={currentScenarioIndex + 1}
        totalScenarios={scenarioQueue.length}
        currentAgent={currentAgent}
        isAARMode={isAARMode} // ✅ NEW: Pass isAARMode to Header (Task 0.2)
      />
      {!sessionId ? (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Emergency Medical Training</h2>
            <p className="text-gray-400 mb-8">Practice your paramedic skills in a safe environment</p>
            <button
              onClick={handleStartSession}
              className="px-8 py-4 bg-accent hover:bg-blue-600 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Training Session
            </button>
          </div>
        </div>
      ) : sessionComplete ? (
        <SessionComplete onStartNewSession={handleResetSession} />
      ) : (
        <MainLayout
          sessionId={sessionId}
          currentVitals={currentVitals}
          onVitalsUpdate={setCurrentVitals}
          patientNotes={patientNotes}
          onNotesUpdate={setPatientNotes}
          currentAgent={currentAgent} // ✅ NEW: Pass currentAgent to MainLayout
          onAgentTransition={handleAgentTransition} // ✅ NEW: Pass transition handler
          isAARMode={isAARMode} // ✅ NEW: Pass isAARMode to MainLayout
          onAARComplete={handleAARComplete} // ✅ NEW: Pass AAR completion handler
        />
      )}
    </div>
  );
}

export default App;