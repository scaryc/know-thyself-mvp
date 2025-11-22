// src/components/layout/Header.tsx
import { useEffect, useState } from 'react';
import type { DispatchInfo, PatientInfo } from '../../interfaces';

interface HeaderProps {
  isActive: boolean;
  scenarioStartTime: number;
  dispatchInfo?: DispatchInfo;
  patientInfo?: PatientInfo;
  onCompleteScenario?: () => void;
  currentScenario?: number;
  totalScenarios?: number;
  currentAgent: 'cognitive_coach' | 'core' | null; // ✅ NEW: Track current agent
  isAARMode?: boolean; // ✅ NEW: Track AAR mode (Task 0.2)
}

function Header({
  isActive,
  scenarioStartTime,
  dispatchInfo,
  patientInfo,
  onCompleteScenario,
  currentScenario,
  totalScenarios,
  currentAgent, // ✅ NEW
  isAARMode = false // ✅ NEW: Default to false (Task 0.2)
}: HeaderProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // ✅ DEBUG: Log props to see what Header receives
  useEffect(() => {
    console.log('🔍 Header props:', {
      currentAgent,
      isActive,
      hasDispatchInfo: !!dispatchInfo,
      hasPatientInfo: !!patientInfo,
      dispatchInfo: JSON.stringify(dispatchInfo, null, 2),
      patientInfo: JSON.stringify(patientInfo, null, 2)
    });
  }, [currentAgent, isActive, dispatchInfo, patientInfo]);

  // Timer logic - runs inside Header (only when in Core Agent mode)
  useEffect(() => {
    // ✅ FIXED: Only run timer when in Core Agent mode
    if (!isActive || currentAgent !== 'core') return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - scenarioStartTime) / 1000);
      setElapsedTime(elapsed);
      
      // Auto-force complete at 20 minutes (1200 seconds)
      if (elapsed >= 1200 && onCompleteScenario) {
        onCompleteScenario();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, scenarioStartTime, onCompleteScenario, currentAgent]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ NEW: AAR mode header (Task 0.3)
  if (isAARMode) {
    return (
      <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-center px-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📊</span>
          <div>
            <div className="font-semibold text-lg">After Action Review</div>
            <div className="text-sm text-gray-400">Performance Analysis Session</div>
          </div>
        </div>
      </header>
    );
  }

  // ✅ NEW: During Cognitive Coach, show minimal header
  if (currentAgent === 'cognitive_coach') {
    return (
      <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-between px-6">
        {/* Left side - App title */}
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🧠</span>
          <div>
            <div className="font-semibold text-white">Know Thyself</div>
            <div className="text-xs text-gray-400">Cognitive Warm-Up Phase</div>
          </div>
        </div>

        {/* Right side - Preparing indicator */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-400">Preparing...</span>
        </div>
      </header>
    );
  }

  // ✅ EXISTING: Normal header for Core Agent mode
  return (
    <header className="h-24 bg-bg-secondary border-b border-border px-6 py-3">
      <div className="flex items-start justify-between h-full">
        {/* Left side - Dispatch Info (expanded to take more space) */}
        <div className="flex items-start space-x-4 flex-1 max-w-3xl">
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-red-500">📍</span>
            <span className="text-sm text-gray-400">DISPATCH</span>
          </div>
          {dispatchInfo ? (
            <div className="text-sm space-y-1 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 font-semibold">{dispatchInfo.timeOfCall || '00:00'}</span>
                <span className="text-gray-400">
                  {dispatchInfo.location || '[NO LOCATION]'}
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">
                  {dispatchInfo.chiefComplaint || '[NO CHIEF COMPLAINT]'}
                </span>
              </div>
              {dispatchInfo.callerInfo && (
                <div className="text-xs text-gray-500 leading-relaxed">
                  {dispatchInfo.callerInfo}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-red-500">
              [Missing dispatch info - check console]
            </div>
          )}
        </div>

        {/* Right side - Patient Info, Timer & Status */}
        <div className="flex items-center space-x-4">
          {/* Patient Info */}
          {patientInfo ? (
            <div className="flex items-center space-x-2 border-r border-gray-700 pr-4">
              <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
              <div>
                <div className="font-semibold text-sm">
                  {patientInfo.name || '[NO NAME]'}
                </div>
                <div className="text-xs text-gray-400">
                  {patientInfo.age || '[NO AGE]'} {patientInfo.gender || '[NO GENDER]'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-500">[Missing patient info]</div>
          )}

          {isActive && (
            <>
              {/* Timer Display */}
              <div className="text-right">
                <div className="text-xs text-gray-400">
                  SCENARIO {currentScenario || 1} of {totalScenarios || 3}
                </div>
                <div className={`text-lg font-mono font-semibold ${elapsedTime >= 600 ? 'text-green-400' : 'text-gray-300'}`}>
                  {formatTime(elapsedTime)} / 20:00
                </div>
              </div>

              {/* Complete Button - Shows after 10 minutes (600 seconds) */}
              {elapsedTime >= 10 && (
                <button
                  onClick={onCompleteScenario}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded flex items-center space-x-2 transition-colors"
                >
                  <span>✓</span>
                  <span>Complete Scenario</span>
                </button>
              )}

              {/* Active Badge */}
              <div className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded">
                ACTIVE
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;