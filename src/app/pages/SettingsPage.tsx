import React, { useState } from 'react';
import { useApp, AuthMode } from '../context/AppContext';
import { Key, Settings as SettingsIcon, User } from 'lucide-react';
import { SignJWT } from 'jose';
import { toast } from 'sonner';

const SettingsPage: React.FC = () => {
  const { baseUrl, setBaseUrl, authMode, setAuthMode, userId, setUserId, token, setToken } = useApp();
  const [jwtSecret, setJwtSecret] = useState('my-secret-key');
  const [jwtUserId, setJwtUserId] = useState('user-1');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateJWT = async () => {
    if (!jwtSecret.trim()) {
      toast.error('Please enter a JWT secret');
      return;
    }

    if (!jwtUserId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    setIsGenerating(true);
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      
      const jwt = await new SignJWT({ 
        sub: jwtUserId,
        user_id: jwtUserId,
        iat: Math.floor(Date.now() / 1000),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      setToken(jwt);
      setAuthMode('local_jwt');
      toast.success('JWT generated successfully!');
    } catch (error: any) {
      toast.error(`Failed to generate JWT: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const quickUserSwitch = (user: string) => {
    setUserId(user);
    setJwtUserId(user);
    toast.success(`Switched to ${user}`);
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <SettingsIcon className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        {/* Base URL Configuration */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span>API Base URL</span>
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="/messager"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            Use /messager (proxied to mctest.d4ua.com on localhost and Vercel). Local backend:
            /local-messager or http://localhost:8102
          </p>
        </div>

        {/* Auth Mode */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Key className="w-4 h-4" />
            <span>Authentication Mode</span>
          </label>
          <select
            value={authMode}
            onChange={(e) => setAuthMode(e.target.value as AuthMode)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None (user_id query param)</option>
            <option value="local_jwt">Local JWT</option>
            <option value="custom_bearer">Custom Bearer Token</option>
          </select>
        </div>

        {/* User ID (for 'none' mode) */}
        {authMode === 'none' && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>User ID</span>
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g., user-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* JWT Token (for JWT/Bearer modes) */}
        {(authMode === 'local_jwt' || authMode === 'custom_bearer') && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              {authMode === 'local_jwt' ? 'JWT Token' : 'Bearer Token'}
            </label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token here..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs"
            />
          </div>
        )}

        {/* Quick User Switcher */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Quick User Switch</label>
          <div className="grid grid-cols-2 gap-2">
            {['user-1', 'user-2', 'user-3', 'user-4'].map((user) => (
              <button
                key={user}
                onClick={() => quickUserSwitch(user)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  userId === user || jwtUserId === user
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {user}
              </button>
            ))}
          </div>
        </div>

        {/* JWT Generator */}
        <div className="border-t pt-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            JWT Generator (HS256)
          </h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">User ID for JWT</label>
            <input
              type="text"
              value={jwtUserId}
              onChange={(e) => setJwtUserId(e.target.value)}
              placeholder="e.g., user-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Secret Key</label>
            <input
              type="text"
              value={jwtSecret}
              onChange={(e) => setJwtSecret(e.target.value)}
              placeholder="Enter secret key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Used to sign the JWT. Default: my-secret-key
            </p>
          </div>

          <button
            onClick={handleGenerateJWT}
            disabled={isGenerating}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate JWT Token'}
          </button>

          <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded border border-blue-100">
            💡 This will create a HS256 JWT with sub={jwtUserId}, valid for 24 hours, and
            automatically switch to "Local JWT" mode.
          </p>
        </div>

        {/* Info Section */}
        <div className="border-t pt-6 space-y-3">
          <h3 className="font-semibold text-gray-900">About This App</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              This is a testing tool for the HolidayGet Message Center API. It supports:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Direct conversations (1-on-1 chats)</li>
              <li>Group conversations with role-based permissions</li>
              <li>Multiple authentication modes</li>
              <li>Real-time message polling</li>
              <li>API request logging and debugging</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
