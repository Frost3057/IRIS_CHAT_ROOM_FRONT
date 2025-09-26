interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  displayTimestamp?: string;
  isOwn?: boolean;
  isSystem?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // If it's today, show just the time (HH:MM)
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    
    // If it's yesterday, show "Yesterday"
    if (messageDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }
    
    // If it's within the last 7 days, show day name
    const daysDiff = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 6) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // If it's this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const displayTime = formatTime(message.timestamp);

  if (message.isSystem) {
    return (
      <div className="flex justify-center mb-2">
        <div className="text-xs font-mono text-purple-300 bg-purple-900/30 border border-purple-500/30 px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
        message.isOwn 
          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25' 
          : 'bg-gray-800/60 text-purple-100 border border-purple-500/20'
      } backdrop-blur-sm`}>
        <div className="flex items-center mb-1">
          <span className={`text-xs font-mono px-2 py-1 bg-purple-500/20 rounded mr-4 ${
            message.isOwn ? 'text-purple-200' : 'text-purple-300'
          }`}>
            {message.username}
          </span>
          <span className={`text-xs font-mono opacity-70 px-2 py-1 bg-purple-400/20 rounded ${
            message.isOwn ? 'text-purple-200' : 'text-purple-400'
          }`}>
            {displayTime}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}