import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  HelpCircle,
  Camera,
  Database,
  MapPin,
  Brain,
  Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
}

interface SidebarProps {
  className?: string;
}

// Updated navigation items - adapted to project routes
const navigationItems: NavigationItem[] = [
  { id: "live", name: "Surveillance", icon: Camera, href: "/live" },
  { id: "database", name: "Records", icon: Database, href: "/database", badge: "3" },
  { id: "dashboard", name: "Analytics", icon: BarChart3, href: "/dashboard" },
  { id: "map", name: "Locations", icon: MapPin, href: "/map" },
  { id: "recordings", name: "Recorded Files", icon: Video, href: "/recordings" },
  { id: "ai-assist", name: "AI Assistant", icon: Brain, href: "/ai-assist" },
  { id: "settings", name: "Settings", icon: Settings, href: "/settings" },
  { id: "help", name: "Help & Support", icon: HelpCircle, href: "/help" },
];

export function Sidebar({ className = "" }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  // Auto-open sidebar on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleItemClick = (href: string) => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
    navigate(href);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get active item based on current location
  const getActiveItemId = () => {
    const currentPath = location.pathname;
    // If on root path, default to live (surveillance)
    if (currentPath === "/") {
      return "live";
    }
    const item = navigationItems.find(item => item.href === currentPath);
    return item?.id || "live";
  };

  const activeItem = getActiveItemId();

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-6 left-6 z-50 p-3 rounded-lg bg-slate-800 shadow-lg border border-slate-700 md:hidden hover:bg-slate-700 transition-all duration-200 hover:scale-105"
        aria-label="Toggle sidebar"
      >
        {isOpen ?
          <X className="h-5 w-5 text-indigo-400" /> :
          <Menu className="h-5 w-5 text-indigo-400" />
        }
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 z-40 transition-all duration-300 ease-in-out flex flex-col shadow-2xl
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-20
          md:translate-x-0 md:static md:z-auto md:max-w-none
          ${className}
        `}
      >
        {/* Header with logo */}
        <div className="flex items-center justify-center py-4 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm relative transition-all duration-300 min-h-[73px]">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
            <img src="/cctv-camera.png" alt="VisionGuard" className="w-6 h-6 object-contain" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-0.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.href)}
                    className={`
                      w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-left transition-all duration-200 group relative
                      ${isActive
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border-l-2 border-indigo-400 shadow-lg shadow-indigo-500/10"
                        : "text-slate-400 hover:bg-slate-700/50 hover:text-white hover:translate-x-1"
                      }
                    `}
                    title={item.name}
                  >
                    <div className="flex items-center justify-center min-w-[24px]">
                      <Icon
                        className={`
                          h-5 w-5 flex-shrink-0 transition-all duration-200
                          ${isActive
                            ? "text-indigo-400 scale-110"
                            : "text-slate-500 group-hover:text-indigo-400 group-hover:scale-110"
                          }
                        `}
                      />
                    </div>

                    {/* Badge for collapsed state */}
                    {item.badge && (
                      <div className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-indigo-500 border-2 border-slate-800 shadow-lg">
                        <span className="text-[10px] font-medium text-white">
                          {parseInt(item.badge) > 9 ? '9+' : item.badge}
                        </span>
                      </div>
                    )}

                    {/* Tooltip for collapsed state */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-slate-700">
                      {item.name}
                      {item.badge && (
                        <span className="ml-1.5 px-1 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-full text-[10px] border border-indigo-400/50">
                          {item.badge}
                        </span>
                      )}
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45 border-l border-t border-slate-700" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section with logout */}
        <div className="mt-auto border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
          {/* Logout Button */}
          <div className="p-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2.5 rounded-lg text-left transition-all duration-200 group relative text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:translate-x-1"
              title="Logout"
            >
              <div className="flex items-center justify-center min-w-[24px]">
                <LogOut className="h-5 w-5 flex-shrink-0 text-red-400 group-hover:text-red-300 group-hover:scale-110 transition-all duration-200" />
              </div>

              {/* Tooltip for collapsed state */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-slate-700">
                Logout
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45 border-l border-t border-slate-700" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
