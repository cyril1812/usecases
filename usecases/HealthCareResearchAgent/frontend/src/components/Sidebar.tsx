import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Search, 
  FileText, 
  Activity, 
  GitBranch, 
  BookOpen, 
  ShieldAlert, 
  LogOut, 
  User as UserIcon,
  FlaskConical,
  BarChart3
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userName, userRole, setLogout } = useAuthStore();

  const menuItems = [
    { name: 'Research Chat', path: '/workspace', icon: Search },
    { name: 'Document Library', path: '/documents', icon: FileText },
    { name: 'Clinical Trials', path: '/clinical', icon: Activity },
    { name: 'Clinical Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Knowledge Graph', path: '/graph', icon: GitBranch },
    { name: 'Research Reports', path: '/reports', icon: BookOpen },
  ];

  // Only show Admin Panel for admin role
  if (userRole === 'admin') {
    menuItems.push({ name: 'System Admin', path: '/admin', icon: ShieldAlert });
  }

  const handleLogout = () => {
    setLogout();
    navigate('/login');
  };

  return (
    <aside className="w-64 h-screen flex flex-col justify-between p-4 border-r border-[var(--border-light)] bg-[var(--bg-sidebar)]">
      <div>
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <FlaskConical className="w-8 h-8 text-[var(--primary)] pulse-glow rounded-lg" />
          <div>
            <h1 className="text-lg font-bold font-['Outfit'] tracking-wide gradient-text">
              AURA
            </h1>
            <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
              Healthcare Copilot
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--primary-glow)] text-[var(--primary)] border-l-2 border-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-dim)]'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Section and Logout */}
      <div className="border-t border-[var(--border-light)] pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center border border-[var(--border-light)]">
            <UserIcon className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold truncate text-[var(--text-main)]">
              {userName || 'Researcher'}
            </h4>
            <p className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider truncate">
              {userRole || 'Researcher'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
