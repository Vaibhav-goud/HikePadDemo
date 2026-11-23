import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, Calendar, Building2, Briefcase, ShieldCheck, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  branches: string[];
  drives: string[];
  months: string[];
  financialYears: string[];
  selectedBranch: string;
  selectedDrive: string;
  selectedMonth: string;
  selectedFinancialYear: string;
  onBranchChange: (branch: string) => void;
  onDriveChange: (drive: string) => void;
  onMonthChange: (month: string) => void;
  onFinancialYearChange: (fy: string) => void;
  onMyReportToggle?: () => void;
  isMyReportActive?: boolean;
  showViewAll?: boolean;
  onViewAll?: () => void;
  showNonLeadersOption?: boolean;
  isNonLeadersActive?: boolean;
  onNonLeadersToggle?: () => void;
}

export function FilterBar({
  branches,
  drives,
  months,
  financialYears,
  selectedBranch,
  selectedDrive,
  selectedMonth,
  selectedFinancialYear,
  onBranchChange,
  onDriveChange,
  onMonthChange,
  onFinancialYearChange,
  onMyReportToggle,
  isMyReportActive = false,
  showViewAll = false,
  onViewAll,
  showNonLeadersOption = false,
  isNonLeadersActive = false,
  onNonLeadersToggle,
}: FilterBarProps) {
  const { user } = useAuth();

  // Hide branch filter for DBM, Team Leader, and BDE roles
  const shouldShowBranchFilter = ['Admin', 'Operations Leader', 'Vice President', 'Super Admin'].includes(user?.role || '');

  // Show My Report button for DBM, Team Leader (inc PTL), and ATL (inc PATL)
  const shouldShowMyReport = [
    'Deputy Branch Manager',
    'Team Leader',
    'Proposed Team Leader (PTL)',
    'Assistant Team Leader (ATL)',
    'Proposed Assistant Team Leader (PATL)'
  ].includes(user?.role || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-[81px] z-30 glass-card p-4 mb-8 backdrop-blur-md bg-card/60 border-b border-border/50 shadow-lg mx-[-32px] px-8 rounded-none border-x-0"
    >
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        {/* Financial Year Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedFinancialYear}
            onChange={(e) => onFinancialYearChange(e.target.value)}
            className="input-field py-2 pr-8 text-sm min-w-[130px]"
          >
            <option value="">All FYs</option>
            {financialYears.map(fy => (
              <option key={fy} value={fy}>FY {fy}-{parseInt(fy)%100 + 1}</option>
            ))}
          </select>
        </div>

        {/* Branch Filter - Only show for Admin and Operations */}
        {shouldShowBranchFilter && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="input-field py-2 pr-8 text-sm min-w-[180px]"
            >
              <option value="">All Branches</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        )}

        {/* Drive Filter */}
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedDrive}
            onChange={(e) => onDriveChange(e.target.value)}
            className="input-field py-2 pr-8 text-sm min-w-[150px]"
          >
            <option value="">
              {drives.length === 0 ? 'No drives available' : 'All Drives'}
            </option>
            {drives.map(drive => (
              <option key={drive} value={drive}>{drive}</option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="input-field py-2 pr-8 text-sm min-w-[140px]"
          >
            <option value="">All Months</option>
            {months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>

        {/* My Report Button - Only for DBM and Team Leader */}
        {shouldShowMyReport && onMyReportToggle && (
          <button
            onClick={onMyReportToggle}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isMyReportActive
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
          >
            {isMyReportActive ? 'My Team' : 'My Report'}
          </button>
        )}

        {/* View All Button */}
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
          >
            View All
          </button>
        )}

        {/* Non Leaders Toggle */}
        {showNonLeadersOption && onNonLeadersToggle && (
          <button
            onClick={onNonLeadersToggle}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-widest rounded-lg transition-all border flex items-center ${isNonLeadersActive
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-sm shadow-amber-500/10'
              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted/80'
              }`}
          >
            <Users className={cn("w-4 h-4 mr-2 transition-transform", isNonLeadersActive && "scale-110")} />
            {isNonLeadersActive ? 'Showing Non-Leaders' : 'Non-Leaders'}
          </button>
        )}

        {/* Clear Filters */}
        {(selectedBranch || selectedDrive || selectedMonth || selectedFinancialYear) && (
          <button
            onClick={() => {
              onBranchChange('');
              onDriveChange('');
              onMonthChange('');
              onFinancialYearChange('');
            }}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </motion.div>
  );
}
