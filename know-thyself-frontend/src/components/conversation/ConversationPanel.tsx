import { api } from '../../services/api';
import { useState, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isChallenge?: boolean;
}

interface ConversationPanelProps {
  sessionId: string;
  onVitalsUpdate: (vitals: any) => void;
  onNotesUpdate: (notes: string[]) => void;
  currentAgent: 'cognitive_coach' | 'core' | null;
  onAgentTransition: (newAgent: 'core', scenarioData: any) => void;
  isAARMode?: boolean;
  onAARComplete?: () => void;
}

function ConversationPanel({
  sessionId,
  onVitalsUpdate,
  onNotesUpdate,
  currentAgent,
  onAgentTransition,
  isAARMode = false,
  onAARComplete
}: ConversationPanelProps) {
  // ✅ FIXED: Start with empty messages - don't pre-fill from sessionStorage
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState(false);
  
  // ✅ NEW: Add initial scene when transitioning to Core Agent
  useEffect(() => {
    if (currentAgent === 'core' && messages.length > 0) {
      // Check if we need to add the scene description
      const hasSceneDescription = messages.some(msg => 
        msg.content.includes('You arrive') || msg.role === 'system'
      );
      
      if (!hasSceneDescription) {
        const sceneDescription = sessionStorage.getItem('initialScene');
        if (sceneDescription) {
          setMessages(prev => [
            ...prev,
            {
              role: 'system',
              content: sceneDescription,
              timestamp: Date.now()
            }
          ]);
        }
      }
    }
  }, [currentAgent]);

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

        // Check if this is a challenge point
        const isChallenge = response.isChallenge || false;
        if (isChallenge) {
          setActiveChallenge(true);
        } else if (response.challengeResolved) {
          setActiveChallenge(false);
        }

        const aiResponse: Message = {
          role: 'assistant',
          content: response.message,
          timestamp: Date.now(),
          isChallenge: isChallenge
        };
        setMessages(prev => [...prev, aiResponse]);

        // ✅ NEW: Handle agent transition
        if (response.transitioned && response.currentAgent === 'core') {
          console.log('🎬 Transition detected - switching to Core Agent');

          // Notify parent to update agent state and scenario data
          onAgentTransition('core', {
            dispatchInfo: response.dispatchInfo,
            patientInfo: response.patientInfo,
            initialSceneDescription: response.initialSceneDescription,
            initialVitals: response.initialVitals,
            scenario: response.scenario
          });
        }

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
    } catch (error) {
      console.error('Failed to send message:', error);
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
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
      </div>

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