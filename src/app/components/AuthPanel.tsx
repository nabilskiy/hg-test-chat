import React from 'react';
import { useApp, AuthMode } from '../context/AppContext';
import { User } from 'lucide-react';

const AuthPanel: React.FC = () => {
  const { authMode, setAuthMode, userId, setUserId, token, setToken } = useApp();

  const quickUserSwitch = (user: string) => {
    setUserId(user);
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shrink-0">
      {/* Auth Mode Selector */}
      <div className="mb-3">
        <label className="text-xs font-medium mb-1 block opacity-90">Auth Mode</label>
        <select
          value={authMode}
          onChange={(e) => setAuthMode(e.target.value as AuthMode)}
          className="w-full bg-white/20 border border-white/30 rounded px-3 py-2 text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <option value="none" className="text-gray-900">None (user_id query param)</option>
          <option value="local_jwt" className="text-gray-900">Local JWT</option>
          <option value="custom_bearer" className="text-gray-900">Custom Bearer Token</option>
        </select>
      </div>

      {/* User ID input for 'none' mode or Token input for JWT/Bearer modes */}
      {authMode === 'none' ? (
        <div className="mb-3">
          <label className="text-xs font-medium mb-1 block opacity-90">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., user-1"
            className="w-full bg-white/20 border border-white/30 rounded px-3 py-2 text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      ) : (
        <div className="mb-3">
          <label className="text-xs font-medium mb-1 block opacity-90">
            {authMode === 'local_jwt' ? 'JWT Token' : 'Bearer Token'}
          </label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your token here..."
            rows={2}
            className="w-full bg-white/20 border border-white/30 rounded px-3 py-2 text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none font-mono"
          />
        </div>
      )}

      {/* Active User Indicator */}
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4" />
        <span className="text-xs opacity-90">Active User:</span>
        <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs font-medium">
          {authMode === 'none' ? userId : 'Token Auth'}
        </span>
      </div>

      {/* Quick User Switch (only in 'none' mode) */}
      {authMode === 'none' && (
        <div>
          <label className="text-xs font-medium mb-1 block opacity-90">Quick Switch</label>
          <div className="flex gap-2">
            {['user-1', 'user-2', 'user-3', 'user-4'].map((user) => (
              <button
                key={user}
                onClick={() => quickUserSwitch(user)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  userId === user
                    ? 'bg-white text-blue-600'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {user}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPanel;
