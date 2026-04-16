import { useEffect, useEffectEvent } from "react";

import { SOCKET_EVENTS } from "@polling-app/shared";

import { getSocketClient } from "../lib/socket.js";

export function usePollSocket({ pollId, enabled, onPollState, onSocketError }) {
  const handlePollState = useEffectEvent((incomingState) => {
    onPollState?.(incomingState);
  });

  const handleSocketError = useEffectEvent((incomingError) => {
    onSocketError?.(incomingError);
  });

  useEffect(() => {
    if (!enabled || !pollId) {
      return undefined;
    }

    const socket = getSocketClient();

    function onState(payload) {
      handlePollState(payload);
    }

    function onError(payload) {
      handleSocketError(payload);
    }

    socket.on(SOCKET_EVENTS.POLL_STATE, onState);
    socket.on(SOCKET_EVENTS.POLL_UPDATED, onState);
    socket.on(SOCKET_EVENTS.POLL_CLOSED, onState);
    socket.on(SOCKET_EVENTS.POLL_ERROR, onError);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(SOCKET_EVENTS.JOIN_POLL, { pollId });

    return () => {
      socket.off(SOCKET_EVENTS.POLL_STATE, onState);
      socket.off(SOCKET_EVENTS.POLL_UPDATED, onState);
      socket.off(SOCKET_EVENTS.POLL_CLOSED, onState);
      socket.off(SOCKET_EVENTS.POLL_ERROR, onError);
      socket.disconnect();
    };
  }, [enabled, pollId, handlePollState, handleSocketError]);
}

