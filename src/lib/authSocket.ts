export type AuthRoute = "login" | "register";

export interface AuthCredentials {
  username: string;
  password?: string;
}

export interface AuthSocketOptions {
  signal?: AbortSignal;
  /**
   * Optional timeout in milliseconds before the connection attempt fails.
   * Defaults to 10 seconds.
   */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 10_000;

function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (envUrl) {
    return envUrl.replace(/\/?$/, "");
  }

  const envPort = import.meta.env.VITE_WS_PORT as string | undefined;

  if (typeof window !== "undefined" && window.location) {
    const { protocol, hostname, port } = window.location;
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";

    const useDevDefaultPort = import.meta.env.DEV && (!envPort || envPort === "auto");
    const resolvedPort = envPort
      ? envPort
      : useDevDefaultPort && port !== "8000"
        ? "8000"
        : port;

    const portSegment = resolvedPort ? `:${resolvedPort}` : "";
    return `${wsProtocol}//${hostname}${portSegment}`;
  }

  return "ws://localhost:8000";
}

function getRoutePath(route: AuthRoute) {
  return route === "login" ? "/ws/lounge/login" : "/ws/lounge/register";
}

function buildWebSocketUrl(route: AuthRoute, username: string) {
  const base = resolveBaseUrl();
  const path = getRoutePath(route);
  try {
    const url = new URL(`${base}${path}`);
    if (username) {
      url.searchParams.set("userName", username);
    }
    return url.toString();
  } catch (error) {
    const encodedUser = username ? `?userName=${encodeURIComponent(username)}` : "";
    return `${base}${path}${encodedUser}`;
  }
}

/**
 * Opens a websocket connection to the FastAPI auth endpoint and sends credentials.
 * Resolves with the open socket once the credentials payload is sent successfully.
 */
export function connectAuthSocket(
  route: AuthRoute,
  credentials: AuthCredentials,
  options: AuthSocketOptions = {}
): Promise<WebSocket> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT } = options;
  const normalizedUsername = credentials.username.trim();

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("The connection attempt was aborted.", "AbortError"));
    }

    const url = buildWebSocketUrl(route, normalizedUsername);
    const socket = new WebSocket(url);
    // Buffer messages that might arrive between socket open and the app attaching listeners.
    // Consumers will read and clear `__initialMessageBuffer` if present.
    try {
      (socket as any).__initialMessageBuffer = [] as string[];
      socket.addEventListener("message", (ev) => {
        try {
          (socket as any).__initialMessageBuffer.push(ev.data as string);
        } catch {}
      });
    } catch {}
    let settled = false;
    let timeoutId: number | undefined;

    const cleanup = () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
      if (signal) {
        signal.removeEventListener("abort", handleAbort);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };

    const rejectWithCleanup = (error: Error) => {
      if (!settled) {
        settled = true;
        cleanup();
        try {
          socket.close();
        } catch (closeError) {
          console.warn("Failed to close websocket after error", closeError);
        }
        reject(error);
      }
    };

    // Resolve when the socket is open. Authentication is handled via the
    // `userName` query parameter and/or server-side session messages sent
    // over the websocket after connection; we no longer send credentials
    // in the open event.
    const handleOpen = () => {
      settled = true;
      cleanup();
      resolve(socket);
    };

    const handleError = () => {
      rejectWithCleanup(new Error("Failed to establish websocket connection."));
    };

    const handleClose = (event: CloseEvent) => {
      if (!settled) {
        rejectWithCleanup(
          new Error(`Websocket closed before authentication could complete (code ${event.code}).`)
        );
      }
    };

    const handleAbort = () => {
      rejectWithCleanup(new DOMException("The connection attempt was aborted.", "AbortError"));
    };

    socket.addEventListener("open", handleOpen, { once: true });
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);

    if (signal) {
      signal.addEventListener("abort", handleAbort, { once: true });
    }

    timeoutId = window.setTimeout(() => {
      rejectWithCleanup(new Error("Timed out while waiting for websocket authentication."));
    }, timeoutMs);
  });
}
