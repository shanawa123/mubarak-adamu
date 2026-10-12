import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, User as UserIcon, CheckCircle2, FlaskConical, LogOut, ChevronDown } from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenTestSuite: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenTestSuite }) => {
  const { user, switchRole, logout } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'passenger', label: 'Passenger', desc: 'Fatima Aliyu' },
    { role: 'driver', label: 'Driver', desc: 'Aminu Garba' },
    { role: 'operator', label: 'Operator', desc: 'Dan-Alhaji Fleet' },
    { role: 'admin', label: 'Administrator', desc: 'Mallam Usman' },
    { role: 'security_officer', label: 'Security Officer', desc: 'Insp. Lawal Zamfara' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setCurrentTab('home')}
          className="text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 text-left"
        >
          <span className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
            S
          </span>
          <span>ShinkafiRide<span className="text-emerald-400">.ng</span></span>
        </button>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-300">
          <button
            onClick={() => setCurrentTab('home')}
            className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'home' ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentTab('passenger')}
            className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'passenger' ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            Passenger
          </button>
          <button
            onClick={() => setCurrentTab('driver')}
            className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'driver' ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            Driver
          </button>
          <button
            onClick={() => setCurrentTab('operator')}
            className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'operator' ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            Operators
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'admin' ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setCurrentTab('security')}
            className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'security' ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Security</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action with Switch Persona Dropdown & Test Suite trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenTestSuite}
            title="Run Platform Quality & Security Automated Tests"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors whitespace-nowrap shrink-0"
          >
            <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test Suite</span>
          </button>

          {/* Quick Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="capitalize">{user ? user.role.replace('_', ' ') : 'Demo User'}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {roleMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 text-xs"
                onMouseLeave={() => setRoleMenuOpen(false)}
              >
                <div className="px-2 py-1.5 border-b border-neutral-800 text-neutral-400 font-medium">
                  Switch Active Role Persona:
                </div>
                <div className="py-1 space-y-0.5">
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        switchRole(r.role);
                        setRoleMenuOpen(false);
                        setCurrentTab(r.role === 'security_officer' ? 'security' : r.role);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        user?.role === r.role ? 'bg-neutral-800 text-emerald-400 font-semibold' : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div>
                        <div>{r.label}</div>
                        <div className="text-[11px] text-neutral-500">{r.desc}</div>
                      </div>
                      {user?.role === r.role && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="pt-1.5 border-t border-neutral-800">
                  <button
                    onClick={() => {
                      logout();
                      setRoleMenuOpen(false);
                      setCurrentTab('home');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Reset / Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
