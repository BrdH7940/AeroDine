import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu as MenuIcon } from 'lucide-react';
import Sidebar from './Sidebar';
import { ModalProvider } from '../../contexts/ModalContext';

export default function Layout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <ModalProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MenuIcon size={24} className="text-slate-700" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">AeroDine</h1>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-slate-50">
            <Outlet />
          </main>
        </div>
      </div>
    </ModalProvider>
  );
}
