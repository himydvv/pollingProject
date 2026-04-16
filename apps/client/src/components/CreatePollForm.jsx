import { useState } from "react";

import { POLL_RULES } from "@polling-app/shared";

const INITIAL_OPTIONS = ["", ""];

function createInitialState() {
  return {
    question: "",
    description: "",
    durationMinutes: POLL_RULES.DEFAULT_DURATION_MINUTES,
    options: INITIAL_OPTIONS
  };
}

export function CreatePollForm({ disabled, onSubmit }) {
  const [formState, setFormState] = useState(createInitialState);
  const [formError, setFormError] = useState("");

  function updateField(fieldName, value) {
    setFormState((currentState) => ({
      ...currentState,
      [fieldName]: value
    }));
  }

  function updateOption(index, value) {
    setFormState((currentState) => ({
      ...currentState,
      options: currentState.options.map((option, optionIndex) => {
        return optionIndex === index ? value : option;
      })
    }));
  }

  function addOption() {
    setFormState((currentState) => {
      if (currentState.options.length >= POLL_RULES.MAX_OPTIONS) {
        return currentState;
      }

      return {
        ...currentState,
        options: [...currentState.options, ""]
      };
    });
  }

  function removeOption(index) {
    setFormState((currentState) => {
      if (currentState.options.length <= POLL_RULES.MIN_OPTIONS) {
        return currentState;
      }

      return {
        ...currentState,
        options: currentState.options.filter((option, optionIndex) => optionIndex !== index)
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      question: formState.question.trim(),
      description: formState.description.trim(),
      durationMinutes: Number(formState.durationMinutes),
      options: formState.options.map((option) => option.trim()).filter(Boolean)
    };

    if (payload.question.length < POLL_RULES.MIN_QUESTION_LENGTH) {
      setFormError(`Question must be at least ${POLL_RULES.MIN_QUESTION_LENGTH} characters.`);
      return;
    }

    if (payload.options.length < POLL_RULES.MIN_OPTIONS) {
      setFormError(`At least ${POLL_RULES.MIN_OPTIONS} non-empty options are required.`);
      return;
    }

    setFormError("");
    await onSubmit(payload);
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel__header">
        <div>
          <p className="eyebrow">Create poll</p>
          <h2>Start a live voting room</h2>
        </div>
        <span className="status-pill status-pill--neutral">Backend validated</span>
      </div>

      <label className="field">
        <span>Question</span>
        <textarea
          maxLength={POLL_RULES.MAX_QUESTION_LENGTH}
          placeholder="Which frontend state approach should our team standardize on this quarter?"
          rows={3}
          value={formState.question}
          onChange={(event) => updateField("question", event.target.value)}
        />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          maxLength={POLL_RULES.MAX_DESCRIPTION_LENGTH}
          placeholder="Add optional context for interview demos, classrooms, or quick team decisions."
          rows={2}
          value={formState.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
      </label>

      <label className="field">
        <span>Duration in minutes</span>
        <input
          max={POLL_RULES.MAX_DURATION_MINUTES}
          min={POLL_RULES.MIN_DURATION_MINUTES}
          type="number"
          value={formState.durationMinutes}
          onChange={(event) => updateField("durationMinutes", event.target.value)}
        />
      </label>

      <div className="field">
        <div className="field__head">
          <span>Options</span>
          <button
            className="ghost-button"
            disabled={disabled || formState.options.length >= POLL_RULES.MAX_OPTIONS}
            type="button"
            onClick={addOption}
          >
            Add option
          </button>
        </div>

        <div className="option-input-list">
          {formState.options.map((option, index) => (
            <div className="option-input-row" key={`option-${index + 1}`}>
              <input
                maxLength={POLL_RULES.MAX_OPTION_LENGTH}
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(event) => updateOption(index, event.target.value)}
              />

              <button
                className="ghost-button"
                disabled={disabled || formState.options.length <= POLL_RULES.MIN_OPTIONS}
                type="button"
                onClick={() => removeOption(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {formError ? <p className="form-error">{formError}</p> : null}

      <button className="primary-button" disabled={disabled} type="submit">
        {disabled ? "Preparing room..." : "Create poll room"}
      </button>
    </form>
  );
}
