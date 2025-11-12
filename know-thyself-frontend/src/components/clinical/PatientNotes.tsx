interface PatientNotesProps {
  notes: string[];
}

export default function PatientNotes({ notes = [] }: PatientNotesProps) {
  return (
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
  );
}