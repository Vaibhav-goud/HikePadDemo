import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SystemUpdate } from '@/types';
import { api } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  liveRecords?: { bdeName: string; inactive?: boolean }[];
  onBdeSelect?: (bdeName: string) => void;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  actions?: React.ReactNode;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  liveRecords,
  onBdeSelect,
  searchPlaceholder,
  hideSearch,
  actions
}: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [systemUpdate, setSystemUpdate] = useState<SystemUpdate | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  useEffect(() => {
    const fetchUpdate = async () => {
      try {
        const { update } = await api.getLatestUpdate();
        if (update && update.timestamp) {
          const updateDate = new Date(update.timestamp);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - updateDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 7) {
            setSystemUpdate(update);
            setShowUpdate(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch system update:', error);
      }
    };

    if (isAuthenticated) {
      fetchUpdate();
    }
  }, [isAuthenticated]);


  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <main
        className={`flex-1 flex flex-col relative bg-gradient-to-b from-background to-muted/30 transition-[margin] duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        {showUpdate && systemUpdate && (
          <div className="bg-primary/10 border-b border-primary/20 px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4 fill-primary/20" />
              <span>{systemUpdate.name || 'New Update Available!'}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(systemUpdate.timestamp).toLocaleDateString()}
              </span>
            </div>
            <button onClick={() => setShowUpdate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
          {title && (
            <div className={`px-8 transition-all duration-300 ${title ? 'py-4' : 'py-2'}`}>
              <Header
                title={title}
                subtitle={subtitle}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                liveRecords={liveRecords}
                onBdeSelect={onBdeSelect}
                searchPlaceholder={searchPlaceholder}
                hideSearch={hideSearch}
                actions={actions}
              />
            </div>
          )}
        </div>
        <div className="flex-1 p-8 pt-6">
          {children}
        </div>
        <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border bg-background/50 backdrop-blur-sm">
          Designed with Purpose, Developed In-House <br /> @HikeEducation MUM | HYD 2026
        </footer>
      </main>
    </div>
  );
}
