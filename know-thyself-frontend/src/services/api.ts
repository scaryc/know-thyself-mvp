import type { StartSessionBody } from '../interfaces';

class ApiService {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  async startSession(scenarioId: string, studentId?: string, scenarioQueue?: string[]) {
    const body: StartSessionBody = { scenarioId };

    // Layer 3: Include studentId if provided (for A/B group auto-configuration)
    if (studentId) {
      body.studentId = studentId;
    }

    // Layer 3: Include scenarioQueue if provided (for session resume - Feature 2)
    if (scenarioQueue) {
      body.scenarioQueue = scenarioQueue;
    }

    const response = await fetch(`${this.baseURL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.json();
  }

  async sendMessage(sessionId: string, message: string) {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return response.json();
  }

  async getVitals(sessionId: string) {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}/vitals`);
      if (!response.ok) {
        console.error('❌ Vitals endpoint failed:', response.status);
        return null;
      }
      const data = await response.json();
      console.log('✅ Vitals polling received:', data);
      return data.raw;
    } catch (error) {
      console.error('❌ Vitals fetch error:', error);
      return null;
    }
  }

  // ✅ NEW: Get session state including vitals (Phase 5, Task 5.3)
  async getSessionState(sessionId: string) {
    try {
      const response = await fetch(`${this.baseURL}/sessions/${sessionId}/state`);
      if (!response.ok) {
        console.error('❌ Session state endpoint failed:', response.status);
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Session state fetch error:', error);
      return null;
    }
  }

  // ✅ NEW: AAR Agent methods (Task 0.2)
  async startAAR(sessionId: string) {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/aar/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  async sendAARMessage(sessionId: string, message: string) {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/aar/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return response.json();
  }

  // ✅ NEW: Begin scenario transition (user clicked button)
  async beginScenario(sessionId: string) {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/begin-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  // ✅ NEW: Move to next scenario (complete current and start next)
  async nextScenario(sessionId: string) {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/next-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  // Layer 3: Session resume (Feature 2)
  async checkSession(sessionId: string) {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/check`);
    return response.json();
  }
}

export const api = new ApiService();