import React, { useState, useEffect } from 'react';
import {
  Bell,
  User,
  HelpCircle,
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
    '/': 'Live Surveillance',
    '/live': 'Live Surveillance',
    '/database': 'Security Records',
    '/dashboard': 'Threat Analytics',
    '/map': 'Asset Locations',
    '/recordings': 'Video Archive',
    '/ai-assist': 'Intelligence AI',
    '/profile': 'User Profile',
    '/settings': 'System Settings',
    '/help': 'Help & Support',
  };

  const getCurrentPageName = () => {
    return pageNames[location.pathname] || 'System Control';
  };

  const currentPageName = getCurrentPageName();

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black text-gray-900 tracking-tight">{currentPageName}</h1>
        </div>

        <div className="flex items-center gap-4 sm:gap-8">
          {/* Real-time Clock */}
          <div className="hidden md:flex flex-col items-end pr-4 border-r border-gray-200">
             <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-900 tracking-tighter tabular-nums">{formatTime(currentTime)}</span>
                <Clock size={12} className="text-gray-400" />
             </div>
             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em]">{formatDate(currentTime)}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2.5 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100 hover:border-gray-200 group">
              <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(244,63,94,0.4)]"></span>
            </button>

            {/* Help */}
            <button
              onClick={() => window.location.href = '/help'}
              className="hidden sm:flex p-2.5 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100 hover:border-gray-200 group"
            >
              <HelpCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>
          </div>

          {/* User Account */}
          <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
            <div className="flex flex-col items-end hidden lg:flex">
              <span className="text-xs font-black text-gray-900 tracking-tight leading-none mb-1">
                {user.name || user.username || 'Administrator'}
              </span>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] opacity-80">
                Security Ops
              </span>
            </div>
            
            <button className="relative group focus:outline-none" onClick={() => window.location.href = '/settings'}>
              <div className="w-11 h-11 p-0.5 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 group-hover:rotate-[360deg] shadow-lg shadow-indigo-500/10">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden border-2 border-white">
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                       <User size={20} className="text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg shadow-emerald-500/20"></div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;