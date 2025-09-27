import { useState } from "react";
import { ChevronDown, ChevronRight, Shield, AlertTriangle, Info } from "lucide-react";

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

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);

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

  const getDangerLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'L1':
        return <Shield className="w-3 h-3 text-green-400" />;
      case 'L2':
        return <Info className="w-3 h-3 text-yellow-400" />;
      case 'L3':
      case 'L4':
      case 'L5':
        return <AlertTriangle className="w-3 h-3 text-red-400" />;
      default:
        return <Shield className="w-3 h-3 text-gray-400" />;
    }
  };

  const getDangerLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'L1':
        return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'L2':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'L3':
      case 'L4':
      case 'L5':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
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
        <p className="text-sm leading-relaxed mb-2">{message.content}</p>
        
        {/* Analysis Section */}
        {message.analysis && (
          <div className="mt-3 border-t border-purple-500/20 pt-3">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="flex items-center space-x-2 text-xs text-purple-300 hover:text-purple-200 transition-colors w-full"
            >
              {showAnalysis ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {getDangerLevelIcon(message.analysis.level_of_danger)}
              <span>AI Safety Analysis</span>
              <span className={`px-1 py-0.5 rounded text-xs border ${getDangerLevelColor(message.analysis.level_of_danger)}`}>
                {message.analysis.level_of_danger}
              </span>
            </button>
            
            {showAnalysis && (
              <div className="mt-2 space-y-2 text-xs">
                <div className="bg-purple-900/30 rounded p-2">
                  <div className="font-semibold text-purple-200 mb-1">Safety Assessment:</div>
                  <div className="text-purple-300">{message.analysis.content}</div>
                </div>
                
                <div className="bg-purple-900/30 rounded p-2">
                  <div className="font-semibold text-purple-200 mb-1">Reasoning:</div>
                  <div className="text-purple-300">{message.analysis.reasoning}</div>
                </div>
                
                <div className="flex items-center justify-between bg-purple-900/30 rounded p-2">
                  <div>
                    <div className="font-semibold text-purple-200">Risk Score:</div>
                    <div className="text-purple-300">{message.analysis.final_score}/100</div>
                  </div>
                  <div>
                    <div className="font-semibold text-purple-200">Style:</div>
                    <div className="text-purple-300">{message.analysis.grooming_style}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}