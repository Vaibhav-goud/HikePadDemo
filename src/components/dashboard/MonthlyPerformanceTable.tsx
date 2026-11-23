import { motion } from 'framer-motion';
import { Trophy, Medal, Award, ChevronDown, Filter } from 'lucide-react';
import { TopAchiever } from '@/data/dataProcess';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PerformanceChart } from './PerformanceChart';
import { getBDEChartData } from '@/data/dataProcess';
import { api } from '@/lib/api';
import { SalesRecord } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canUserClickBDEName, canUserSeeMore, isTableReadOnlyForUser, canUserViewBDEChart, filterRecordsByUserRole } from '@/lib/sharedUtilities';

interface MonthlyPerformanceTableProps {
  achievers: TopAchiever[];
  title: string;
  fullAchievers?: TopAchiever[];
  onSeeMore?: (filterActive: boolean) => void;
  readOnly?: boolean; // New prop to make table completely non-clickable
}

export function MonthlyPerformanceTable({ achievers, title, fullAchievers, onSeeMore, readOnly = false }: MonthlyPerformanceTableProps) {
  const { user } = useAuth();
  const [liveRecords, setLiveRecords] = useState<SalesRecord[]>([]);
  const [selectedBDE, setSelectedBDE] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showHighTargetOnly, setShowHighTargetOnly] = useState(false);

  useEffect(() => {
    // We still fetch this for the indivdual charts in the modal, 
    // but we check if we already have it to avoid unnecessary state updates
    const fetchData = async () => {
      try {
        const records = await api.getMasterData();
        // Use all records so metadata is available for clickability checks
        setLiveRecords(records);
      } catch (error) {
        console.error("Failed to fetch records:", error);
      }
    };
    fetchData();
  }, [user]);

  // Function to filter records based on user role (now simplified)
  // const filterRecordsByRole = (records: SalesRecord[]): SalesRecord[] => {
  //   return filterRecordsByUserRole(records, user);
  // };

  const handleBDEClick = (bdeName: string) => {
    // If table is read-only, don't allow clicking
    if (readOnly) return;
    if (!user) return;

    const bdeRecord = liveRecords.find(r => r.bdeName === bdeName && r.isCurrentTeamMember) || liveRecords.find(r => r.bdeName === bdeName);

    // Check if user can view this BDE's chart
    if (canUserViewBDEChart(user, bdeName, bdeRecord)) {
      setSelectedBDE(bdeName);
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBDE(null);
  };

  const fullDisplayAchievers = useMemo(() => {
    const baseAchievers = fullAchievers || achievers;
    if (showHighTargetOnly && title === "Overall Performance") {
      // Filter achievers with target >= 10
      return baseAchievers.filter(achiever => achiever.totalTarget >= 10).sort((a, b) => b.achievement - a.achievement);
    }
    return baseAchievers;
  }, [fullAchievers, achievers, showHighTargetOnly, title]);

  const displayAchievers = useMemo(() => {
    let filtered = fullDisplayAchievers;

    // Apply filtering at data level (before pagination/slicing)
    if (showHighTargetOnly && title === "Overall Performance") {
      filtered = fullDisplayAchievers.filter(achiever => achiever.totalTarget >= 10).sort((a, b) => b.achievement - a.achievement);
    }

    // Show at least 5 rows if data exists, or show top 5 otherwise
    const result = filtered.slice(0, 5);

    // Only pad with placeholders if we have fewer than 5 rows AND there's no filter active
    // With filter active, show exactly what matches, but at least 5 rows if available
    if (!showHighTargetOnly && result.length < 5) {
      while (result.length < 5) {
        result.push({
          name: '—',
          branch: '—',
          teamLeader: '—',
          totalTarget: 0,
          totalAdmissions: 0,
          totalClosedPoints: 0,
          achievement: 0
        });
      }
    }
    return result;
  }, [fullDisplayAchievers, showHighTargetOnly, title]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            {title}
          </h3>
          {title === "Overall Performance" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHighTargetOnly(!showHighTargetOnly)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showHighTargetOnly ? 'Show All' : 'Target ≥ 10'}
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table font-sans">
          <thead>
            <tr>
              <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rank</th>
              <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">BDE Name</th>
              <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Leader</th>
              <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
              <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Points</th>
              <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Achievement</th>
            </tr>
          </thead>
          <tbody>
            {displayAchievers.map((achiever, index) => (
              <motion.tr
                key={`${achiever.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={index < 3 && achiever.name !== '—' ? 'bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20' : ''}
              >
                <td>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-gray-400' :
                        index === 2 ? 'text-amber-600' :
                          'text-muted-foreground'
                      }`}>
                      #{index + 1}
                    </span>
                    {index === 0 && achiever.name !== '—' && <Trophy className="w-4 h-4 text-yellow-500" />}
                    {index === 1 && achiever.name !== '—' && <Medal className="w-4 h-4 text-gray-400" />}
                    {index === 2 && achiever.name !== '—' && <Award className="w-4 h-4 text-amber-600" />}
                  </div>
                </td>
                <td>
                  {achiever.name === '—' ? (
                    <span className="font-medium text-muted-foreground">{achiever.name}</span>
                  ) : (() => {
                    const bdeRecord = liveRecords.find(r => r.bdeName === achiever.name && r.isCurrentTeamMember) || liveRecords.find(r => r.bdeName === achiever.name);
                    const canClick = canUserClickBDEName(user, achiever.name, bdeRecord);

                    if (canClick) {
                      return (
                        <Button
                          variant="ghost"
                          className="p-0 h-auto font-medium text-foreground hover:text-primary"
                          onClick={() => handleBDEClick(achiever.name)}
                        >
                          {achiever.name}
                        </Button>
                      );
                    } else {
                      return (
                        <span className="font-medium text-foreground cursor-not-allowed opacity-60">
                          {achiever.name}
                        </span>
                      );
                    }
                  })()}
                </td>
                <td>
                  <span className="text-muted-foreground">{achiever.teamLeader}</span>
                </td>
                <td>
                  <span className="font-medium">{achiever.name === '—' ? '—' : achiever.totalTarget.toLocaleString()}</span>
                </td>
                <td>
                  <span className="font-medium text-primary">{achiever.name === '—' ? '—' : achiever.totalClosedPoints.toLocaleString()}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{achiever.name === '—' ? '—' : `${achiever.achievement}%`}</span>
                    {achiever.name !== '—' && (
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${Math.min(achiever.achievement, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {canUserSeeMore(user) && onSeeMore && (
        <div className="p-4 border-t border-border text-center">
          <Button
            variant="outline"
            onClick={() => onSeeMore(showHighTargetOnly)}
            className="flex items-center gap-2"
          >
            See More
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedBDE} - Individual Performance</DialogTitle>
          </DialogHeader>
          {selectedBDE && (
            <PerformanceChart
              data={getBDEChartData(liveRecords, selectedBDE)}
              title={`${selectedBDE} Performance`}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
