import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LayoutDashboard,
  Upload,
  Users,
  BarChart3,
  LogOut,
  TrendingUp,
  Building2,
  Moon,
  Sun,
  ClipboardList,
  GraduationCap,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Trophy,
  FileText
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ClipboardList, label: 'KRA', path: '/kra' },
  { icon: DollarSign, label: 'Revenue', path: '/revenue' },
  { icon: GraduationCap, label: 'Enrolled', path: '/enrolled' },
  { icon: BarChart3, label: 'Individual BDE', path: '/analytics' },
  { icon: Users, label: 'Teams', path: '/teams' },
  { icon: TrendingUp, label: 'Performance', path: '/performance' },
  { icon: Trophy, label: 'Kaante Ki Takkar', path: '/march-madness' },
  { icon: Trophy, label: 'Hike Wrapped', path: '/wrapped' },
  { icon: FileText, label: 'Write up', path: '/write-up' },
];

const adminItems = [
  { icon: Upload, label: 'Upload Data', path: '/admin/upload' },
  { icon: Building2, label: 'Manage Teams', path: '/admin/teams' },
];

export interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    setIsHovered(false);
    setIsLocked(true);
    const timer = setTimeout(() => setIsLocked(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // When hovering, we effectively act as if it's not collapsed
  const isEffectiveCollapsed = isCollapsed && !isHovered;

  // Define role-based access
  const isAdmin = user?.role === 'Admin';
  const isOperations = user?.role === 'Operations Leader';
  const isHR = user?.role === 'HR';
  const isOpsExecutive = user?.role === 'Operations Executive';
  const isDBM = user?.role === 'Deputy Branch Manager';
  const isTeamLeader = user?.role === 'Team Leader' || user?.role === 'Proposed Team Leader (PTL)';
  const isATL = user?.role === 'Assistant Team Leader (ATL)' || user?.role === 'Proposed Assistant Team Leader (PATL)';
  const isPerformer = user?.role === 'Business Development Executive' ||
    user?.role === 'Business Development Manager (BDM)' ||
    user?.role === 'Senior Business Development Manager (Sr. BDM)';
  const isVP = user?.role === 'Vice President';

  // Show admin items for Admin only
  const showAdminItems = isAdmin;

  // Filter nav items based on role
  const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
      'Admin': 'Super Admin',
      'Operations Leader': 'Ops - Admin',
      'HR': 'HR',
      'Operations Executive': 'Ops Executive',
      'Vice President': 'VP - Admin',
      'Deputy Branch Manager': 'DBM',
      'Team Leader': 'TL',
      'Proposed Team Leader (PTL)': 'PTL',
      'Assistant Team Leader (ATL)': 'ATL',
      'Proposed Assistant Team Leader (PATL)': 'PATL',
      'Senior Business Development Manager (Sr. BDM)': 'Sr. BDM',
      'Business Development Manager (BDM)': 'BDM',
      'Business Development Executive': 'BDE',
    };
    return roleMap[role] || role;
  };

  const visibleNavItems = useMemo(() => {
    // HR only sees allowed items and is explicitly restricted from Write up
    if (isHR) {
      return navItems.filter(item => ['Kaante Ki Takkar', 'Hike Wrapped'].includes(item.label));
    }

    if (isOpsExecutive) {
      return navItems.filter(item => ['Kaante Ki Takkar', 'Hike Wrapped', 'Write up'].includes(item.label));
    }

    let items = [...navItems];

    // Add "My Team" for performers only
    if (isPerformer) {
      items.push({ icon: Users, label: 'My Team', path: '/my-team' });
    }

    return items.filter(item => {
      // Admins and VP can see Performance, Revenue and Enrolled pages
      if (item.label === 'Performance') {
        const allowedPerformanceRoles = ['Admin', 'Super Admin', 'Operations Leader', 'Vice President'];
        return user && allowedPerformanceRoles.includes(user.role);
      }
      if (item.label === 'Revenue') {
        return isAdmin || isVP || isOperations;
      }
      if (item.label === 'Enrolled') {
        return isAdmin || isVP;
      }
      if (item.label === 'Teams') {
        return isAdmin;
      }
      // Hide Individual BDE for performer roles
      if (item.label === 'Individual BDE' && isPerformer) {
        return false;
      }
      if (item.label === 'Hike Wrapped') {
        return true;
      }
      return true;
    });
  }, [isAdmin, isOperations, isHR, isOpsExecutive, isVP, isATL, isPerformer, user]);

  const visibleAdminItems = adminItems.filter(item => {
    // Only Admin can see other admin items
    return isAdmin;
  });

  return (
    <motion.aside
      initial={false}
      onMouseEnter={() => {
        if (isCollapsed && !isLocked) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        width: isEffectiveCollapsed ? 80 : 256,
        transition: { duration: 0.3, ease: "easeInOut" }
      }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 overflow-hidden"
    >
      {/* Logo Section */}
      <div className={`p-4 border-b border-sidebar-border relative ${isEffectiveCollapsed ? 'flex flex-col items-center gap-4' : 'p-6'}`}>
        <div className={`flex items-center gap-3 ${isEffectiveCollapsed ? 'justify-center' : ''}`}>
          <img src="/logo.png" alt="HikeEducation Logo" className="w-10 h-10 rounded-xl flex-shrink-0" />
          {!isEffectiveCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-w-0"
            >
              <h1 className="text-lg font-bold text-sidebar-foreground truncate">HikeEducation Dashboard</h1>
              <p className="text-xs text-muted-foreground">Dashboard v1.0</p>
            </motion.div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={`
            p-1.5 rounded-lg border border-sidebar-border bg-sidebar hover:bg-muted transition-colors text-muted-foreground
            ${isEffectiveCollapsed
              ? 'relative mt-2'
              : 'absolute top-6 right-4'}
          `}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          {!isEffectiveCollapsed && (
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Main
            </p>
          )}
          <div className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    setIsHovered(false);
                    if (item.label === 'Hike Wrapped' || item.path === '/wrapped') {
                      document.documentElement.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                      });
                    }
                  }}
                  className={`nav-item ${isActive ? 'active' : ''} ${isEffectiveCollapsed ? 'justify-center px-0' : ''}`}
                  title={isEffectiveCollapsed ? item.label : ''}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                  {!isEffectiveCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-medium truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {(showAdminItems || isVP || isOperations) && (
          <div>
            {!isEffectiveCollapsed && (
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </p>
            )}
            <div className="space-y-1">
              {visibleAdminItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      setIsHovered(false);
                      if (item.label === 'Hike Wrapped' || item.path === '/wrapped') {
                        document.documentElement.requestFullscreen().catch(err => {
                          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                        });
                      }
                    }}
                    className={`nav-item ${isActive ? 'active' : ''} ${isEffectiveCollapsed ? 'justify-center px-0' : ''}`}
                    title={isEffectiveCollapsed ? item.label : ''}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                    {!isEffectiveCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-medium truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className={`p-4 border-t border-sidebar-border ${isEffectiveCollapsed ? 'flex flex-col items-center' : ''}`}>
        <div className={`flex items-center gap-3 mb-4 ${isEffectiveCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">
              {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          {!isEffectiveCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name || user?.username}
              </p>
              <p className="text-xs text-muted-foreground capitalize truncate">{getRoleLabel(user?.role || '')}</p>
            </motion.div>
          )}
        </div>

        <div className="space-y-1 w-full">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors ${isEffectiveCollapsed ? 'justify-center px-0' : ''}`}
            title={isEffectiveCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            {!isEffectiveCollapsed && <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>}
          </button>

          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors ${isEffectiveCollapsed ? 'justify-center px-0' : ''}`}
            title={isEffectiveCollapsed ? "Sign Out" : ""}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isEffectiveCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
