import { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface Vitals {
  HR: number;
  RR: number;
  SpO2: number;
  BP: string;
  Temp: number;
  GCS: number;
  Glycemia: number;
}

interface VitalsMonitorProps {
  vitals: Vitals | null;
  sessionId?: string;
  isAARMode?: boolean;
  onVitalsUpdate?: (vitals: Vitals) => void;
}

function VitalsMonitor({ vitals: initialVitals, sessionId, isAARMode = false, onVitalsUpdate }: VitalsMonitorProps) {
  const [vitals, setVitals] = useState<Vitals | null>(initialVitals);

  // Update vitals when prop changes
  useEffect(() => {
    setVitals(initialVitals);
  }, [initialVitals]);

  // Poll vitals every 5 seconds (only during Core Agent mode, not during AAR)
  useEffect(() => {
    if (!sessionId || isAARMode) return;

    const interval = setInterval(async () => {
      try {
        const updatedVitals = await api.getVitals(sessionId);
        if (updatedVitals) {
          setVitals(updatedVitals);
          if (onVitalsUpdate) {
            onVitalsUpdate(updatedVitals);
          }
        }
      } catch (error) {
        console.error('Vitals polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [sessionId, isAARMode, onVitalsUpdate]);

  const getAlertColor = (value: number, normal: [number, number]): string => {
    if (value < normal[0] * 0.8 || value > normal[1] * 1.2) return 'text-critical';
    if (value < normal[0] || value > normal[1]) return 'text-warning';
    return 'text-normal';
  };

  const getAlertBg = (value: number, normal: [number, number]): string => {
    if (value < normal[0] * 0.8 || value > normal[1] * 1.2) return 'bg-critical/10';
    if (value < normal[0] || value > normal[1]) return 'bg-warning/10';
    return 'bg-normal/10';
  };

  return (
    <div className="bg-bg-secondary border-b border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          ◆ Vital Signs Monitor ◆
        </h2>
      </div>
      
      {/* Primary Vitals - HR, RR, BP */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Heart Rate with ECG */}
        <div className={`bg-bg-tertiary rounded-lg p-3 border-l-4 border-critical ${getAlertBg(vitals?.HR ?? 0, [60, 100])}`}>
          <div className="flex justify-between items-start mb-1">
            <div className="text-xs text-gray-400 font-semibold">HR</div>
            <div className="text-[10px] bg-critical text-white px-2 py-0.5 rounded">TACHY</div>
          </div>
          <div className={`text-3xl font-bold font-mono ${getAlertColor(vitals?.HR ?? 0, [60, 100])} mb-2`}>
            {vitals?.HR ?? '---'}
            <span className="text-sm ml-1 text-gray-400">bpm</span>
          </div>
          {/* ECG Wave */}
          <svg className="w-full h-8" viewBox="0 0 200 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              d="M0,20 L40,20 L42,20 L44,5 L46,35 L48,20 L50,20 L90,20 L92,20 L94,5 L96,35 L98,20 L100,20 L140,20 L142,20 L144,5 L146,35 L148,20 L150,20 L200,20"
              fill="none"
              stroke="url(#ecgGradient)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to="-50 0"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </div>

        {/* Respiratory Rate with Wave */}
        <div className={`bg-bg-tertiary rounded-lg p-3 border-l-4 border-warning ${getAlertBg(vitals?.RR ?? 0, [12, 20])}`}>
          <div className="flex justify-between items-start mb-1">
            <div className="text-xs text-gray-400 font-semibold">RR</div>
            <div className="text-[10px] bg-warning text-black px-2 py-0.5 rounded font-semibold">TACHY</div>
          </div>
          <div className={`text-3xl font-bold font-mono ${getAlertColor(vitals?.RR ?? 0, [12, 20])} mb-2`}>
            {vitals?.RR ?? '---'}
            <span className="text-sm ml-1 text-gray-400">/min</span>
          </div>
          {/* Respiratory Wave */}
          <svg className="w-full h-8" viewBox="0 0 200 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="respGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              d="M0,30 Q10,5 20,30 T40,30 Q50,5 60,30 T80,30 Q90,5 100,30 T120,30 Q130,5 140,30 T160,30 Q170,5 180,30 T200,30"
              fill="none"
              stroke="url(#respGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to="-40 0"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </div>

        {/* Blood Pressure */}
        <div className="bg-bg-tertiary rounded-lg p-3 border-l-4 border-warning">
          <div className="flex justify-between items-start mb-1">
            <div className="text-xs text-gray-400 font-semibold">BP</div>
            <div className="text-[10px] bg-warning text-black px-2 py-0.5 rounded font-semibold">HIGH</div>
          </div>
          <div className="text-3xl font-bold font-mono text-warning mb-2">
            {vitals?.BP ?? '---'}
            <span className="text-sm ml-1 text-gray-400">mmHg</span>
          </div>
          <div className="h-8 flex items-center justify-center text-xs text-gray-500">
            Hypertensive
          </div>
        </div>
      </div>

      {/* Secondary Vitals Grid - SpO2, Temp, GCS, Glucose */}
      <div className="grid grid-cols-4 gap-2">
        {/* SpO2 with Pulse Wave */}
        <div className={`bg-bg-tertiary rounded p-3 text-center border-l-2 border-critical ${getAlertBg(vitals?.SpO2 ?? 0, [95, 100])}`}>
          <div className="flex justify-between items-center mb-1">
            <div className="text-[10px] text-gray-500 uppercase">SpO₂</div>
            <div className="text-[8px] bg-critical/70 text-white px-1.5 py-0.5 rounded">LOW</div>
          </div>
          <div className={`text-2xl font-bold font-mono ${getAlertColor(vitals?.SpO2 ?? 0, [95, 100])} mb-1`}>
            {vitals?.SpO2 ?? '---'}
            <span className="text-xs ml-1 text-gray-400">%</span>
          </div>
          {/* Mini Pulse Wave */}
          <svg className="w-full h-4" viewBox="0 0 100 20" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pulseGradientSmall" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d="M0,18 L8,18 Q10,13 12,8 Q14,3 16,8 Q18,13 20,18 L28,18 Q30,13 32,8 Q34,3 36,8 Q38,13 40,18 L48,18 Q50,13 52,8 Q54,3 56,8 Q58,13 60,18 L68,18 Q70,13 72,8 Q74,3 76,8 Q78,13 80,18 L100,18"
              fill="none"
              stroke="url(#pulseGradientSmall)"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0 0"
                to="-20 0"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </div>

        <div className="bg-bg-tertiary rounded p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase mb-1 flex items-center justify-center gap-1">
            <span>🌡️</span> Temp
          </div>
          <div className="text-2xl font-mono font-bold text-normal">{vitals?.Temp ?? '---'}</div>
          <div className="text-[9px] text-gray-500">°C</div>
        </div>

        <div className="bg-bg-tertiary rounded p-3 text-center border-l-2 border-warning">
          <div className="text-[10px] text-gray-500 uppercase mb-1 flex items-center justify-center gap-1">
            <span>🧠</span> GCS
          </div>
          <div className="text-2xl font-mono font-bold text-warning">{vitals?.GCS ?? '---'}</div>
          <div className="text-[9px] text-gray-500">E4 V4 M6</div>
        </div>

        <div className="bg-bg-tertiary rounded p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase mb-1 flex items-center justify-center gap-1">
            <span>🩸</span> Glucose
          </div>
          <div className="text-2xl font-mono font-bold text-normal">{vitals?.Glycemia ?? '---'}</div>
          <div className="text-[9px] text-gray-500">mmol/L</div>
        </div>
      </div>
    </div>
  );
}

export default VitalsMonitor;