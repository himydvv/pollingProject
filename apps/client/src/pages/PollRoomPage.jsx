import { startTransition, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { POLL_STATUS } from "@polling-app/shared";

import { CountdownBadge } from "../components/CountdownBadge.jsx";
import { PollChart } from "../components/PollChart.jsx";
import { PollOptionButton } from "../components/PollOptionButton.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePollSocket } from "../hooks/usePollSocket.js";
import { closePollRequest, getPollByIdRequest, voteOnPollRequest } from "../lib/api.js";

function mergePollState(previousState, nextState) {
  if (!previousState) {
    return nextState;
  }

  return {
    ...nextState,
    viewer: {
      isOwner: Boolean(previousState.viewer?.isOwner || nextState.viewer?.isOwner),
      hasVoted: Boolean(previousState.viewer?.hasVoted || nextState.viewer?.hasVoted)
    }
  };
}

function getLeadingOptionLabel(pollState) {
  return (
    pollState.options.find((option) => option.id === pollState.poll.leadingOptionId)?.label ??
    "No leader yet"
  );
}

export function PollRoomPage() {
  const { pollId } = useParams();
  const { authError, getAccessToken, isLoading: authLoading } = useAuth();
  const [pollState, setPollState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [socketMessage, setSocketMessage] = useState("Waiting for live connection...");
  const [votingOptionId, setVotingOptionId] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPoll() {
      if (!pollId || authLoading) {
        return;
      }

      try {
        setIsLoading(true);
        setPageError("");
        setActionError("");
        setPollState(null);
        const accessToken = await getAccessToken();
        const response = await getPollByIdRequest(pollId, accessToken);

        if (!isMounted) {
          return;
        }

        setPollState(response);
        setSocketMessage("Live updates connected");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error.details?.state) {
          setPollState((currentState) => mergePollState(currentState, error.details.state));
        }

        setPageError(error.message || "Unable to load poll state.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPoll();

    return () => {
      isMounted = false;
    };
  }, [authLoading, getAccessToken, pollId]);

  usePollSocket({
    pollId,
    enabled: Boolean(pollState?.poll?.id),
    onPollState: (incomingState) => {
      startTransition(() => {
        setPollState((currentState) => mergePollState(currentState, incomingState));
      });
      setSocketMessage("Live updates connected");
      setActionError("");
    },
    onSocketError: (incomingError) => {
      setSocketMessage(incomingError?.message || "Live connection had a problem.");
    }
  });

  async function handleVote(optionId) {
    try {
      setVotingOptionId(optionId);
      setActionError("");
      const accessToken = await getAccessToken();
      const response = await voteOnPollRequest(pollId, optionId, accessToken);

      startTransition(() => {
        setPollState((currentState) => mergePollState(currentState, response));
      });
    } catch (error) {
      if (error.details?.state) {
        startTransition(() => {
          setPollState((currentState) => mergePollState(currentState, error.details.state));
        });
      }

      setActionError(error.message || "Unable to submit your vote.");
    } finally {
      setVotingOptionId("");
    }
  }

  async function handleClosePoll() {
    try {
      setIsClosing(true);
      setActionError("");
      const accessToken = await getAccessToken();
      const response = await closePollRequest(pollId, accessToken);
      setPollState((currentState) => mergePollState(currentState, response));
    } catch (error) {
      setActionError(error.message || "Unable to close the poll.");
    } finally {
      setIsClosing(false);
    }
  }

  async function handleCopyShareLink() {
    if (!pollState) {
      return;
    }

    try {
      const shareLink = `${window.location.origin}/poll/${pollState.poll.id}`;
      await window.navigator.clipboard.writeText(shareLink);
      setCopyFeedback("Share link copied");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    } catch (error) {
      setCopyFeedback("Clipboard copy failed");
      window.setTimeout(() => setCopyFeedback(""), 1800);
    }
  }

  if (authLoading || isLoading) {
    return (
      <section className="panel loading-panel">
        <p className="eyebrow">Loading room</p>
        <h2>Bootstrapping anonymous auth and fetching poll state...</h2>
      </section>
    );
  }

  if (!pollState) {
    return (
      <section className="panel panel--warning">
        <p className="eyebrow">Poll unavailable</p>
        <h2>{pageError || authError || "This poll could not be loaded."}</h2>
        <Link className="secondary-button secondary-button--link" to="/">
          Back to home
        </Link>
      </section>
    );
  }

  const pollIsActive = pollState.poll.status === POLL_STATUS.ACTIVE;
  const votingLocked = !pollIsActive || pollState.viewer.hasVoted;

  return (
    <section className="room-grid">
      <article className="panel room-hero">
        <div className="room-hero__header">
          <div>
            <p className="eyebrow">Live poll room</p>
            <h2>{pollState.poll.question}</h2>
            {pollState.poll.description ? (
              <p className="room-hero__description">{pollState.poll.description}</p>
            ) : null}
          </div>

          <div className="room-hero__status">
            <CountdownBadge expiresAt={pollState.poll.expiresAt} status={pollState.poll.status} />
            <span className="status-pill status-pill--neutral">{socketMessage}</span>
          </div>
        </div>

        <div className="room-hero__meta">
          <StatCard accent="mint" label="Total votes" value={pollState.poll.totalVotes} />
          <StatCard accent="coral" label="Leading option" value={getLeadingOptionLabel(pollState)} />
          <StatCard accent="sand" label="Share code" value={pollState.poll.shareCode} />
        </div>

        <div className="room-hero__actions">
          <button className="ghost-button" type="button" onClick={handleCopyShareLink}>
            {copyFeedback || "Copy share link"}
          </button>

          {pollState.viewer.isOwner ? (
            <button
              className="secondary-button"
              disabled={!pollIsActive || isClosing}
              type="button"
              onClick={handleClosePoll}
            >
              {isClosing ? "Closing..." : "Close poll"}
            </button>
          ) : null}
        </div>
      </article>

      <article className="panel vote-panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Vote controls</p>
            <h2>{pollIsActive ? "Cast your vote" : "Voting is locked"}</h2>
          </div>
          <span className={`status-pill ${votingLocked ? "status-pill--warning" : "status-pill--live"}`}>
            {pollState.viewer.hasVoted ? "Vote recorded" : pollIsActive ? "One vote per user" : "Session locked"}
          </span>
        </div>

        <div className="vote-panel__list">
          {pollState.options.map((option) => (
            <PollOptionButton
              disabled={votingLocked || Boolean(votingOptionId)}
              isLeading={option.id === pollState.poll.leadingOptionId}
              key={option.id}
              loading={votingOptionId === option.id}
              option={option}
              onVote={handleVote}
            />
          ))}
        </div>

        {actionError ? <p className="form-error">{actionError}</p> : null}
      </article>

      <PollChart options={pollState.options} leadingOptionId={pollState.poll.leadingOptionId} />

      <article className="panel results-panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Result ledger</p>
            <h2>Current standings</h2>
          </div>
          <span className="status-pill status-pill--neutral">
            {pollState.poll.status.replace(/^\w/, (letter) => letter.toUpperCase())}
          </span>
        </div>

        <div className="results-list">
          {pollState.options.map((option) => (
            <article className="results-row" key={option.id}>
              <div>
                <strong>{option.label}</strong>
                <p>{option.voteCount} votes</p>
              </div>
              <strong>{option.percentage}%</strong>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
