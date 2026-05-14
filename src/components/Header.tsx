import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Database, 
  BarChart3, 
  MapPin, 
  Bell, 
  User, 
  Settings, 
  HelpCircle,
  Video,
  Brain,
  Shield,
  Activity,
  Clock
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format date and time
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  // Navigation items mapping
  const pageNames: Record<string, string> = {
    '/': 'Surveillance Command',
    '/live': 'Live Monitoring',
    '/database': 'Security Records',
    '/dashboard': 'Threat Analytics',
    '/map': 'Asset Locations',
    '/recordings': 'Video Archive',
    '/ai-assist': 'Intelligence AI',
    '/profile': 'User Profile',
    '/settings': 'System Settings',
    '/help': 'Help & Support',
  };

  // Icon mapping for each route
  const pageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    '/': Camera,
    '/live': Camera,
    '/database': Database,
    '/dashboard': BarChart3,
    '/map': MapPin,
    '/recordings': Video,
    '/ai-assist': Brain,
    '/profile': User,
    '/settings': Settings,
    '/help': HelpCircle,
  };

  const getCurrentPageName = () => {
    return pageNames[location.pathname] || 'System Control';
  };

  const getCurrentIcon = () => {
    return pageIcons[location.pathname] || Shield;
  };

  const currentPageName = getCurrentPageName();
  const CurrentIcon = getCurrentIcon();

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40">
      <div className="flex items-center justify-between px-8 py-3.5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 transition-transform hover:scale-105">
              <CurrentIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-bold text-gray-900 text-sm tracking-tight leading-none mb-1">{currentPageName}</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Active</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            <Activity size={12} className="text-indigo-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Network Latency: 24ms</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Date and Time */}
          <div className="hidden lg:flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
            <Clock size={14} className="text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-indigo-900 leading-none">{formatTime(currentTime)}</span>
              <span className="text-[10px] font-medium text-indigo-600 uppercase tracking-wide">{formatDate(currentTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 group">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white group-hover:scale-110 transition-transform"></span>
            </button>

            {/* Help */}
            <button 
              onClick={() => window.location.href = '/help'}
              className="p-2.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all border border-transparent"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs font-bold text-gray-900 leading-none mb-1">
                {user.name || user.username || 'Administrator'}
              </span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                Master Security
              </span>
            </div>
            <button className="relative group" onClick={() => window.location.href = '/settings'}>
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 group-active:scale-95 border-2 border-white">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-[10px]" />
                ) : (
                  <span className="font-bold text-sm tracking-tighter">
                    {user.username ? user.username.substring(0, 2).toUpperCase() : 'AD'}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;