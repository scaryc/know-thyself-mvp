import { useState, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import Header from './components/layout/Header';
import SessionComplete from './components/SessionComplete';
import Registration from './components/Registration';
import { api } from './services/api';
import type { Vitals, DispatchInfo, PatientInfo } from './interfaces';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  // Layer 3: Student registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [scenarioStartTime, setScenarioStartTime] = useState<number>(Date.now());
  const [currentVitals, setCurrentVitals] = useState<Vitals | null>(null);
  const [dispatchInfo, setDispatchInfo] = useState<DispatchInfo | undefined>(undefined);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | undefined>(undefined);    
  const [patientNotes, setPatientNotes] = useState<string[]>([]);
  const [scenarioQueue, setScenarioQueue] = useState<string[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  // Removed: completedScenarios state - was being set but never read/displayed

  // ✅ NEW: Track current agent
  const [currentAgent, setCurrentAgent] = useState<'cognitive_coach' | 'core' | null>(null);

  // ✅ NEW: Track AAR mode (Task 0.2)
  const [isAARMode, setIsAARMode] = useState(false);

  // ✅ NEW: Track session completion
  const [sessionComplete, setSessionComplete] = useState(false);

  // ✅ NEW: Track if we should show the AAR Review button
  const [showAARButton, setShowAARButton] = useState(false);

  // ✅ DEBUG: Log when dispatchInfo or patientInfo changes (disabled - working correctly)
  // useEffect(() => {
  //   console.log('🔄 App.tsx state updated - dispatchInfo:', JSON.stringify(dispatchInfo, null, 2));
  //   console.log('🔄 App.tsx state updated - patientInfo:', JSON.stringify(patientInfo, null, 2));
  //   console.log('🔄 App.tsx state updated - currentAgent:', currentAgent);
  //   console.log('🔄 App.tsx state updated - isActive:', isActive);
  // }, [dispatchInfo, patientInfo, currentAgent, isActive]);

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

              // ✅ Restore patient notes from session
              if (response.patientNotes && response.patientNotes.length > 0) {
                console.log('📋 Restoring patient notes:', response.patientNotes);
                setPatientNotes(response.patientNotes);
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

    // ✅ NEW: Store initial Cognitive Coach message if provided
    if (response.initialMessage) {
      sessionStorage.setItem('cognitiveCoachInitialMessage', response.initialMessage);
      console.log('💾 Stored initial Cognitive Coach message for first scenario');
    }
    
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
    if (!sessionId) return;

    console.log(`📋 Completing scenario ${currentScenarioIndex + 1}...`);
    console.log('📍 Current state before completion:', {
      currentScenarioIndex,
      currentAgent,
      scenarioQueue
    });

    try {
      // Call backend to handle scenario completion and prepare next scenario
      const response = await api.nextScenario(sessionId);

      console.log('✅ Next scenario response:', JSON.stringify(response, null, 2));

      if (response.hasNextScenario) {
        // There's another scenario - load it immediately (NO cognitive coach between scenarios)
        console.log(`🔄 Moving directly to scenario ${response.currentScenarioIndex + 1} of ${response.totalScenarios}`);

        // Validate response has required data
        if (!response.dispatchInfo) {
          console.error('❌ CRITICAL: Response missing dispatchInfo!');
        }
        if (!response.patientInfo) {
          console.error('❌ CRITICAL: Response missing patientInfo!');
        }

        // Clear old scenario data from sessionStorage
        console.log('🗑️ Clearing old scenario data from sessionStorage');
        sessionStorage.removeItem('initialScene');

        // Update frontend state
        console.log('🔧 Setting currentScenarioIndex from', currentScenarioIndex, 'to', response.currentScenarioIndex);
        setCurrentScenarioIndex(response.currentScenarioIndex);

        // Stay in Core Agent mode (cognitive coach only runs once at the start)
        console.log('🔧 Setting currentAgent to core (staying in scenario mode)');
        setCurrentAgent('core');
        setIsActive(true);

        // Update dispatch and patient info for new scenario
        console.log('📊 Updating dispatch info:', response.dispatchInfo);
        setDispatchInfo(response.dispatchInfo);

        console.log('👤 Updating patient info:', response.patientInfo);
        setPatientInfo(response.patientInfo);

        // Reset scenario-specific state
        setCurrentVitals(null);
        setPatientNotes([]);
        setScenarioStartTime(Date.now()); // Reset timer for new scenario

        // Store initial scene for new scenario
        if (response.initialSceneDescription) {
          sessionStorage.setItem('initialScene', response.initialSceneDescription);
        }

        console.log('✅ Transitioned directly to next scenario');
        console.log('📍 New state:', {
          newScenarioIndex: response.currentScenarioIndex,
          scenarioName: response.nextScenarioName,
          hasDispatchInfo: !!response.dispatchInfo,
          hasPatientInfo: !!response.patientInfo
        });

      } else {
        // All scenarios completed - show AAR button
        console.log('🎉 All scenarios completed! Showing AAR Review button...');

        // Clear scenario UI
        setDispatchInfo(undefined);
        setPatientInfo(undefined);
        setCurrentVitals(null);
        setIsActive(false);
        setCurrentAgent(null);

        // Show AAR button
        setShowAARButton(true);
      }

    } catch (error) {
      console.error('❌ Error completing scenario:', error);
    }
  };

  // ✅ NEW: Handle Start AAR Review button click
  const handleStartAAR = async () => {
    console.log('🚀 User clicked Start AAR Review - initializing AAR Agent...');

    // Hide the button
    setShowAARButton(false);

    // Set AAR mode
    setIsAARMode(true);

    // Initialize AAR Agent
    if (sessionId) {
      const aarResponse = await api.startAAR(sessionId);

      // Store AAR introduction message for ConversationPanel
      sessionStorage.setItem('aarIntroduction', aarResponse.message);

      console.log('AAR mode activated:', aarResponse);
    }
  };

  // ✅ NEW: Handle AAR completion
  const handleAARComplete = () => {
    console.log('✅ AAR Complete - showing completion screen');
    setSessionComplete(true);
  };

  // ✅ NEW: Handle Begin Scenario button click
  const handleBeginScenario = async () => {
    if (!sessionId) return;

    console.log('🚀 User clicked Begin Scenario - calling backend...');
    console.log('📍 Current scenario index:', currentScenarioIndex);
    console.log('📍 Scenario queue:', scenarioQueue);

    try {
      // Clear cognitive coach message from storage before transitioning
      sessionStorage.removeItem('cognitiveCoachInitialMessage');

      const response = await api.beginScenario(sessionId);

      console.log('✅ Full API Response:', JSON.stringify(response, null, 2));

      // Validate response has required data
      if (!response.dispatchInfo) {
        console.error('❌ CRITICAL: Response missing dispatchInfo!');
        console.error('Response keys:', Object.keys(response));
      }
      if (!response.patientInfo) {
        console.error('❌ CRITICAL: Response missing patientInfo!');
        console.error('Response keys:', Object.keys(response));
      }

      console.log('📊 Dispatch Info from response:', JSON.stringify(response.dispatchInfo, null, 2));
      console.log('👤 Patient Info from response:', JSON.stringify(response.patientInfo, null, 2));

      // Update all state
      console.log('🔧 Setting currentAgent to core');
      setCurrentAgent('core');

      console.log('🔧 Setting dispatchInfo:', response.dispatchInfo);
      setDispatchInfo(response.dispatchInfo);

      console.log('🔧 Setting patientInfo:', response.patientInfo);
      setPatientInfo(response.patientInfo);

      console.log('🔧 Setting isActive to true');
      setIsActive(true);

      setScenarioStartTime(Date.now());
      setCurrentVitals(null); // Empty until measured
      setPatientNotes([]);

      // Store initial scene in sessionStorage
      if (response.initialSceneDescription) {
        sessionStorage.setItem('initialScene', response.initialSceneDescription);
      }

      console.log('🎬 Transition complete - now in Core Agent mode');
    } catch (error) {
      console.error('❌ Error beginning scenario:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack:', error.stack);
      }
    }
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
    setDispatchInfo(undefined);
    setPatientInfo(undefined);
    setPatientNotes([]);
    setScenarioQueue([]);
    setCurrentScenarioIndex(0);
    setShowAARButton(false); // Reset AAR button state
    sessionStorage.clear();

    // Layer 3: Clear sessionId from localStorage (Feature 2)
    localStorage.removeItem('kt_sessionId');
    console.log('🗑️ Session ID cleared from localStorage');
  };

  // Layer 3: Show registration screen if not registered
  if (!isRegistered) {
    return (
      <LanguageProvider>
        <Registration onRegistrationComplete={handleRegistrationComplete} />
      </LanguageProvider>
    );
  }


  return (
    <LanguageProvider>
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
        <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
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
          onAARComplete={handleAARComplete} // ✅ NEW: Pass AAR completion handler
          isAARMode={isAARMode} // ✅ NEW: Pass isAARMode to MainLayout
          currentScenarioIndex={currentScenarioIndex} // ✅ NEW: Pass scenario index to force chat reset
          onBeginScenario={handleBeginScenario} // ✅ NEW: Pass Begin Scenario handler
          showAARButton={showAARButton} // ✅ NEW: Pass AAR button state
          onStartAAR={handleStartAAR} // ✅ NEW: Pass Start AAR handler
        />
      )}
      </div>
    </LanguageProvider>
  );
}

export default App;