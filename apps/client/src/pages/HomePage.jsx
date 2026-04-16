import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { POLL_RULES } from "@polling-app/shared";

import { CreatePollForm } from "../components/CreatePollForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { createPollRequest, getPollByShareCodeRequest } from "../lib/api.js";

export function HomePage() {
  const navigate = useNavigate();
  const { authError, getAccessToken, isLoading } = useAuth();
  const [busyAction, setBusyAction] = useState("");
  const [pageError, setPageError] = useState("");
  const [shareCode, setShareCode] = useState("");

  async function handleCreatePoll(payload) {
    try {
      setBusyAction("create");
      setPageError("");
      const accessToken = await getAccessToken();
      const response = await createPollRequest(payload, accessToken);
      navigate(`/poll/${response.poll.id}`);
    } catch (error) {
      setPageError(error.message || "Unable to create the poll.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleJoinPoll(event) {
    event.preventDefault();

    try {
      setBusyAction("join");
      setPageError("");
      const accessToken = await getAccessToken();
      const response = await getPollByShareCodeRequest(shareCode.trim().toUpperCase(), accessToken);
      navigate(`/poll/${response.poll.id}`);
    } catch (error) {
      setPageError(error.message || "Unable to join the poll room.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <section className="hero-grid">
      <article className="hero panel panel--hero">
        <p className="eyebrow">Interview project direction</p>
        <h2>Build a room that feels like a live decision dashboard, not a CRUD form.</h2>
        <p className="hero__body">
          This monorepo keeps the story clean: React renders a live board, Node and Socket.IO
          stream updates, Redis protects the vote path, and Supabase handles auth plus durable
          poll metadata.
        </p>

        <div className="hero__pillars">
          <article className="feature-card">
            <strong>Atomic vote path</strong>
            <span>Redis set plus hash mutation happens on the server, not in the browser.</span>
          </article>
          <article className="feature-card">
            <strong>Temporary live sessions</strong>
            <span>TTL-backed poll rooms naturally expire and simplify cleanup.</span>
          </article>
          <article className="feature-card">
            <strong>Interview-safe boundaries</strong>
            <span>Client asks, server decides, Redis accelerates, Supabase persists.</span>
          </article>
        </div>
      </article>

      <CreatePollForm disabled={isLoading || busyAction === "create"} onSubmit={handleCreatePoll} />

      <article className="panel join-panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Join room</p>
            <h2>Open an existing poll by share code</h2>
          </div>
          <span className="status-pill status-pill--neutral">6 characters</span>
        </div>

        <form className="join-form" onSubmit={handleJoinPoll}>
          <label className="field">
            <span>Share code</span>
            <input
              maxLength={6}
              minLength={6}
              placeholder="A7K2Q9"
              value={shareCode}
              onChange={(event) => setShareCode(event.target.value.toUpperCase())}
            />
          </label>

          <button
            className="secondary-button"
            disabled={isLoading || busyAction === "join" || shareCode.trim().length < 6}
            type="submit"
          >
            {busyAction === "join" ? "Opening room..." : "Join poll room"}
          </button>
        </form>

        <div className="stack-note">
          <p className="eyebrow">Rules shared in monorepo</p>
          <p>
            Option limit: {POLL_RULES.MIN_OPTIONS}-{POLL_RULES.MAX_OPTIONS}. Session bootstrap:
            anonymous Supabase auth before any API call.
          </p>
        </div>
      </article>

      {pageError || authError ? (
        <article className="panel panel--warning">
          <p className="eyebrow">Attention</p>
          <p>{pageError || authError}</p>
        </article>
      ) : null}
    </section>
  );
}

