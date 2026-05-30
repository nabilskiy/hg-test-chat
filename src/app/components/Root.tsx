import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { MessageSquare, Users, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ApiLogDrawer from './ApiLogDrawer';
import AuthPanel from './AuthPanel';

const Root: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { apiLogs } = useApp();
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/direct') {
      return location.pathname === '/' || location.pathname === '/direct' || location.pathname.startsWith('/chat/');
    }
    if (path === '/groups') {
      return location.pathname === '/groups' || location.pathname.startsWith('/group-chat/');
    }
    return location.pathname === path;
  };

  const showBottomNav = !location.pathname.includes('/chat/') && !location.pathname.includes('/group-chat/');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile container */}
      <div className="flex-1 flex flex-col max-w-[430px] mx-auto w-full bg-white shadow-lg relative">
        {/* Auth Panel */}
        <AuthPanel />

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

        {/* Bottom Navigation */}
        {showBottomNav && (
          <nav className="border-t bg-white flex items-center justify-around h-16 shrink-0">
            <button
              onClick={() => navigate('/direct')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive('/direct') ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <MessageSquare className="w-6 h-6" />
              <span className="text-xs mt-1">Chats</span>
            </button>
            <button
              onClick={() => navigate('/groups')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive('/groups') ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs mt-1">Groups</span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive('/settings') ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-xs mt-1">Settings</span>
            </button>
          </nav>
        )}

        {/* API Log Drawer Toggle */}
        <button
          onClick={() => setIsLogDrawerOpen(!isLogDrawerOpen)}
          className="absolute bottom-16 right-4 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors z-10"
          style={{ bottom: showBottomNav ? '4rem' : '1rem' }}
        >
          {isLogDrawerOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          {apiLogs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {apiLogs.length}
            </span>
          )}
        </button>

        {/* API Log Drawer */}
        <ApiLogDrawer isOpen={isLogDrawerOpen} onClose={() => setIsLogDrawerOpen(false)} />
      </div>
    </div>
  );
};

export default Root;
