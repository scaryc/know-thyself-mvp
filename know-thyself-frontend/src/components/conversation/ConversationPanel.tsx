import { api } from '../../services/api';
import { useState, useEffect, useRef } from 'react';
import type { Vitals } from '../../interfaces';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isChallenge?: boolean;
}

interface ConversationPanelProps {
  sessionId: string;
  onVitalsUpdate: (vitals: Vitals) => void;
  onNotesUpdate: (notes: string[]) => void;
  currentAgent: 'cognitive_coach' | 'core' | null;
  isAARMode?: boolean;
  onAARComplete?: () => void;
  onBeginScenario?: () => void; // ✅ NEW: Callback for Begin Scenario button
  showAARButton?: boolean; // ✅ NEW: Show AAR Review button
  onStartAAR?: () => void; // ✅ NEW: Callback for Start AAR button
}

function ConversationPanel({
  sessionId,
  onVitalsUpdate,
  onNotesUpdate,
  currentAgent,
  isAARMode = false,
  onAARComplete,
  onBeginScenario,
  showAARButton = false,
  onStartAAR
}: ConversationPanelProps) {
  // ✅ FIXED: Start with empty messages - don't pre-fill from sessionStorage
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // ✅ NEW: Error state
  const [showBeginButton, setShowBeginButton] = useState(false); // ✅ NEW: Show transition button
  const initialSceneAddedRef = useRef(false); // ✅ NEW: Track if initial scene added
  const cognitiveCoachInitialAddedRef = useRef(false); // ✅ NEW: Track if cognitive coach initial message added
  const aarIntroAddedRef = useRef(false); // ✅ NEW: Track if AAR intro added

  // ✅ DEBUG: Track component mount/unmount
  useEffect(() => {
    console.log('🎬 ConversationPanel MOUNTED - currentAgent:', currentAgent, 'isAARMode:', isAARMode);
    return () => {
      console.log('💀 ConversationPanel UNMOUNTED - currentAgent was:', currentAgent);
    };
  }, []); // Empty dependency array = runs only on mount/unmount

  // ✅ NEW: Add initial Cognitive Coach message when component mounts in cognitive_coach mode
  useEffect(() => {
    console.log('🔍 ConversationPanel useEffect - Cognitive Coach check:', {
      currentAgent,
      messagesLength: messages.length,
      refCurrent: cognitiveCoachInitialAddedRef.current
    });

    if (currentAgent === 'cognitive_coach' && messages.length === 0 && !cognitiveCoachInitialAddedRef.current) {
      const initialMessage = sessionStorage.getItem('cognitiveCoachInitialMessage');
      console.log('🔍 Checking sessionStorage for cognitive coach message:', {
        hasMessage: !!initialMessage,
        messagePreview: initialMessage ? initialMessage.substring(0, 100) + '...' : 'null'
      });

      if (initialMessage) {
        console.log('📝 Adding initial Cognitive Coach message to chat');
        setMessages([{
          role: 'assistant',
          content: initialMessage,
          timestamp: Date.now()
        }]);
        cognitiveCoachInitialAddedRef.current = true;
        // Clean up after using it
        console.log('🗑️ Removing cognitive coach message from sessionStorage after adding to chat');
        sessionStorage.removeItem('cognitiveCoachInitialMessage');
      } else {
        console.warn('⚠️ No cognitive coach initial message found in sessionStorage!');
      }
    }
    // Reset flag when switching away from Cognitive Coach
    if (currentAgent !== 'cognitive_coach') {
      console.log('🔄 Resetting cognitiveCoachInitialAddedRef because agent changed to:', currentAgent);
      cognitiveCoachInitialAddedRef.current = false;
    }
  }, [currentAgent, messages.length]);

  // ✅ NEW: Add initial scene when transitioning to Core Agent
  useEffect(() => {
    if (currentAgent === 'core' && messages.length === 0 && !initialSceneAddedRef.current) {
      const initialScene = sessionStorage.getItem('initialScene');
      if (initialScene) {
        console.log('📝 Adding initial scene to Core Agent chat');
        setMessages([{
          role: 'assistant',
          content: initialScene,
          timestamp: Date.now()
        }]);
        initialSceneAddedRef.current = true;
      }
    }
    // Reset flag when switching away from Core Agent
    if (currentAgent !== 'core') {
      initialSceneAddedRef.current = false;
    }
  }, [currentAgent, messages.length]);

  // ✅ NEW: Add AAR introduction message when entering AAR mode
  useEffect(() => {
    console.log('🔍 ConversationPanel useEffect - AAR check:', {
      isAARMode,
      messagesLength: messages.length,
      refCurrent: aarIntroAddedRef.current
    });

    if (isAARMode && messages.length === 0 && !aarIntroAddedRef.current) {
      const aarIntroduction = sessionStorage.getItem('aarIntroduction');
      console.log('🔍 Checking sessionStorage for AAR message:', {
        hasMessage: !!aarIntroduction,
        messagePreview: aarIntroduction ? aarIntroduction.substring(0, 100) + '...' : 'null'
      });

      if (aarIntroduction) {
        console.log('📊 Adding AAR introduction to chat');
        setMessages([{
          role: 'assistant',
          content: aarIntroduction,
          timestamp: Date.now()
        }]);
        aarIntroAddedRef.current = true;
        // Clean up after using it
        console.log('🗑️ Removing AAR message from sessionStorage after adding to chat');
        sessionStorage.removeItem('aarIntroduction');
      } else {
        console.warn('⚠️ No AAR introduction message found in sessionStorage!');
      }
    }
    // Reset flag when switching away from AAR mode
    if (!isAARMode) {
      console.log('🔄 Resetting aarIntroAddedRef because AAR mode ended');
      aarIntroAddedRef.current = false;
    }
  }, [isAARMode, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response;

      // Check if in AAR mode
      if (isAARMode) {
        response = await api.sendAARMessage(sessionId, input);

        const aiResponse: Message = {
          role: 'assistant',
          content: response.message,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiResponse]);

        // Check if AAR completed
        if (response.aarComplete) {
          console.log('✅ AAR session complete');
          if (onAARComplete) {
            onAARComplete();
          }
        }
      } else {
        // Normal Core Agent or Cognitive Coach message
        response = await api.sendMessage(sessionId, input);

        console.log('📥 Frontend received:', response);

        // ✅ NEW: Check if Cognitive Coach is ready to transition
        if (response.readyToTransition) {
          console.log('🔘 Cognitive Coach ready - showing Begin Scenario button');
          setShowBeginButton(true);
        }

        // Check if this is a challenge point
        const isChallenge = response.isChallenge || false;

        // Add the assistant's message (no special handling needed)
        const aiResponse: Message = {
          role: 'assistant',
          content: response.message,
          timestamp: Date.now(),
          isChallenge: isChallenge
        };
        setMessages(prev => [...prev, aiResponse]);

        // Update vitals through parent callback (only in Core Agent mode)
        if (response.vitalsUpdated && response.vitals) {
          console.log('✅ Vitals updated in response:', response.vitals);
          onVitalsUpdate(response.vitals);
        }

        // Update notes through parent callback (only in Core Agent mode)
        if (response.infoUpdated && response.patientNotes) {
          console.log('✅ Calling onNotesUpdate with:', response.patientNotes);
          onNotesUpdate(response.patientNotes);
        }
      }

      // ✅ NEW: Check for AAR completion (Phase 5, Task 5.2)
      if (response.aarComplete && onAARComplete) {
        console.log('🎉 AAR completed - triggering session complete');
        onAARComplete();
      }

      // Clear any previous errors on successful response
      setError(null);
    } catch (error: any) {
      console.error('Failed to send message:', error);

      // Set user-friendly error message
      const errorMessage = error.message || 'Failed to send message. Please try again.';
      setError(errorMessage);

      // Auto-clear error after 10 seconds
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsLoading(false);
    }
  };
     
  return (
    <div className="flex flex-col h-full bg-bg-tertiary">
      {/* ✅ NEW: Show different header based on current agent */}
      {currentAgent === 'cognitive_coach' && (
        <div className="bg-blue-900 border-b border-blue-700 px-6 py-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🧠</span>
            <div>
              <div className="font-semibold text-white">Cognitive Warm-Up</div>
              <div className="text-xs text-blue-300">Preparing your clinical reasoning</div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: AAR mode header */}
      {isAARMode && (
        <div className="bg-green-900 border-b border-green-700 px-6 py-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📊</span>
            <div>
              <div className="font-semibold text-white">After Action Review</div>
              <div className="text-xs text-green-300">Reflecting on your performance</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-4 rounded-lg ${
              msg.role === 'user'
                ? 'bg-accent text-white'
                : msg.role === 'system'
                ? 'bg-green-900 text-green-100 border border-green-700'
                : msg.isChallenge
                ? 'bg-yellow-900 text-yellow-100 border-2 border-yellow-600'
                : 'bg-bg-secondary text-gray-300'
            }`}>
              {msg.isChallenge && (
                <div className="flex items-center space-x-2 mb-2 text-yellow-300">
                  <span>💭</span>
                  <span className="text-xs font-semibold">CHALLENGE QUESTION</span>
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-bg-secondary text-gray-400 p-4 rounded-lg">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}

        {/* ✅ NEW: Begin Scenario Button Overlay */}
        {showBeginButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
            <div className="bg-bg-secondary border-2 border-accent rounded-lg p-8 shadow-2xl text-center max-w-md">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold mb-2">Ready to Begin</h3>
              <p className="text-gray-400 mb-6">Click the button below to start your scenario training</p>
              <button
                onClick={() => {
                  setShowBeginButton(false); // Hide button immediately
                  if (onBeginScenario) {
                    onBeginScenario();
                  }
                }}
                className="px-8 py-4 bg-accent hover:bg-blue-600 text-white text-lg font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Begin Scenario
              </button>
            </div>
          </div>
        )}

        {/* ✅ NEW: Start AAR Review Button Overlay */}
        {showAARButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
            <div className="bg-bg-secondary border-2 border-green-500 rounded-lg p-8 shadow-2xl text-center max-w-md">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold mb-2">All Scenarios Complete!</h3>
              <p className="text-gray-400 mb-6">Click the button below to start your After Action Review and reflect on your performance</p>
              <button
                onClick={onStartAAR}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Start AAR Review
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ NEW: Error banner */}
      {error && (
        <div className="border-t border-red-500 bg-red-900 bg-opacity-20 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-red-500 text-xl">⚠️</span>
              <span className="text-red-300 text-sm">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-border p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              currentAgent === 'cognitive_coach'
                ? "Share your thinking..."
                : isAARMode
                ? "Reflect on your performance..."
                : "Type your message or question..."
            }
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent text-white placeholder-gray-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-6 py-3 bg-accent hover:bg-blue-600 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConversationPanel;