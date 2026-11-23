import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { Button } from '@/components/ui/button';
import { BdePerformanceModal } from '@/components/dashboard/BdePerformanceModal';
import { getBDEData, BDEData } from '@/data/dataProcess';
import { api } from '@/lib/api';
import { SalesRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function Analytics() {
  const { user } = useAuth();
  const [liveRecords, setLiveRecords] = useState<SalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBDE, setSelectedBDE] = useState<BDEData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Function to filter records based on user role
  const filterRecordsByRole = (records: SalesRecord[], allUsers: any[] = []): SalesRecord[] => {
    if (!user) return [];

    switch (user.role) {
      case 'Admin':
      case 'Super Admin':
      case 'Operations Leader':
      case 'Vice President':
        // Full access to all records
        return records;

      case 'Deputy Branch Manager':
      case 'DBM':
        // Only records from their branch
        return records.filter(record => record.branch === user.branch);

      case 'Team Leader':
      case 'Proposed Team Leader (PTL)': {
        const inactiveUsers = new Set(allUsers.filter(u => u.inactive).map(u => (u.name || "").toLowerCase()));
        const userNameLower = user.name?.toLowerCase();
        const assignedAtlNames = new Set((user.assignedAtls || []).map(name => name.toLowerCase()));

        return records.filter(record => {
          const recordBdeLower = (record.bdeName || "").toLowerCase().trim();
          const recordTeamLower = (record.teamName || "").toLowerCase().trim();
          const recordTlLower = (record.teamLeader || "").toLowerCase().trim();
          const recordAtlLower = (record.atl || "").toLowerCase().trim();
          const tlNameLower = userNameLower.trim();
          const tlTeamStr = `team ${tlNameLower}`;

          // Individual matches:
          // 1. Their own data
          if (recordBdeLower === tlNameLower) return true;

          // 2. Records where the teamName matches their name or "Team [Name]"
          const tlWords = tlNameLower.split(' ').filter(word => word.length > 2);
          const matchesTeamName = recordTeamLower === tlTeamStr ||
            recordTeamLower === tlNameLower ||
            (recordTeamLower.includes(tlNameLower) && recordTeamLower.includes('team')) ||
            (tlWords.length > 0 && tlWords.some(word => recordTeamLower.includes(word)) && recordTeamLower.includes('team'));

          if (matchesTeamName) return true;

          // 3. Records where they are the designated Team Leader (Historical)
          if (recordTlLower === tlNameLower) return true;
          if (recordAtlLower && assignedAtlNames.has(recordAtlLower)) return true;
          if (recordTlLower && assignedAtlNames.has(recordTlLower)) return true;

          return false;
        });
      }

      case 'Assistant Team Leader (ATL)':
      case 'Proposed Assistant Team Leader (PATL)': {
        const inactiveUsersATL = new Set(allUsers.filter(u => u.inactive).map(u => (u.name || "").toLowerCase()));
        const userNameLower = user.name?.toLowerCase();

        return records.filter(record => {
          const recordBdeLower = (record.bdeName || "").toLowerCase().trim();
          const recordTeamLower = (record.teamName || "").toLowerCase().trim();
          const recordAtlLower = (record.atl || "").toLowerCase().trim();
          const recordTlLower = (record.teamLeader || "").toLowerCase().trim();
          const atlNameLower = userNameLower.trim();
          const atlTeamStr = `team ${atlNameLower}`;

          // Individual matches:
          // 1. Their own data
          if (recordBdeLower === atlNameLower) return true;

          // 2. Records where the teamName matches their name or "Team [Name]"
          const tlWords = atlNameLower.split(' ').filter(word => word.length > 2);
          const matchesTeamName = recordTeamLower === atlTeamStr ||
            recordTeamLower === atlNameLower ||
            (recordTeamLower.includes(atlNameLower) && recordTeamLower.includes('team')) ||
            (tlWords.length > 0 && tlWords.some(word => recordTeamLower.includes(word)) && recordTeamLower.includes('team'));

          if (matchesTeamName) return true;

          // 3. Records where they are the designated ATL or TL (Historical)
          if (recordAtlLower === atlNameLower) return true;
          if (recordTlLower === atlNameLower) return true;

          return false;
        });
      }

      case 'Business Development Executive':
      case 'Business Development Manager (BDM)':
      case 'Senior Business Development Manager (Sr. BDM)':
        // Only their own records
        return records.filter(record => record.bdeName?.toLowerCase() === user.name?.toLowerCase());

      default:
        return records;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const [records, usersData] = await Promise.all([
          api.getMasterData(),
          api.getUsers()
        ]);
        const filteredRecords = filterRecordsByRole(records, usersData);
        setLiveRecords(filteredRecords);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch master data:", error);
        setError("Failed to fetch data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const bdeData = useMemo(() => {
    // If searching, include inactive users so they can be found
    const isSearching = !!searchQuery.trim();
    const includeInactive = showInactive;

    let data = getBDEData(
      liveRecords,
      selectedBranch === 'all' ? undefined : selectedBranch,
      selectedTeam === 'all' ? undefined : selectedTeam,
      undefined,
      undefined,
      includeInactive
    );

    if (isSearching) {
      data = data.filter(bde =>
        bde.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return data;
  }, [liveRecords, selectedBranch, selectedTeam, searchQuery, showInactive]);

  const handleBDEClick = (bde: BDEData) => {
    setSelectedBDE(bde);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBDE(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout
        title="Individual BDE"
        subtitle="Individual BDE Performance Overview"
        searchQuery=""
        onSearchChange={() => { }}
        liveRecords={liveRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
        onBdeSelect={() => { }}
      >
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (liveRecords.length === 0) {
    const isAdminOrOps = user && (user.role === 'Admin' || user.role === 'Operations Leader');
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-semibold mb-2">No Data Found</h2>
          <p className="text-muted-foreground mb-4">
            It looks like there's no sales data to display. {isAdminOrOps ? 'Please upload a file to get started.' : 'Please contact Admin / Operations team – Aditya or Vaibhav'}
          </p>
          {isAdminOrOps && (
            <a href="/admin/upload" className="text-blue-500 hover:underline">
              Go to Upload Page
            </a>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Individual BDE"
      subtitle="Individual BDE Performance Overview"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      liveRecords={liveRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
      onBdeSelect={(name) => {
        setSearchQuery(name);
        const bde = bdeData.find(b => b.name === name);
        if (bde) handleBDEClick(bde);
      }}
    >
      <div className="space-y-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">BDE Performance Table</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Branch:</span>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {Array.from(new Set(liveRecords.map(r => r.branch))).filter(Boolean).map(branch => (
                        <SelectItem key={branch} value={branch as string}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Team:</span>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {Array.from(new Set(liveRecords.map(r => r.teamLeader))).filter(Boolean).map(team => (
                        <SelectItem key={team} value={team as string}>{team}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {user && ['Admin', 'Super Admin', 'Operations Leader', 'Vice President', 'Deputy Branch Manager', 'DBM'].includes(user.role) && (
                  <Button
                    variant={showInactive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInactive(!showInactive)}
                    className="ml-2"
                  >
                    {showInactive ? "Hide Inactive" : "Show Inactive"}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>BDE Name</th>
                  <th>Team Name</th>
                  <th>Total Target</th>
                  <th>Total Admissions</th>
                  <th>Closed Points</th>
                  <th>Achievement</th>
                </tr>
              </thead>
              <tbody>
                {bdeData.map((bde, index) => (
                  <motion.tr
                    key={bde.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={bde.inactive ? "opacity-60 bg-muted/30" : ""}
                  >
                    <td>
                      <Button
                        variant="ghost"
                        className="p-0 h-auto font-medium text-foreground hover:text-primary"
                        onClick={() => handleBDEClick(bde)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <span>
                            {bde.name}
                            {bde.inactive && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold tracking-wider">Inactive</span>}
                          </span>
                        </div>
                      </Button>
                    </td>
                    <td>
                      <span className="font-medium">{bde.teamName}</span>
                    </td>
                    <td>
                      <span className="font-medium">{bde.totalTarget.toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="font-medium text-success">{bde.totalAdmissions.toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="font-medium text-primary">{bde.totalClosedPoints.toLocaleString()}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 ${bde.avgAchievement >= 80 ? 'text-success' :
                          bde.avgAchievement >= 50 ? 'text-warning' :
                            'text-destructive'
                          }`}>
                          {bde.avgAchievement >= 80 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-semibold">{bde.avgAchievement}%</span>
                        </div>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${bde.avgAchievement >= 80 ? 'bg-success' :
                              bde.avgAchievement >= 50 ? 'bg-warning' :
                                'bg-destructive'
                              }`}
                            style={{ width: `${Math.min(bde.avgAchievement, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <BdePerformanceModal
        isOpen={dialogOpen}
        onClose={handleCloseDialog}
        bdeName={selectedBDE?.name || null}
        records={liveRecords}
      />
    </DashboardLayout>
  );
}
