import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, X } from "lucide-react";
import { ChatHeader, ConnectionState } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { UserList } from "./UserList";
import { Button } from "./ui/button";

type UserStatus = "online" | "away" | "busy";
type UserRole = "admin" | "moderator" | "user";

type RoomUser = {
  id: string;
  username: string;
  status: UserStatus;
  role: UserRole;
};

type AnalysisData = {
  content: string;
  reasoning: string;
  level_of_danger: string;
  model_prediction: Record<string, unknown>;
  final_score: number;
  grooming_style: string;
};

type ChatMessage = {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  displayTimestamp?: string;
  isOwn?: boolean;
  isSystem?: boolean;
  analysis?: AnalysisData;
};

type ServerPayload = Record<string, unknown>;

const extractString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const deriveTimestamp = (value?: string) => {
  if (!value) {
    const now = new Date();
    return { date: now, label: undefined };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { date: new Date(), label: undefined };
  }

  const sanitized = trimmed.replace(/\//g, "-");
  const baseCandidates = [trimmed, sanitized];
  const isoCandidates = baseCandidates.flatMap((candidate) => {
    const tCandidate = candidate.replace(/\s+/, "T");
    return [candidate, tCandidate, `${tCandidate}Z`];
  });

  for (const candidate of isoCandidates) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return { date: parsed, label: undefined };
    }
  }

  return { date: new Date(), label: trimmed };
};

const tryParseJson = (payload: string): ServerPayload | null => {
  const trimmed = payload.trim();
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? (parsed as ServerPayload) : null;
  } catch {
    // Try a tolerant parse: convert single quotes to double quotes for simple Python-like dicts
    try {
      const relaxed = trimmed.replace(/'/g, '"');
      const parsed = JSON.parse(relaxed);
      return parsed && typeof parsed === "object" ? (parsed as ServerPayload) : null;
    } catch {
      return null;
    }
  }
};

const getMockUsers = (currentUser: string): RoomUser[] => [
  { id: "1", username: currentUser, status: "online", role: "admin" },
  { id: "2", username: "retro_user", status: "online", role: "user" },
  { id: "3", username: "chat_master", status: "online", role: "moderator" },
  { id: "4", username: "dev_ninja", status: "away", role: "user" },
  { id: "5", username: "purple_fan", status: "online", role: "user" },
  { id: "6", username: "websocket_dev", status: "busy", role: "user" }
];

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createSystemMessage = (text: string): ChatMessage => ({
  id: randomId(),
  username: "System",
  content: text,
  timestamp: new Date(),
  isOwn: false,
  isSystem: true,
});

const parseChatPayload = (payload: string, currentUser: string): ChatMessage => {
  const jsonPayload = tryParseJson(payload);

  if (jsonPayload) {
    const sender =
      extractString(jsonPayload.userName) ??
      extractString(jsonPayload.username) ??
      extractString(jsonPayload.user) ??
      "System";

    const messageText =
      extractString(jsonPayload.message) ??
      extractString(jsonPayload.content) ??
      extractString(jsonPayload.text) ??
      payload;

    const timestampSource =
      extractString(jsonPayload.date_time) ??
      extractString(jsonPayload.timestamp) ??
      extractString(jsonPayload.time);

    // Extract analysis data if present
    const analysisData = jsonPayload.analysis as Record<string, unknown> | undefined;
    let analysis: AnalysisData | undefined;
    if (analysisData && typeof analysisData === 'object') {
      analysis = {
        content: extractString(analysisData.content) ?? '',
        reasoning: extractString(analysisData.reasoning) ?? '',
        level_of_danger: extractString(analysisData.level_of_danger) ?? 'Unknown',
        model_prediction: analysisData.model_prediction as Record<string, unknown> ?? {},
        final_score: typeof analysisData.final_score === 'number' ? analysisData.final_score : 0,
        grooming_style: extractString(analysisData.grooming_style) ?? 'N/A'
      };
    }

    const { date, label } = deriveTimestamp(timestampSource);
    // Defensive normalization: some servers may mistakenly append a time to the username
    // e.g. "frosti03:29" or "frosti 03:29". Detect and split that so the UI can
    // show username and time separately.
    let normalizedSender = sender;
    let normalizedLabel = label;
    try {
      // Look for a trailing time token (HH:MM or HH:MM:SS) optionally preceded by a space
      const match = sender.match(/^(.*?)(?:\s?)(\d{1,2}:\d{2}(?::\d{2})?)$/);
      if (match) {
        const [, namePart, timePart] = match;
        if (namePart && namePart.trim()) {
          normalizedSender = namePart.trim();
          // Only set label if we don't already have a parsed label coming from the payload
          if (!normalizedLabel) normalizedLabel = timePart;
        }
      }
    } catch (e) {
      // ignore and fall back to original sender
    }
    const isSystem = sender.toLowerCase() === "system";

    return {
      id: randomId(),
      username: normalizedSender,
      content: messageText,
      timestamp: date,
      displayTimestamp: normalizedLabel,
      isOwn: !isSystem && normalizedSender === currentUser,
      isSystem,
      analysis,
    };
  }

  const match = payload.match(/^(.*)\s:\s(.*)$/);
  const sender = match ? match[1].trim() : "System";
  const content = match ? match[2].trim() : payload;
  const isSystem = sender.toLowerCase() === "system";

  return {
    id: randomId(),
    username: sender,
    content,
    timestamp: new Date(),
    isOwn: !isSystem && sender === currentUser,
    isSystem,
  };
};

interface ChatRoomProps {
  currentUser?: string;
  socket?: WebSocket | null;
}

export function ChatRoom({ currentUser = "you", socket }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showUserList, setShowUserList] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    socket?.readyState === WebSocket.OPEN ? "connected" : "connecting"
  );
  const isConnected = connectionState === "connected";

  const users = useMemo(() => getMockUsers(currentUser), [currentUser]);

  const appendSystemMessage = useCallback((text: string) => {
    setMessages((prev: ChatMessage[]) => [...prev, createSystemMessage(text)]);
  }, []);

  useEffect(() => {
    if (!socket) {
      setConnectionState("disconnected");
      appendSystemMessage("Connection unavailable.");
      return;
    }

    let isActive = true;

    const handleOpen = () => {
      if (!isActive) return;
      setConnectionState("connected");
      appendSystemMessage("Connected to lounge.");
    };

    const handleClose = (event: CloseEvent) => {
      if (!isActive) return;
      setConnectionState("disconnected");
      appendSystemMessage(
        event.wasClean
          ? "Connection closed."
          : `Connection lost (code ${event.code}).`
      );
    };

    const handleError = () => {
      if (!isActive) return;
      setConnectionState("error");
      appendSystemMessage("Connection error. Please refresh to reconnect.");
    };

    const handleMessage = (event: MessageEvent<string>) => {
      if (!isActive) return;
      // Log raw payload for debugging username/time concatenation issues
      try {
        console.debug('[chat] incoming payload:', event.data);
      } catch {}

      // Try to parse a server-sent batch payload: { data: [ { id, userName, date_time, message }, ... ] }
      try {
        const trimmed = event.data.trim();
        const parsed = tryParseJson(trimmed);
        if (parsed && Array.isArray((parsed as any).data)) {
          const batch = (parsed as any).data as Array<Record<string, unknown>>;
          const mapped: ChatMessage[] = batch.map((item) => {
            const sender = extractString(item.userName ?? item.user ?? item.username) ?? "System";
            let messageText = extractString(item.message ?? item.content ?? item.text) ?? "";
            // If the message text itself is a JSON string, try to parse and extract a useful field
            try {
              const inner = tryParseJson(String(messageText));
              if (inner) {
                messageText =
                  extractString(inner.message) ??
                  extractString(inner.content) ??
                  extractString(inner.text) ??
                  extractString(inner.userName) ??
                  JSON.stringify(inner);
              }
            } catch (e) {
              // ignore and keep raw text
            }

            const timestampSource = extractString(item.date_time ?? item.timestamp ?? item.time);
            const { date, label } = deriveTimestamp(timestampSource);
            
            // Extract analysis data if present
            const analysisData = item.analysis as Record<string, unknown> | undefined;
            let analysis: AnalysisData | undefined;
            if (analysisData && typeof analysisData === 'object') {
              analysis = {
                content: extractString(analysisData.content) ?? '',
                reasoning: extractString(analysisData.reasoning) ?? '',
                level_of_danger: extractString(analysisData.level_of_danger) ?? 'Unknown',
                model_prediction: analysisData.model_prediction as Record<string, unknown> ?? {},
                final_score: typeof analysisData.final_score === 'number' ? analysisData.final_score : 0,
                grooming_style: extractString(analysisData.grooming_style) ?? 'N/A'
              };
            }
            
            // Defensive normalization: split trailing time in sender like "frosti03:29"
            let normalizedSender = sender;
            let normalizedLabel = label;
            try {
              const m = sender.match(/^(.*?)(?:\s?)(\d{1,2}:\d{2}(?::\d{2})?)$/);
              if (m) {
                const [, namePart, timePart] = m;
                if (namePart && namePart.trim()) {
                  normalizedSender = namePart.trim();
                  if (!normalizedLabel) normalizedLabel = timePart;
                }
              }
            } catch (e) {}

            const isSystem = normalizedSender.toLowerCase() === "system";
            return {
              id: String(item.id ?? randomId()),
              username: normalizedSender,
              content: messageText,
              timestamp: date,
              displayTimestamp: normalizedLabel,
              isOwn: !isSystem && normalizedSender === currentUser,
              isSystem,
              analysis,
            } as ChatMessage;
          });

          // assume server sends newest first; append in proper chronological order
          const ordered = mapped.reverse();
          setMessages((prev) => [...prev, ...ordered]);
          try {
            console.debug(`[chat] loaded batch messages: ${ordered.length}`);
            appendSystemMessage(`Loaded ${ordered.length} recent messages.`);
          } catch (e) {}
          return;
        }
      } catch (e) {
        // fall back to single-message parsing below
      }

      setMessages((prev: ChatMessage[]) => [
        ...prev,
        parseChatPayload(event.data, currentUser),
      ]);
    };

    appendSystemMessage("Establishing connection...");

    if (socket.readyState === WebSocket.OPEN) {
      handleOpen();
    } else if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
      setConnectionState("disconnected");
    } else {
      setConnectionState("connecting");
    }

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);

    // If the auth socket buffered messages before we attached listeners, consume them now.
    try {
      const buffer = (socket as any).__initialMessageBuffer as string[] | undefined;
      if (Array.isArray(buffer) && buffer.length) {
        for (const msg of buffer) {
          try {
            handleMessage(new MessageEvent("message", { data: msg } as any));
          } catch {}
        }
        // clear the buffer
        (socket as any).__initialMessageBuffer = [];
      }
    } catch {}

    return () => {
      isActive = false;
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
    };
  }, [socket, currentUser, appendSystemMessage]);

  const handleSendMessage = (content: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      appendSystemMessage("Cannot send message while disconnected.");
      return;
    }

    try {
      socket.send(content);
    } catch (error) {
      console.error("Failed to send chat message", error);
      appendSystemMessage("Message failed to send.");
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white relative overflow-hidden">
      {/* Retro grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[linear-gradient(rgba(147,51,234,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.3)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      </div>
      
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <ChatHeader
          roomName="retro-lounge"
          onlineCount={users.filter((user: RoomUser) => user.status === "online").length}
          connectionStatus={connectionState}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1">
            <MessageList messages={messages} />
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={connectionState !== "connected"}
              status={connectionState}
            />
          </div>
          
          {showUserList && (
            <UserList users={users} isVisible={showUserList} />
          )}
        </div>
        
        {/* Toggle user list button */}
        <Button
          onClick={() => setShowUserList(!showUserList)}
          className="fixed top-20 right-4 bg-purple-800/60 hover:bg-purple-700/80 border border-purple-500/30 backdrop-blur-sm shadow-lg shadow-purple-500/25 z-20"
          size="sm"
        >
          {showUserList ? <X className="w-4 h-4" /> : <Users className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}