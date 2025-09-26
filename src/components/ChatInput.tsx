import { useState } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { ConnectionState } from "./ChatHeader";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  status?: ConnectionState;
}

const STATUS_META: Record<ConnectionState, { label: string; color: string }> = {
  connected: { label: "Online", color: "bg-green-400" },
  connecting: { label: "Connecting", color: "bg-yellow-400" },
  disconnected: { label: "Offline", color: "bg-red-400" },
  error: { label: "Error", color: "bg-red-500" },
};

export function ChatInput({ onSendMessage, disabled = false, status = "connected" }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const statusMeta = STATUS_META[status] ?? STATUS_META.connected;
  const isInputDisabled = disabled || status !== "connected";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isInputDisabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-purple-500/30 bg-gradient-to-r from-gray-900/80 to-purple-900/20 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1">
          <div className="relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isInputDisabled}
              className="w-full bg-gray-800/60 border-purple-500/30 text-purple-100 placeholder:text-purple-400 font-mono text-sm focus:border-purple-400 focus:ring-purple-400/20 resize-none"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
              <button
                type="button"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <Button
          type="submit"
          disabled={!message.trim() || isInputDisabled}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border border-purple-500/30 text-white shadow-lg shadow-purple-500/25 font-mono"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
      
      <div className="mt-2 flex items-center space-x-4 text-xs font-mono text-purple-400">
        <span>Press Enter to send</span>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 ${statusMeta.color} rounded-full animate-pulse`}></div>
          <span>{statusMeta.label}</span>
        </div>
      </div>
    </div>
  );
}