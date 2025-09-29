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

  // Always use our production server address
  return "ws://13.233.208.206:8000";
}

function getRoutePath(route: AuthRoute) {
  return route === "login" ? "/ws/lounge/login" : "/ws/lounge/register";
}

function buildWebSocketUrl(route: AuthRoute, username: string) {
  const base = resolveBaseUrl();
  const path = getRoutePath(route);
  console.log('[authSocket] Building URL - base:', base, 'path:', path, 'username:', username);
  try {
    const url = new URL(`${base}${path}`);
    if (username) {
      url.searchParams.set("userName", username);
    }
    console.log('[authSocket] Final URL:', url.toString());
    return url.toString();
  } catch (error) {
    console.log('[authSocket] URL construction failed, using fallback');
    const encodedUser = username ? `?userName=${encodeURIComponent(username)}` : "";
    const fallbackUrl = `${base}${path}${encodedUser}`;
    console.log('[authSocket] Fallback URL:', fallbackUrl);
    return fallbackUrl;
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

  return new Promise(async (resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("The connection attempt was aborted.", "AbortError"));
    }

    // Test basic connectivity first
    try {
      console.log('[authSocket] Testing connectivity to server...');
      const testResponse = await fetch('http://13.233.208.206:8000/', { 
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      console.log('[authSocket] Basic connectivity test completed');
    } catch (connectivityError) {
      console.warn('[authSocket] Connectivity test failed:', connectivityError);
      console.log('[authSocket] Proceeding with WebSocket connection anyway...');
    }

    const url = buildWebSocketUrl(route, normalizedUsername);
    console.log('[authSocket] Attempting to connect to:', url);
    
    // Validate the URL format
    try {
      const urlObj = new URL(url);
      console.log('[authSocket] URL validation:', {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        search: urlObj.search
      });
    } catch (e) {
      console.error('[authSocket] Invalid URL format:', e);
    }
    
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
      console.log('[authSocket] WebSocket connection opened successfully');
      settled = true;
      cleanup();
      resolve(socket);
    };

    const handleError = (event: Event) => {
      console.error('[authSocket] WebSocket error:', event);
      console.error('[authSocket] WebSocket state:', {
        readyState: socket.readyState,
        url: socket.url,
        protocol: socket.protocol,
        extensions: socket.extensions
      });
      // Try to get more specific error information
      if (event.target) {
        const ws = event.target as WebSocket;
        console.error('[authSocket] WebSocket target state:', {
          readyState: ws.readyState,
          url: ws.url
        });
      }
      rejectWithCleanup(new Error("Failed to establish websocket connection."));
    };

    const handleClose = (event: CloseEvent) => {
      console.log('[authSocket] WebSocket closed:', { code: event.code, reason: event.reason, wasClean: event.wasClean });
      if (!settled) {
        rejectWithCleanup(
          new Error(`Websocket closed before authentication could complete (code ${event.code}, reason: ${event.reason}).`)
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
