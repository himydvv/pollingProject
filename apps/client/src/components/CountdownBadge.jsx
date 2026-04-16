import { useEffect, useState } from "react";

import { POLL_STATUS } from "@polling-app/shared";

function formatRemainingTime(milliseconds) {
  if (milliseconds <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function CountdownBadge({ expiresAt, status }) {
  const [remainingTime, setRemainingTime] = useState(() => {
    return new Date(expiresAt).getTime() - Date.now();
  });

  useEffect(() => {
    if (status !== POLL_STATUS.ACTIVE) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingTime(new Date(expiresAt).getTime() - Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [expiresAt, status]);

  if (status === POLL_STATUS.CLOSED) {
    return <div className="countdown-badge countdown-badge--closed">Poll closed by host</div>;
  }

  if (status === POLL_STATUS.EXPIRED) {
    return <div className="countdown-badge countdown-badge--expired">Session expired</div>;
  }

  return (
    <div className="countdown-badge countdown-badge--active">
      <span className="countdown-badge__label">Time left</span>
      <strong>{formatRemainingTime(remainingTime)}</strong>
    </div>
  );
}
