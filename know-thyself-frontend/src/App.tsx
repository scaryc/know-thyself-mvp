import { useState, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import Header from './components/layout/Header';
import SessionComplete from './components/SessionComplete';
import Registration from './components/Registration';
import { api } from './services/api';

function App() {
  // Layer 3: Student registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);

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

  // Layer 3: Check for existing registration and session on mount (Feature 2 - Session Resume)
  useEffect(() => {
    async function checkExistingSession() {
      // Check for existing registration
      const savedStudentId = localStorage.getItem('kt_studentId');
      const savedStudentName = localStorage.getItem('kt_studentName');
      const savedGroup = localStorage.getItem('kt_group');
      const savedSessionId = localStorage.getItem('kt_sessionId');

      if (!savedStudentId || !savedStudentName || !savedGroup) {
        // No registration - will show registration screen
        return;
      }

      // Registration exists
      console.log(`👤 Existing student found: ${savedStudentName} (Group ${savedGroup})`);
      setStudentId(savedStudentId);
      setStudentName(savedStudentName);
      setGroup(savedGroup);
      setIsRegistered(true);

      // Check if there's an active session to resume
      if (savedSessionId) {
        try {
          console.log(`🔍 Checking for existing session: ${savedSessionId}`);
          const response = await api.checkSession(savedSessionId);

          if (response.exists && !response.complete) {
            // Session exists and is active - RESUME IT
            console.log('✅ Resuming existing session');
            console.log(`📍 Resume state: ${response.currentAgent}, Scenario ${response.currentScenarioIndex + 1}`);

            setSessionId(savedSessionId);
            setIsActive(!response.isAARMode); // Active if not in AAR mode
            setCurrentAgent(response.currentAgent);
            setCurrentScenarioIndex(response.currentScenarioIndex);
            setScenarioQueue(response.scenarioQueue);
            setCompletedScenarios(response.completedScenarios);
            setIsAARMode(response.isAARMode);

            // Restore scenario data if in core agent mode
            if (response.dispatchInfo) {
              setDispatchInfo(response.dispatchInfo);
            }
            if (response.patientInfo) {
              setPatientInfo(response.patientInfo);
            }

            // Fetch current vitals if in core agent mode
            if (response.currentAgent === 'core') {
              try {
                const vitals = await api.getVitals(savedSessionId);
                setCurrentVitals(vitals);
              } catch (error) {
                console.warn('Could not fetch vitals:', error);
              }
            }

          } else if (response.complete) {
            // Session was completed - show completion screen
            console.log('✅ Session already completed');
            setSessionId(savedSessionId);
            setSessionComplete(true);

          } else {
            // Session not found (server restarted?) - clear session data
            console.log('⚠️ Session not found on server, clearing session from localStorage');
            localStorage.removeItem('kt_sessionId');
          }

        } catch (error) {
          // Server error or session not found
          console.error('❌ Session check failed:', error);
          localStorage.removeItem('kt_sessionId');
        }
      }
    }

    checkExistingSession();
  }, []);

  // Layer 3: Handle registration completion
  const handleRegistrationComplete = (newStudentId: string, newGroup: string, newStudentName: string) => {
    console.log(`✅ Registration complete: ${newStudentName} (${newStudentId}, Group ${newGroup})`);
    setStudentId(newStudentId);
    setStudentName(newStudentName);
    setGroup(newGroup);
    setIsRegistered(true);
  };


  const handleStartSession = async () => {
    // Define all available scenarios (matching actual scenario filenames without .json)
    const allScenarios = [
      'asthma_patient_v2.0_final',
      'stemi_patient_v2_0_final',
      'status_epilepticus_patient_v2_0_final',
      'tbi_patient_v2_0_final'
    ];
    const shuffled = [...allScenarios].sort(() => Math.random() - 0.5);
    const selectedScenarios = shuffled.slice(0, 3); // Pick 3 random scenarios

    setScenarioQueue(selectedScenarios);
    setCurrentScenarioIndex(0);
    setCompletedScenarios([]);

    console.log('Selected scenarios for this session:', selectedScenarios);

    // Layer 3: Start first scenario with student ID and scenario queue
    const response = await api.startSession(
      selectedScenarios[0],
      studentId || undefined,
      selectedScenarios  // Pass full scenario queue for session tracking
    );
    console.log('Backend response:', response);

    setSessionId(response.sessionId);
    setIsActive(true);

    // Layer 3: Store sessionId in localStorage for session resume (Feature 2)
    localStorage.setItem('kt_sessionId', response.sessionId);
    console.log('💾 Session ID stored in localStorage for resume capability');
    
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
    setIsAARMode(false);
    setSessionComplete(false);
    setCurrentAgent(null);
    setCurrentVitals(null);
    setDispatchInfo(null);
    setPatientInfo(null);
    setPatientNotes([]);
    setScenarioQueue([]);
    setCurrentScenarioIndex(0);
    setCompletedScenarios([]);
    sessionStorage.clear();

    // Layer 3: Clear sessionId from localStorage (Feature 2)
    localStorage.removeItem('kt_sessionId');
    console.log('🗑️ Session ID cleared from localStorage');
  };

  // Layer 3: Show registration screen if not registered
  if (!isRegistered) {
    return <Registration onRegistrationComplete={handleRegistrationComplete} />;
  }


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
      {sessionComplete ? (
        <SessionComplete onStartNewSession={handleResetSession} />
      ) : !sessionId ? (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Emergency Medical Training</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Welcome, {studentName}! You're in Group {group}.<br />
              Practice your paramedic skills in a safe environment.
            </p>
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
          onAARComplete={handleAARComplete} // ✅ NEW: Pass AAR completion handler
          isAARMode={isAARMode} // ✅ NEW: Pass isAARMode to MainLayout
        />
      )}
    </div>
  );
}

export default App;