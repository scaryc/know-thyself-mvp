interface PatientNotesProps {
  notes: string[];
  completedMilestones?: Array<{
    id: string;
    name: string;
    description: string;
    timestampFormatted: string;
  }>;
}

export default function PatientNotes({ notes = [], completedMilestones = [] }: PatientNotesProps) {
  return (
    <div className="space-y-6">
      {/* V3.0: Progress Tracker - Progressive Reveal */}
      {completedMilestones && completedMilestones.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            ✓ Progress
          </h3>
          <div className="space-y-2">
            {completedMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="bg-green-900/20 rounded-lg p-3 border border-green-700/30 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-green-400 font-semibold text-lg leading-none mt-0.5">✓</span>
                    <div className="flex-1">
                      <div className="text-green-300 font-medium">{milestone.name}</div>
                      <div className="text-green-400/70 text-xs mt-0.5">{milestone.description}</div>
                    </div>
                  </div>
                  <div className="text-green-400/60 text-xs font-mono whitespace-nowrap">
                    {milestone.timestampFormatted}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          📋 Clinical Notes
        </h3>

        {!notes || notes.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm italic">
            Clinical notes will appear here as you gather patient information
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note, index) => (
              <div
                key={index}
                className="bg-bg-tertiary rounded-lg p-3 border border-border text-sm text-gray-300"
              >
                <span className="text-accent font-semibold mr-2">•</span>
                {note}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}