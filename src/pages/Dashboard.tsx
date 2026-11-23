import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import { KPICard } from '@/components/dashboard/KPICard';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { TeamTable } from '@/components/dashboard/TeamTable';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { MonthlyPerformanceTable } from '@/components/dashboard/MonthlyPerformanceTable';
import { FullAchieversModal } from '@/components/dashboard/FullAchieversModal';
import { TeamPopupChart } from '@/components/dashboard/TeamPopupChart';
import { getKPIData, getTeamData, getMonthlyChartData, getTopAchieversData, getChronologicalValue, MONTHS as fiscalMonthOrder } from '@/data/dataProcess';
import { dummySalesRecords, dummyUsers, dummyDrives } from '@/data/dummyData';
import { api } from '@/lib/api';
import { BdePerformanceModal } from '@/components/dashboard/BdePerformanceModal';
import { SalesRecord, User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [liveRecords, setLiveRecords] = useState<SalesRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDrive, setSelectedDrive] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
  const [drives, setDrives] = useState<any[]>([]);
  const [overallModalOpen, setOverallModalOpen] = useState(false);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [bdeModalOpen, setBdeModalOpen] = useState(false);
  const [selectedBde, setSelectedBde] = useState<string | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{ name: string; leader: string } | null>(null);
  const [isMyReportActive, setIsMyReportActive] = useState(false);
  const [applyTargetFilter, setApplyTargetFilter] = useState(false);

  // Separate data for performance tables (shows all branches regardless of user role)
  const [allRecords, setAllRecords] = useState<SalesRecord[]>([]);

  const handleBdeSelect = (bdeName: string) => {
    console.log("Selected BDE:", bdeName);
    setSelectedBde(bdeName);
    setBdeModalOpen(true);
    console.log("bdeModalOpen set to true");
  };

  const handleMyReportToggle = () => {
    setIsMyReportActive(!isMyReportActive);
    // Reset filters when toggling my report mode
    setSelectedBranch('');
    setSelectedDrive('');
    setSelectedMonth('');
    setSelectedFinancialYear('');
  };

  const handleTeamSelect = (teamName: string, teamLeader: string) => {
    setSelectedTeam({ name: teamName, leader: teamLeader });
    setTeamModalOpen(true);
  };



  // Function to filter records based on user role
  const filterRecordsByRole = (records: SalesRecord[], allUsers: User[] = []): SalesRecord[] => {
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
        // If My Report is active, only show their own performance data
        if (isMyReportActive) {
          return records.filter(record => record.bdeName === user.name);
        }
        // Only records from their branch
        return records.filter(record => record.branch === user.branch);

      case 'Team Leader':
      case 'Proposed Team Leader (PTL)': {
        // If My Report is active, only show their own performance data
        if (isMyReportActive) {
          return records.filter(record => record.bdeName?.toLowerCase() === user.name?.toLowerCase());
        }

        const inactiveUsers = new Set(allUsers.filter(u => u.inactive).map(u => (u.name || "").toLowerCase()));
        const userNameLower = user.name?.toLowerCase();
        const assignedAtlNames = new Set((user.assignedAtls || []).map(name => name.toLowerCase()));

        return records.filter(record => {
          const recordBdeLower = record.bdeName?.toLowerCase();
          const recordTLLower = record.teamLeader?.toLowerCase();
          const recordATLLower = record.atl?.toLowerCase();

          return recordBdeLower === userNameLower ||
            recordTLLower === userNameLower ||
            (recordATLLower && assignedAtlNames.has(recordATLLower)) ||
            (recordTLLower && assignedAtlNames.has(recordTLLower));
        });
      }

      case 'Assistant Team Leader (ATL)':
      case 'Proposed Assistant Team Leader (PATL)': {
        // If My Report is active, only show their own performance data
        if (isMyReportActive) {
          return records.filter(record => record.bdeName?.toLowerCase() === user.name?.toLowerCase());
        }

        const inactiveUsersATL = new Set(allUsers.filter(u => u.inactive).map(u => (u.name || "").toLowerCase()));
        const userNameLower = user.name?.toLowerCase();

        return records.filter(record => {
          const recordBdeLower = record.bdeName?.toLowerCase();
          const recordTLLower = record.teamLeader?.toLowerCase();
          const recordATLLower = record.atl?.toLowerCase();

          return recordBdeLower === userNameLower ||
            recordTLLower === userNameLower ||
            recordATLLower === userNameLower;
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

  // Load sales records and drives on component mount (using dummy data for demo)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Use dummy data directly on the dashboard
        const records = dummySalesRecords;
        const usersData = dummyUsers;
        const drivesData = dummyDrives;

        // Filter out any records that belong to a financial year < 2025
        const validRecords = records.filter(r => {
          const yearNum = parseInt(r.fy) || 2025;
          let fy = yearNum;
          if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
            fy = yearNum - 1;
          }
          return fy >= 2025;
        });

        const filteredRecords = user ? filterRecordsByRole(validRecords, usersData) : validRecords;
        setLiveRecords(filteredRecords);
        setAllRecords(validRecords); // Store all records for performance tables
        setUsers(usersData);
        setDrives(drivesData);
      } catch (error) {
        console.error("Failed to load dashboard dummy data:", error);
        setLiveRecords(dummySalesRecords);
        setAllRecords(dummySalesRecords);
        setUsers(dummyUsers);
        setDrives(dummyDrives);
      }
      setIsLoading(false);
    };

    fetchData();

    // Refetch drives when window gains focus
    const handleFocus = () => {
      setDrives(dummyDrives);
    };

    // Listen for team membership changes from AdminTeams page
    const handleTeamMembershipChange = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('teamMembershipChanged', handleTeamMembershipChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('teamMembershipChanged', handleTeamMembershipChange);
    };
  }, [user, isMyReportActive]);

  const handleTeamChanged = (bdeName: string, newTeamLeader: string, month: string, branch: string) => {
    setLiveRecords(prevRecords => {
      return prevRecords.map(record => {
        if (record.bdeName === bdeName && record.month === month && record.branch === branch) {
          return { ...record, teamLeader: newTeamLeader };
        }
        return record;
      });
    });
  };

  // Memoized lists for filters, derived from live data
  const availableBranches = useMemo(() => {
    const branches = new Set(liveRecords.map(r => r.branch));
    return Array.from(branches);
  }, [liveRecords]);

  const getFinancialYear = (r: SalesRecord) => {
    const yearNum = parseInt(r.fy) || 2025;
    if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
      return (yearNum - 1).toString();
    }
    return yearNum.toString();
  };

  const availableFinancialYears = useMemo(() => {
    const years = new Set(liveRecords.map(r => getFinancialYear(r)).filter(fy => fy));
    return Array.from(years).sort().reverse(); // Show latest years first
  }, [liveRecords]);

  const availableDrives = useMemo(() => {
    if (!drives) return [];

    // Return unique drive names (assuming names are unique)
    const uniqueDrives = new Set(drives.map(drive => drive.name));
    return Array.from(uniqueDrives);
  }, [drives]);

  const overallFilteredRecords = useMemo(() => {
    let records = liveRecords;
    if (selectedBranch) records = records.filter(r => r.branch === selectedBranch);
    if (selectedFinancialYear) records = records.filter(r => getFinancialYear(r) === selectedFinancialYear);

    if (selectedDrive) {
      // selectedDrive is the drive name
      const matchedDrive = drives.find(d => d.name === selectedDrive);

      if (matchedDrive) {
        // Derive drive financial year from its name
        let driveFY = '';
        if (matchedDrive.name.includes('2025')) driveFY = '2025';
        else if (matchedDrive.name.includes('2026')) {
          if (matchedDrive.name.toLowerCase().includes('jan')) driveFY = '2025'; // Jan 2026 is FY 2025-26
          else driveFY = '2026';
        }

        const monthToNumber: Record<string, number> = {
          'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
          'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
        };
        records = records.filter(r => {
          if (driveFY && getFinancialYear(r) !== driveFY) return false;

          const recordMonthNum = monthToNumber[r.month];
          if (matchedDrive.startMonth <= matchedDrive.endMonth) {
            // Drive is within the same calendar year (e.g., April to September)
            return recordMonthNum >= matchedDrive.startMonth && recordMonthNum <= matchedDrive.endMonth;
          } else {
            // Drive spans across calendar years (e.g., November to February)
            return recordMonthNum >= matchedDrive.startMonth || recordMonthNum <= matchedDrive.endMonth;
          }
        });
      } else {
        // If no matching drive found, clear filter
        records = [];
      }
    }
    return records;
  }, [liveRecords, selectedBranch, selectedDrive, drives, selectedFinancialYear]);

  const availableMonths = useMemo(() => {
    if (!selectedFinancialYear) {
      // Create month - FY pairs using the direct calendar year (r.fy), ignoring placeholders
      const pairs = new Set<string>();
      overallFilteredRecords.forEach(r => {
        if (r.month && r.fy && !r.isPlaceholder) {
          pairs.add(`${r.month} - ${r.fy}`);
        }
      });
      // Sort these pairs chronologically using getChronologicalValue
      return Array.from(pairs).sort((a, b) => {
        const [aMonth, aFY] = a.split(" - ");
        const [bMonth, bFY] = b.split(" - ");
        const aChrono = getChronologicalValue(aFY, aMonth);
        const bChrono = getChronologicalValue(bFY, bMonth);
        return aChrono - bChrono;
      });
    } else {
      // Just month names, ignoring placeholders
      const months = new Set(
        overallFilteredRecords.filter(r => !r.isPlaceholder).map(r => r.month)
      );
      return Array.from(months).sort((a, b) => fiscalMonthOrder.indexOf(a) - fiscalMonthOrder.indexOf(b));
    }
  }, [overallFilteredRecords, selectedFinancialYear]);

  const lastMonthName = useMemo(() => {
    // Use allRecords instead of liveRecords to find the branch-specific latest month
    let recordsToConsider = allRecords.filter(r => !r.isPlaceholder);
    if (selectedBranch) recordsToConsider = recordsToConsider.filter(r => r.branch === selectedBranch);

    if (recordsToConsider.length === 0) return '';

    if (!selectedFinancialYear) {
      // Find the absolute latest calendar month-year combination
      let maxChrono = -1;
      let latestPair = '';
      recordsToConsider.forEach(r => {
        if (r.month && r.fy) {
          const chrono = getChronologicalValue(r.fy, r.month);
          if (chrono > maxChrono) {
            maxChrono = chrono;
            latestPair = `${r.month} - ${r.fy}`;
          }
        }
      });
      return latestPair;
    } else {
      recordsToConsider = recordsToConsider.filter(r => getFinancialYear(r) === selectedFinancialYear);
      if (recordsToConsider.length === 0) return '';
      const monthsInData = new Set(recordsToConsider.map(r => r.month));
      let latestMonth = '';
      let latestMonthIndex = -1;

      monthsInData.forEach(month => {
        const index = fiscalMonthOrder.indexOf(month);
        if (index > latestMonthIndex) {
          latestMonthIndex = index;
          latestMonth = month;
        }
      });

      return latestMonth;
    }
  }, [allRecords, selectedBranch, selectedFinancialYear]);

  const lastMonthNameGlobal = useMemo(() => {
    // Finds the global latest month across all branches
    let recordsToConsider = allRecords.filter(r => !r.isPlaceholder);
    if (recordsToConsider.length === 0) return '';

    if (!selectedFinancialYear) {
      // Find the absolute latest calendar month-year combination globally
      let maxChrono = -1;
      let latestPair = '';
      recordsToConsider.forEach(r => {
        if (r.month && r.fy) {
          const chrono = getChronologicalValue(r.fy, r.month);
          if (chrono > maxChrono) {
            maxChrono = chrono;
            latestPair = `${r.month} - ${r.fy}`;
          }
        }
      });
      return latestPair;
    } else {
      recordsToConsider = recordsToConsider.filter(r => getFinancialYear(r) === selectedFinancialYear);
      if (recordsToConsider.length === 0) return '';
      const monthsInData = new Set(recordsToConsider.map(r => r.month));
      let latestMonth = '';
      let latestMonthIndex = -1;

      monthsInData.forEach(month => {
        const index = fiscalMonthOrder.indexOf(month);
        if (index > latestMonthIndex) {
          latestMonthIndex = index;
          latestMonth = month;
        }
      });

      return latestMonth;
    }
  }, [allRecords, selectedFinancialYear]);

  const monthlyFilteredRecords = useMemo(() => {
    let records = overallFilteredRecords;
    // If a month is selected, filter by it.
    // If NO month is selected, default to the latest available month (lastMonthName)
    // This ensures the Monthly Performance table shows the latest month by default.
    const effectiveMonth = selectedMonth || lastMonthName;

    if (effectiveMonth) {
      if (effectiveMonth.includes(' - ')) {
        const [monthName, fyName] = effectiveMonth.split(' - ');
        records = records.filter(r => r.month === monthName && r.fy === fyName);
      } else {
        records = records.filter(r => r.month === effectiveMonth);
      }
    }

    return records;
  }, [overallFilteredRecords, selectedMonth, lastMonthName]);



  // KPI cards should show data for selected month or aggregated data
  const kpiData = useMemo(() => getKPIData(overallFilteredRecords, selectedMonth, selectedBranch), [overallFilteredRecords, selectedMonth, selectedBranch]);

  const teamData = useMemo(() => {
    let records = overallFilteredRecords;
    if (selectedMonth) {
      if (selectedMonth.includes(' - ')) {
        const [monthName, fyName] = selectedMonth.split(' - ');
        records = records.filter(r => r.month === monthName && r.fy === fyName);
      } else {
        records = records.filter(r => r.month === selectedMonth);
      }
    }
    return getTeamData(records);
  }, [overallFilteredRecords, selectedMonth]);
  const activeTeamData = useMemo(() => {
    const inactiveLeaders = new Set(users.filter(u => u.inactive).map(u => u.name));
    console.log("Team Data before filter:", teamData.map(t => t.teamLeader));
    const filtered = teamData.filter(t => !inactiveLeaders.has(t.teamLeader));
    console.log("Team Data after filter:", filtered.map(t => t.teamLeader));
    return filtered;
  }, [teamData, users]);

  const chartData = useMemo(() => getMonthlyChartData(overallFilteredRecords), [overallFilteredRecords]);

  // Performance table data - bypasses all filters to show universal leaderboards
  const overallFilteredRecordsForTables = useMemo(() => {
    return allRecords;
  }, [allRecords]);

  const monthlyFilteredRecordsForTables = useMemo(() => {
    // The monthly performance table changes ONLY when all filters are set to "All" (except month)
    const areOtherFiltersApplied = !!selectedBranch || !!selectedFinancialYear || !!selectedDrive;
    
    // If other filters are active, force the table to stay at the latest global month data
    const effectiveMonth = areOtherFiltersApplied ? lastMonthNameGlobal : (selectedMonth || lastMonthNameGlobal);
    
    if (effectiveMonth) {
      if (effectiveMonth.includes(' - ')) {
        const [monthName, fyName] = effectiveMonth.split(' - ');
        return allRecords.filter(r => r.month === monthName && r.fy === fyName);
      }
      return allRecords.filter(r => r.month === effectiveMonth);
    }
    return allRecords;
  }, [allRecords, selectedMonth, lastMonthNameGlobal, selectedBranch, selectedFinancialYear, selectedDrive]);

  // Build team data from the full records used for tables (so BDEs can see teammates)
  const teamDataForTables = useMemo(() => getTeamData(monthlyFilteredRecordsForTables), [monthlyFilteredRecordsForTables]);
  const activeTeamDataForTables = useMemo(() => {
    const inactiveLeaders = new Set(users.filter(u => u.inactive).map(u => u.name));
    return teamDataForTables.filter(t => !inactiveLeaders.has(t.teamLeader));
  }, [teamDataForTables, users]);






  // Drive Performance Chart Data: July 2026 drive (April to September 2026)
  const drivePerformanceChartData = useMemo(() => {
    // If a specific drive is selected, use the full chart data
    if (selectedDrive) {
      return chartData;
    }

    // Otherwise, show July 2026 drive: April to September 2026
    const july2026Months = new Set(['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER']);
    return chartData.filter(d => {
      // Label is formatted like "Apr '26"
      const parts = d.label.split(" '");
      if (parts.length < 2) return false;
      const monthPart = parts[0].toUpperCase(); // "APR"
      const yearPart = parts[1]; // "26"
      
      const fullMonthName = monthPart === 'APR' ? 'APRIL' :
                            monthPart === 'MAY' ? 'MAY' :
                            monthPart === 'JUN' ? 'JUNE' :
                            monthPart === 'JUL' ? 'JULY' :
                            monthPart === 'AUG' ? 'AUGUST' :
                            monthPart === 'SEP' ? 'SEPTEMBER' : '';
                            
      return july2026Months.has(fullMonthName) && yearPart === '26';
    });
  }, [chartData, selectedDrive]);

  const kpiDataWithBDEAdjustment = kpiData;


  const overallAchievers = useMemo(() => getTopAchieversData(overallFilteredRecordsForTables, 5), [overallFilteredRecordsForTables]);
  const monthlyAchievers = useMemo(() => getTopAchieversData(monthlyFilteredRecordsForTables, 5), [monthlyFilteredRecordsForTables]);
  const fullOverallAchievers = useMemo(() => getTopAchieversData(overallFilteredRecordsForTables, 100), [overallFilteredRecordsForTables]);
  const fullMonthlyAchievers = useMemo(() => getTopAchieversData(monthlyFilteredRecordsForTables, 100), [monthlyFilteredRecordsForTables]);

  useEffect(() => {
    setSelectedDrive('');
    setSelectedMonth('');
    setSelectedFinancialYear('');
  }, [selectedBranch]);

  useEffect(() => {
    setSelectedMonth('');
  }, [selectedDrive]);

  useEffect(() => {
    setSelectedMonth('');
    setSelectedDrive('');
  }, [selectedFinancialYear]);

  if (isLoading) {
    return (
      <DashboardLayout
        title="Dashboard"
        subtitle="Loading data, please wait..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={liveRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
        onBdeSelect={handleBdeSelect}
      >
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[120px] w-full" />)}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    )
  }

  // Define if the user has any "substantial" non-placeholder records
  const hasActualPerformance = liveRecords.some(r => !r.isPlaceholder);

  if (!isLoading && (!liveRecords.length || !hasActualPerformance)) {
    const isAdminOrOps = user && (user.role === 'Admin' || user.role === 'Operations Leader');
    return (
      <DashboardLayout
        title="Welcome"
        subtitle="Get started by uploading your sales data"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={liveRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
        onBdeSelect={handleBdeSelect}
      >
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-semibold mb-2">No Data Found</h2>
          <p className="text-muted-foreground mb-4">
            It looks like there's no sales data to display. {isAdminOrOps ? 'Please upload a file to get started.' : 'Please contact Admins– Aditya/Vaibhav'}
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
      title="Dashboard"
      subtitle="Monitor your sales team's performance in real-time"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      liveRecords={liveRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
      onBdeSelect={handleBdeSelect}
    >

      <FilterBar
        branches={availableBranches}
        drives={availableDrives}
        months={availableMonths}
        financialYears={availableFinancialYears}
        selectedBranch={selectedBranch}
        selectedDrive={selectedDrive}
        selectedMonth={selectedMonth}
        selectedFinancialYear={selectedFinancialYear}
        onBranchChange={setSelectedBranch}
        onDriveChange={setSelectedDrive}
        onMonthChange={setSelectedMonth}
        onFinancialYearChange={setSelectedFinancialYear}
        onMyReportToggle={handleMyReportToggle}
        isMyReportActive={isMyReportActive}
      />

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8"
      >
        {kpiDataWithBDEAdjustment.map((kpi, index) => (
          <KPICard key={kpi.label} data={kpi} index={index} />
        ))}
      </motion.div>

      {/* Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 gap-6 mb-8 pr-6 pb-6 w-full overflow-x-auto"
      >
        <div className="min-w-full">
          <PerformanceChart
            data={chartData}
            title="Overall Performance overview"
            currentDrive={selectedDrive}
          />
        </div>
        <div className="min-w-full">
          <PerformanceChart
            data={drivePerformanceChartData}
            title="Drive Performance"
            currentDrive={selectedDrive}
          />
        </div>
      </motion.div>


      {/* Team Table - Hide for BDE, BDM, Sr. BDM */}
      {!['Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)'].includes(user?.role || '') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <TeamTable
            teams={activeTeamData}
            title="Team Performance Summary"
            onTeamChanged={handleTeamChanged}
            onTeamSelect={handleTeamSelect}
          />
        </motion.div>
      )}

      {/* Performance Tables */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        <MonthlyPerformanceTable
          achievers={overallAchievers}
          title="Overall Performance"
          fullAchievers={fullOverallAchievers}
          onSeeMore={(filterActive) => {
            setApplyTargetFilter(filterActive);
            setOverallModalOpen(true);
          }}
          readOnly={false}
        />
        <MonthlyPerformanceTable
          achievers={monthlyAchievers}
          title="Monthly Performance"
          fullAchievers={fullMonthlyAchievers}
          onSeeMore={(filterActive) => {
            setApplyTargetFilter(filterActive);
            setMonthlyModalOpen(true);
          }}
          readOnly={false}
        />
      </motion.div>

      <FullAchieversModal
        isOpen={overallModalOpen}
        onClose={() => setOverallModalOpen(false)}
        achievers={fullOverallAchievers}
        title="Overall Performance"
        applyTargetFilter={applyTargetFilter}
      />

      <FullAchieversModal
        isOpen={monthlyModalOpen}
        onClose={() => setMonthlyModalOpen(false)}
        achievers={fullMonthlyAchievers}
        title="Monthly Performance"
        applyTargetFilter={applyTargetFilter}
      />

      <BdePerformanceModal
        isOpen={bdeModalOpen}
        onClose={() => setBdeModalOpen(false)}
        bdeName={selectedBde}
        records={liveRecords}
      />

      <TeamPopupChart
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        teamName={selectedTeam?.name || ''}
        teamLeader={selectedTeam?.leader || ''}
        records={liveRecords}
      />
    </DashboardLayout>
  )
}
