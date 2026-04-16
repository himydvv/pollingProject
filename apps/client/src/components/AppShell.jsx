import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

function formatUserId(userId) {
  if (!userId) {
    return "guest";
  }

  return `${userId.slice(0, 8)}...${userId.slice(-4)}`;
}

export function AppShell({ children }) {
  const location = useLocation();
  const { user, authError } = useAuth();

  return (
    <div className="app-shell">
      <div className="app-shell__texture" />

      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand__signal" />
          <div>
            <p className="eyebrow">Realtime Collaborative Polling</p>
            <h1>PulseVote</h1>
          </div>
        </Link>

        <div className="topbar__meta">
          <span className="status-pill status-pill--live">
            {location.pathname === "/" ? "Setup mode" : "Live room"}
          </span>
          <span className="session-chip">anon session: {formatUserId(user?.id)}</span>
          {authError ? <span className="status-pill status-pill--warning">{authError}</span> : null}
        </div>
      </header>

      <main className="page-shell">{children}</main>
    </div>
  );
}

