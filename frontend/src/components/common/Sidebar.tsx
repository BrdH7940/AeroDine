import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Table,
  Users,
  BarChart3,
  X,
  ChevronDown,
  User,
  LogOut,
  Settings,
  ChefHat,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/tables', label: 'Tables', icon: Table },
  { path: '/staff', label: 'Staff', icon: Users },
  { path: '/kds', label: 'Kitchen Display System', icon: ChefHat },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('admin');

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h1 className="text-2xl font-semibold text-amber-500">AeroDine</h1>
          <button
            onClick={onMobileClose}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${
                    active
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <User size={20} className="text-amber-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">Admin User</p>
                <p className="text-xs text-slate-400 capitalize">{userRole}</p>
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform ${
                  isProfileOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-lg shadow-lg overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setUserRole(userRole === 'admin' ? 'staff' : 'admin');
                      setIsProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Switch to {userRole === 'admin' ? 'Staff' : 'Admin'}
                  </button>
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </>
  );
}
