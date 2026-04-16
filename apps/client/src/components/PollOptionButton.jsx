export function PollOptionButton({ option, disabled, isLeading, loading, onVote }) {
  return (
    <button
      className={`option-button ${isLeading ? "option-button--leading" : ""}`}
      disabled={disabled}
      type="button"
      onClick={() => onVote(option.id)}
    >
      <div className="option-button__head">
        <strong>{option.label}</strong>
        {loading ? <span className="status-pill status-pill--neutral">Submitting...</span> : null}
      </div>

      <div className="option-button__meta">
        <span>{option.voteCount} votes</span>
        <span>{option.percentage}%</span>
      </div>
    </button>
  );
}

