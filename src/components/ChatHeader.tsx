import { Users, Wifi } from "lucide-react";

export type ConnectionState = "connected" | "connecting" | "disconnected" | "error";

interface ChatHeaderProps {
  roomName: string;
  onlineCount: number;
  connectionStatus?: ConnectionState;
}

const STATUS_CONFIG: Record<ConnectionState, { label: string; dotClass: string }> = {
  connected: { label: "CONNECTED", dotClass: "bg-green-400" },
  connecting: { label: "CONNECTING", dotClass: "bg-yellow-400" },
  disconnected: { label: "DISCONNECTED", dotClass: "bg-red-500" },
  error: { label: "ERROR", dotClass: "bg-red-500" },
};

export function ChatHeader({ roomName, onlineCount, connectionStatus = "connected" }: ChatHeaderProps) {
  const status = STATUS_CONFIG[connectionStatus] ?? STATUS_CONFIG.connected;

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-purple-800/20 border-b border-purple-500/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 ${status.dotClass} rounded-full animate-pulse shadow-lg`}></div>
          <h1 className="text-xl text-purple-200 font-mono tracking-wide">
            #{roomName}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4 text-purple-300">
          <div className="flex items-center space-x-2">
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-mono">{status.label}</span>
          </div>
          <div className="flex items-center space-x-2 bg-purple-800/30 px-3 py-1 rounded-full border border-purple-500/30">
            <Users className="w-4 h-4" />
            <span className="text-sm font-mono">{onlineCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}