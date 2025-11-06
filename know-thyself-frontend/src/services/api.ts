class ApiService {
  private baseURL = 'http://localhost:3001/api';

  async startSession(scenarioId: string, studentId?: string) {
    const body: any = { scenarioId };

    // Layer 3: Include studentId if provided (for A/B group auto-configuration)
    if (studentId) {
      body.studentId = studentId;
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
}

export const api = new ApiService();