import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RegistrationProps {
  onRegistrationComplete: (studentId: string, group: string, studentName: string) => void;
}

function Registration({ onRegistrationComplete }: RegistrationProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!name || name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }

    if (name.length > 100) {
      setError('Name must be less than 100 characters');
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(name)) {
      setError('Name must contain only letters and spaces');
      return;
    }

    if (!email || email.trim().length === 0) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!consent) {
      setError('You must consent to data collection to participate');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/student/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          consent: consent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (data.success) {
        // Store in localStorage for session resume
        localStorage.setItem('kt_studentId', data.studentId);
        localStorage.setItem('kt_studentName', name.trim());
        localStorage.setItem('kt_group', data.group);

        // Notify parent component
        onRegistrationComplete(data.studentId, data.group, name.trim());
      } else {
        setError('Registration failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Unable to connect to server. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary p-4">
      <div className="w-full max-w-md p-8 bg-bg-secondary rounded-lg border border-border shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏥</div>
          <h1 className="text-3xl font-bold mb-2 text-white">KNOW THYSELF MVP</h1>
          <p className="text-gray-400">Paramedic Training Simulation</p>
        </div>

        <hr className="border-border mb-6" />

        {/* Welcome Message */}
        <p className="text-center mb-6 text-gray-300">
          Welcome! Please enter your information to begin:
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-200 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-white">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alice Smith"
              className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-white placeholder-gray-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., alice@example.com"
              className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-white placeholder-gray-500"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 mr-3 w-4 h-4 accent-accent"
              disabled={isSubmitting}
            />
            <label htmlFor="consent" className="text-sm text-gray-300">
              I consent to data collection for research purposes
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-accent hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {isSubmitting ? 'Registering...' : 'Start Training'}
          </button>
        </form>

        {/* Information Note */}
        <div className="mt-6 p-4 bg-bg-primary rounded-lg border border-border">
          <p className="text-xs text-gray-400 text-center">
            <strong>Note:</strong> Training takes 60-90 minutes. If your browser crashes, you can resume where you left off.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Registration;
