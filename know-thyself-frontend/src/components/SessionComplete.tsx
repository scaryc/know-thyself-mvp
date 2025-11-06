interface SessionCompleteProps {
  onStartNewSession: () => void;
}

function SessionComplete({ onStartNewSession }: SessionCompleteProps) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center max-w-2xl p-8 bg-bg-secondary rounded-lg border border-border">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold mb-4">
          Training Session Complete
        </h2>
        <p className="text-gray-400 mb-8">
          You've completed all 3 emergency scenarios and the After Action Review.
          Great work on your training today!
        </p>

        <div className="space-y-4">
          <button
            onClick={onStartNewSession}
            className="px-8 py-4 bg-accent hover:bg-blue-600 rounded-lg text-lg font-semibold transition-colors"
          >
            Start New Training Session
          </button>

          <div className="text-sm text-gray-500">
            Your performance data has been saved for review.
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionComplete;
