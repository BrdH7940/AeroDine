import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { useUserStore } from '../../store/userStore';
import { authService } from '../../services/auth.service';
import ProfileModal from '../admin/ProfileModal';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const navigationItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/admin/tables', label: 'Tables', icon: Table },
  { path: '/admin/staff', label: 'Staff', icon: Users },
  { path: '/admin/kds', label: 'Kitchen Display System', icon: ChefHat },
  { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, clearUser, initializeAuth } = useUserStore();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    // Initialize auth state on mount
    initializeAuth();
  }, [initializeAuth]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await authService.logout();
    clearUser();
    setIsProfileDropdownOpen(false);
    navigate('/auth/login');
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(false);
    setIsProfileModalOpen(true);
  };

  const handleLogin = () => {
    navigate(`/auth/login?returnUrl=${location.pathname}`);
  };

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
            className="fixed inset-0 backdrop-blur-md z-40 lg:hidden"
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
          {!isAuthenticated ? (
            <button
              onClick={handleLogin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 transition-colors text-white font-medium"
            >
              <User size={20} />
              <span>Login</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <User size={20} className="text-amber-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-slate-400 capitalize">{user?.role || 'user'}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${
                    isProfileDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-lg shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={handleProfileClick}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Settings size={16} />
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Return Menu Button */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => navigate('/customer/menu')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-white font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Return menu</span>
          </button>
        </div>
      </aside>

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </>
  );
}
