import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';

export default function StaffPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Staff</h1>
        <p className="text-sm text-slate-500 mt-1">Staff management page (Coming soon)</p>
      </div>

      {/* Quick Access to KDS */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick access</h2>
        <Link
          to="/kds"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
        >
          <ChefHat size={20} />
          Open Kitchen Display System
        </Link>
      </div>
    </div>
  );
}
