import { useState, useMemo } from 'react';
import { Bell, Search, ChevronDown, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { INDIVIDUALS_HIDDEN_FROM_TRACKING } from '@/data/dataProcess';

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  liveRecords?: { bdeName: string; inactive?: boolean; role?: string }[];
  onBdeSelect?: (bdeName: string) => void;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  actions?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  searchQuery = "",
  onSearchChange = () => { },
  liveRecords = [],
  onBdeSelect = () => { },
  searchPlaceholder = "Search by BDE name...",
  hideSearch = false,
  actions
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Hide search only for BDE role or if explicitly hidden
  const shouldShowSearch = !hideSearch && user?.role !== 'Business Development Executive';

  const bdeNames = useMemo(() => {
    const names = new Set(liveRecords.filter(r => !r.inactive && !INDIVIDUALS_HIDDEN_FROM_TRACKING.includes(r.bdeName.toLowerCase()) && r.role !== 'Operations Executive').map(r => r.bdeName));
    return Array.from(names);
  }, [liveRecords]);

  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    return bdeNames
      .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 5); // Show top 5 suggestions
  }, [searchQuery, bdeNames]);

  const handleSuggestionClick = (name: string) => {
    onBdeSelect(name);
    onSearchChange('');
    setShowSuggestions(false);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="grid grid-cols-3 items-center gap-4"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {title}
          </span>
        </h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm font-medium truncate">{subtitle}</p>}
      </div>

      <div className="flex justify-center">
        {actions}
      </div>

      <div className="flex items-center justify-end gap-4">
        {/* Search - Only show for Admin, Operations, and DBM */}
        {shouldShowSearch && (
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-md shadow-lg z-10">
                {suggestions.map(name => (
                  <div
                    key={name}
                    className="px-4 py-2 hover:bg-muted cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionClick(name);
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </motion.header>
  );
}
