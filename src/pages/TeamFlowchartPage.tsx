import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import { TeamFlowchart } from '@/components/dashboard/TeamFlowchart';
import { getTeamData, getChronologicalValue } from '@/data/dataProcess';
import { api } from '@/lib/api';
import { SalesRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamFlowchartPage() {
  const { user } = useAuth();
  const [liveRecords, setLiveRecords] = useState<SalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDrive, setSelectedDrive] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
  const [hasDefaultFYBeenSet, setHasDefaultFYBeenSet] = useState(false);

  const handleBdeSelect = (bdeName: string) => {
    // This page doesn't show BDE performance.
    console.log(`BDE selected: ${bdeName}, but no action is configured on this page.`);
  };

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
        const inactiveUsersValues = new Set(allUsers.filter(u => u.inactive).map(u => (u.name || "").toLowerCase()));
        const userNameLowerValue = user.name?.toLowerCase();
        const assignedAtlNamesValue = new Set((user.assignedAtls || []).map(name => name.toLowerCase()));

        // Primary logic:
        // 1. Their own data
        // 2. Records where they are the designated Team Leader
        // 3. Records where an ATL mapped to them is the Performer
        // 4. Records where an ATL mapped to them is the designated ATL
        // 5. Records where the Team Leader is a mapped ATL
        return records.filter(record => {
          const recordBdeLower = record.bdeName?.toLowerCase();
          const recordAtlLower = record.atl?.toLowerCase();
          const recordTlLower = record.teamLeader?.toLowerCase();

          // 1. Their own data
          if (recordBdeLower === userNameLowerValue) return true;

          // 2. Data where they are the Team Leader (Direct BDEs)
          if (recordTlLower === userNameLowerValue) return true;

          // 3. Data for an ATL explicitly mapped to them (ATL as Performer)
          if (recordBdeLower && assignedAtlNamesValue.has(recordBdeLower)) return true;

          // 4. Data for a performer under an ATL explicitly mapped to them
          if (recordAtlLower && assignedAtlNamesValue.has(recordAtlLower)) return true;

          // 5. Data where the record's Team Leader is an assigned ATL
          if (recordTlLower && assignedAtlNamesValue.has(recordTlLower)) return true;

          return false;
        }).filter(r => !inactiveUsersValues.has(r.bdeName?.toLowerCase() || ''));
      }

      case 'Assistant Team Leader (ATL)':
      case 'Proposed Assistant Team Leader (PATL)':
        const inactiveUsersATL = new Set(allUsers.filter(u => u.inactive).map(u => (u.name || "").toLowerCase()));

        // Identify performers under this ATL
        const currentATLTeamNames = new Set(
          records
            .filter(r => r.atl?.toLowerCase() === user.name?.toLowerCase() && r.isCurrentTeamMember)
            .map(r => (r.bdeName || "").toLowerCase())
            .filter(name => !!name && !inactiveUsersATL.has(name))
        );

        return records.filter(record =>
          (record.atl?.toLowerCase() === user.name?.toLowerCase()) ||
          (record.bdeName?.toLowerCase() === user.name?.toLowerCase()) ||
          currentATLTeamNames.has((record.bdeName || "").toLowerCase())
        );

      case 'Business Development Executive':
      case 'Business Development Manager (BDM)':
      case 'Senior Business Development Manager (Sr. BDM)':
        // Only their own records
        return records.filter(record => record.bdeName === user.name);

      default:
        return records;
    }
  };

  // Fetch sales records on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const [records, usersData] = await Promise.all([
          api.getMasterData(),
          api.getUsers()
        ]);

        // Filter out any records that belong to a financial year < 2025 (since database starts April 2025)
        const validRecords = records.filter(r => {
          const yearNum = parseInt(r.fy) || 2025;
          let fy = yearNum;
          if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
            fy = yearNum - 1;
          }
          return fy >= 2025;
        });

        const filteredRecords = filterRecordsByRole(validRecords, usersData);
        setLiveRecords(filteredRecords);
      } catch (error) {
        console.error("Failed to fetch master data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);



  // Memoized lists for filters, derived from live data
  const availableBranches = useMemo(() => {
    const branches = new Set(liveRecords.map(r => r.branch));
    return Array.from(branches);
  }, [liveRecords]);

  const availableDrives = useMemo(() => {
    const drives = new Set(liveRecords.map(r => r.drive));
    return Array.from(drives);
  }, [liveRecords]);

  const fyFilteredRecords = useMemo(() => {
    let records = liveRecords;
    if (selectedFinancialYear) records = records.filter(r => getFinancialYear(r) === selectedFinancialYear);
    return records;
  }, [liveRecords, selectedFinancialYear]);

  const availableMonths = useMemo(() => {
    if (!selectedFinancialYear) {
      const pairs = new Set<string>();
      fyFilteredRecords.forEach(r => {
        if (r.month && r.fy && !r.isPlaceholder) {
          pairs.add(`${r.month} - ${r.fy}`);
        }
      });
      return Array.from(pairs).sort((a, b) => {
        const [aMonth, aFY] = a.split(" - ");
        const [bMonth, bFY] = b.split(" - ");
        const aChrono = getChronologicalValue(aFY, aMonth);
        const bChrono = getChronologicalValue(bFY, bMonth);
        return aChrono - bChrono;
      });
    } else {
      const months = new Set(
        fyFilteredRecords.filter(r => !r.isPlaceholder).map(r => r.month)
      );
      const monthOrder = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'];
      return Array.from(months).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    }
  }, [fyFilteredRecords, selectedFinancialYear]);

  const getFinancialYear = (r: SalesRecord) => {
    const yearNum = parseInt(r.fy) || 2025;
    if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
      return (yearNum - 1).toString();
    }
    return yearNum.toString();
  };

  const availableFinancialYears = useMemo(() => {
    const years = new Set(liveRecords.map(r => getFinancialYear(r)).filter(fy => fy));
    return Array.from(years).sort().reverse();
  }, [liveRecords]);

  const filteredRecords = useMemo(() => {
    let records = fyFilteredRecords;
    if (selectedBranch) records = records.filter(r => r.branch === selectedBranch);
    if (selectedDrive) {
      records = records.filter(r => r.drive === selectedDrive);
    }
    if (selectedMonth) {
      if (selectedMonth.includes(' - ')) {
        const [monthName, fyName] = selectedMonth.split(' - ');
        records = records.filter(r => r.month === monthName && r.fy === fyName);
      } else {
        records = records.filter(r => r.month === selectedMonth);
      }
    }
    return records;
  }, [fyFilteredRecords, selectedBranch, selectedDrive, selectedMonth]);

  const teamData = useMemo(() => getTeamData(filteredRecords), [filteredRecords]);

  // Reset child filters when parent changes
  useEffect(() => {
    setSelectedDrive('');
    setSelectedMonth('');
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
        title="Team Flowchart"
        subtitle="Loading data, please wait..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={liveRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
        onBdeSelect={handleBdeSelect}
      >
        <div className="p-6">
          <Skeleton className="h-[800px] w-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isLoading && liveRecords.length === 0) {
    const isAdminOrOps = user && (user.role === 'Admin' || user.role === 'Operations Leader');
    return (
      <DashboardLayout
        title="Team Flowchart"
        subtitle="No data available"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={liveRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
        onBdeSelect={handleBdeSelect}
      >
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
      title="Team Flowchart"
      subtitle="Visualize your team structure"
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
      />

      <div className="mt-8">
        <TeamFlowchart
          teams={teamData}
          selectedBranch={selectedBranch}
          selectedDrive={selectedDrive}
          selectedMonth={selectedMonth}
        />
      </div>
    </DashboardLayout>
  );
}
