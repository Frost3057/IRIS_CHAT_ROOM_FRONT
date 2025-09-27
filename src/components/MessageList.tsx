import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";

interface AnalysisData {
  content: string;
  reasoning: string;
  level_of_danger: string;
  model_prediction: Record<string, unknown>;
  final_score: number;
  grooming_style: string;
}

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  displayTimestamp?: string;
  isOwn?: boolean;
  isSystem?: boolean;
  analysis?: AnalysisData;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
      {/* Retro scanline effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-b from-transparent via-purple-500/5 to-transparent bg-[length:100%_4px] opacity-30"></div>
      </div>
      
      <div className="relative z-10">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}