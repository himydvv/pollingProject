import { io } from "socket.io-client";

import { clientEnv } from "./env.js";

let socketClient;

export function getSocketClient() {
  if (!socketClient) {
    const apiUrl = new URL(clientEnv.apiBaseUrl);
    const socketOrigin = `${apiUrl.protocol}//${apiUrl.host}`;

    socketClient = io(socketOrigin, {
      autoConnect: false,
      transports: ["websocket"]
    });
  }

  return socketClient;
}
