import { User, Crown, Zap } from "lucide-react";

interface User {
  id: string;
  username: string;
  status: 'online' | 'away' | 'busy';
  role?: 'admin' | 'moderator' | 'user';
}

interface UserListProps {
  users: User[];
  isVisible: boolean;
}

export function UserList({ users, isVisible }: UserListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'busy': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3 text-yellow-400" />;
      case 'moderator': return <Zap className="w-3 h-3 text-blue-400" />;
      default: return null;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="w-64 border-l border-purple-500/30 bg-gradient-to-b from-gray-900/80 to-purple-900/20 backdrop-blur-sm">
      <div className="p-4 border-b border-purple-500/30">
        <h2 className="text-lg text-purple-200 font-mono tracking-wide">
          Users ({users.length})
        </h2>
      </div>
      
      <div className="p-4 space-y-3 overflow-y-auto max-h-full">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center space-x-3 p-2 rounded-lg bg-gray-800/40 border border-purple-500/20 hover:bg-gray-800/60 transition-colors"
          >
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.status)} rounded-full border-2 border-gray-900`}></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <span className="text-sm text-purple-100 font-mono truncate">
                  {user.username}
                </span>
                {getRoleIcon(user.role)}
              </div>
              <span className="text-xs text-purple-400 capitalize font-mono">
                {user.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}