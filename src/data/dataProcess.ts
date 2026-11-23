import { SalesRecord, TeamData, KPIData, ChartDataPoint, FrontendTeamData } from '@/types';

export const MONTHS = [
  'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER',
  'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'
];

export const TEAM_NAME_MAPPING: Record<string, string> = {
  'Harsh G': 'Team Anarchy',
  'Vishal G': 'Team Astras',
  'Mahesh': 'Team Mahesh Ki Mandali',
  'Mahseh': 'Team Mahesh Ki Mandali',
  'Atharv': 'Team Mini Wolf',
  'Lakhan P': 'Team Virat',
  'T Rajesh': 'Team Marcos',
  'Ishtiyaque': 'Team B',
  'Swapnil': 'Team Swapnil'
};

export const INDIVIDUALS_HIDDEN_FROM_TRACKING = ['akash dubey', 'akash d', 'kiran sindal'];
export const EXCLUDED_TEAM_LEADERS = ['akash dubey', 'akash d', 'kiran sindal'];

export const getEffectiveTeamName = (leader: string, defaultName?: string) => {
  return TEAM_NAME_MAPPING[leader] || defaultName || leader;
};

// Generate mock sales records


export const getKPIData = (allRecords: SalesRecord[], currentMonth?: string, selectedBranch?: string): KPIData[] => {
  // Separate logic for values (show totals) vs change (show month-over-month)
  let branchFilteredRecords = selectedBranch ? allRecords.filter(r => r.branch === selectedBranch) : allRecords;

  // Values: Show totals across all months (or specific month if selected)
  let valueRecords = branchFilteredRecords;
  let normalizedMonth = currentMonth;
  let currentMonthFY = '';

  if (currentMonth && currentMonth.includes(' - ')) {
    const parts = currentMonth.split(' - ');
    normalizedMonth = parts[0];
    currentMonthFY = parts[1];
  }

  if (normalizedMonth) {
    valueRecords = valueRecords.filter(r => r.month === normalizedMonth);
    if (currentMonthFY) {
      valueRecords = valueRecords.filter(r => r.fy === currentMonthFY);
    }
  }

  // Change percentage: Always use latest vs previous month

  let latestMonth = normalizedMonth;
  let previousMonth: string | undefined;

  if (!currentMonth) {
    // Find the latest month for comparison
    const monthsInData = new Set(branchFilteredRecords.map(r => r.month));
    let latestMonthIndex = -1;
    monthsInData.forEach(month => {
      const index = MONTHS.indexOf(month);
      if (index > latestMonthIndex) {
        latestMonthIndex = index;
        latestMonth = month;
      }
    });
  }

  // Find previous month for trend analysis
  if (latestMonth) {
    const monthIndex = MONTHS.indexOf(latestMonth);
    previousMonth = monthIndex > 0 ? MONTHS[monthIndex - 1] : undefined;
  }

  // Calculate VALUES: Totals from valueRecords (either all months or specific month)
  const totalTarget = valueRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
  const totalAdmissions = valueRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
  const totalClosedPoints = valueRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);
  const totalCancellations = valueRecords.reduce((sum, r) => sum + (Number(r.cancellation) || 0), 0);
  const totalIncomplete = valueRecords.reduce((sum, r) => sum + (Number(r.incomplete) || 0), 0);

  // Calculate CHANGE: Use latest vs previous month only
  let latestRecords = latestMonth ? branchFilteredRecords.filter(r => r.month === latestMonth) : [];
  let prevRecords = previousMonth ? branchFilteredRecords.filter(r => r.month === previousMonth) : [];

  if (currentMonthFY) {
    latestRecords = latestRecords.filter(r => r.fy === currentMonthFY);
    if (previousMonth) {
      let prevFY = currentMonthFY;
      if (latestMonth === 'JANUARY' && previousMonth === 'DECEMBER') {
        prevFY = (parseInt(currentMonthFY) - 1).toString();
      }
      prevRecords = prevRecords.filter(r => r.fy === prevFY);
    }
  }

  const latestTarget = latestRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
  const latestAdmissions = latestRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
  const latestClosedPoints = latestRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);
  const latestCancellations = latestRecords.reduce((sum, r) => sum + (Number(r.cancellation) || 0), 0);
  const latestIncomplete = latestRecords.reduce((sum, r) => sum + (Number(r.incomplete) || 0), 0);

  const prevTarget = prevRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
  const prevAdmissions = prevRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
  const prevClosedPoints = prevRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);
  const prevCancellations = prevRecords.reduce((sum, r) => sum + (Number(r.cancellation) || 0), 0);
  const prevIncomplete = prevRecords.reduce((sum, r) => sum + (Number(r.incomplete) || 0), 0);

  // Calculate percentage changes based on latest vs previous month
  const targetChange = prevTarget > 0 ? ((latestTarget - prevTarget) / prevTarget) * 100 : 0;
  const admissionsChange = prevAdmissions > 0 ? ((latestAdmissions - prevAdmissions) / prevAdmissions) * 100 : 0;
  const closedPointsChange = prevClosedPoints > 0 ? ((latestClosedPoints - prevClosedPoints) / prevClosedPoints) * 100 : 0;
  const cancellationsChange = prevCancellations > 0 ? ((latestCancellations - prevCancellations) / prevCancellations) * 100 : 0;
  const incompleteChange = prevIncomplete > 0 ? ((latestIncomplete - prevIncomplete) / prevIncomplete) * 100 : 0;

  // Achievement % = (Closed Points / Total Target) * 100 - uses VALUES (all months or specific month)
  const achievement = totalTarget > 0 ? Math.round((totalClosedPoints / totalTarget) * 100) : 0;

  // Achievement change: show change in PERCENTAGE POINTS (e.g. 10% to 15% is +5%) 
  // instead of growth percentage (which would be +50%). This is much more intuitive.
  const latestAchievement = latestTarget > 0 ? (latestClosedPoints / latestTarget) * 100 : 0;
  const prevAchievement = prevTarget > 0 ? (prevClosedPoints / prevTarget) * 100 : 0;
  const achievementPtChange = latestAchievement - prevAchievement;

  return [
    {
      label: 'Total Target',
      value: totalTarget,
      change: prevTarget === 0 ? 0 : Math.round(targetChange * 100) / 100,
      changeType: targetChange > 0 ? 'positive' : targetChange < 0 ? 'negative' : 'neutral',
      icon: 'target'
    },
    {
      label: 'Total Admissions',
      value: totalAdmissions,
      change: prevAdmissions === 0 ? 0 : Math.round(admissionsChange * 100) / 100,
      changeType: admissionsChange > 0 ? 'positive' : admissionsChange < 0 ? 'negative' : 'neutral',
      icon: 'users'
    },
    {
      label: 'Closed Points',
      value: totalClosedPoints,
      change: prevClosedPoints === 0 ? 0 : Math.round(closedPointsChange * 100) / 100,
      changeType: closedPointsChange > 0 ? 'positive' : closedPointsChange < 0 ? 'negative' : 'neutral',
      icon: 'trending-up'
    },
    {
      label: 'Cancellation',
      value: totalCancellations,
      change: prevCancellations === 0 ? 0 : Math.round(cancellationsChange * 100) / 100,
      changeType: cancellationsChange > 0 ? 'negative' : cancellationsChange < 0 ? 'positive' : 'neutral',
      icon: 'x-circle'
    },
    {
      label: 'Achievement %',
      value: achievement,
      change: Math.round(achievementPtChange * 100) / 100,
      changeType: achievementPtChange > 0 ? 'positive' : achievementPtChange < 0 ? 'negative' : 'neutral',
      icon: 'percent'
    },
    {
      label: currentMonth ? `Incomplete Forms (${currentMonth.substring(0, 3)})` : 'Incomplete Forms',
      value: totalIncomplete,
      change: prevIncomplete === 0 ? 0 : Math.round(incompleteChange * 100) / 100,
      changeType: incompleteChange > 0 ? 'negative' : incompleteChange < 0 ? 'positive' : 'neutral',
      icon: 'x-circle'
    },
  ];
};

export const getTeamData = (records: SalesRecord[], branch?: string, drive?: string, month?: string, includeInactive: boolean = false): FrontendTeamData[] => {
  let filtered = records;

  if (branch) filtered = filtered.filter(r => r.branch === branch);
  if (drive) filtered = filtered.filter(r => r.drive === drive);
  if (month) filtered = filtered.filter(r => r.month === month);

  // No isCurrentTeamMember filter here to maintain branch totals


  const teamMap = new Map<string, FrontendTeamData>();

  filtered.forEach(record => {
    // Unique key for a team: branch + DBM + [mapped team name or leader]
    const effectiveTeamName = getEffectiveTeamName(record.teamLeader, record.teamName);
    const key = `${record.branch}-${record.dbm}-${effectiveTeamName}`;

    const target = Number(record.target) || 0;
    const closedAdm = Number(record.closedAdm) || 0;
    const closedPoints = Number(record.closedPoints) || 0;

    const existing = teamMap.get(key);
    if (existing) {
      existing.totalTarget += target;
      existing.totalAdmissions += closedAdm;
      existing.totalClosedPoints += closedPoints;
      existing.records.push(record);
    } else {
      teamMap.set(key, {
        vp: record.vp,
        dbm: record.dbm,
        teamLeader: record.teamLeader,
        atl: record.atl,
        teamName: effectiveTeamName,
        totalTarget: target,
        totalAdmissions: closedAdm,
        totalClosedPoints: closedPoints,
        avgAchievement: 0,
        bdeCount: 0,
        records: [record]
      });
    }
  });

  return Array.from(teamMap.values())
    .map(team => {
      const isPresident = INDIVIDUALS_HIDDEN_FROM_TRACKING.includes(team.teamLeader?.toLowerCase()) ||
        INDIVIDUALS_HIDDEN_FROM_TRACKING.includes(team.dbm?.toLowerCase());

      // Count ALL unique BDEs in this team, including inactive ones
      const uniqueBdeNames = new Set(
        team.records
          .filter(r => !INDIVIDUALS_HIDDEN_FROM_TRACKING.includes(r.bdeName.toLowerCase()) && r.role !== 'Operations Executive')
          .map(r => r.bdeName)
      );

      return {
        ...team,
        avgAchievement: isPresident ? 100 : (team.totalTarget > 0 ? Math.round((team.totalClosedPoints / team.totalTarget) * 100) : 0),
        bdeCount: uniqueBdeNames.size
      };
    })
    .filter(team => !EXCLUDED_TEAM_LEADERS.includes(team.teamLeader?.toLowerCase()));
};


export const getChronologicalValue = (fy: string, monthName: string): number => {
  const fyYear = parseInt(fy) || 2025;
  const calendarMonthOrder = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const monthIndex = calendarMonthOrder.indexOf(monthName.toUpperCase());
  if (monthIndex === -1) return 0;
  return fyYear * 12 + monthIndex;
};

export const getMonthlyChartData = (records: SalesRecord[]): ChartDataPoint[] => {
  const uniquePairs = new Map<string, { fy: string; month: string; chronoValue: number }>();
  
  records.forEach(r => {
    if (!r.fy || !r.month) return;
    const fy = r.fy;
    const month = r.month.toUpperCase();
    const key = `${fy}-${month}`;
    if (!uniquePairs.has(key)) {
      const chronoValue = getChronologicalValue(fy, month);
      uniquePairs.set(key, { fy, month, chronoValue });
    }
  });

  const sortedPairs = Array.from(uniquePairs.values())
    .sort((a, b) => a.chronoValue - b.chronoValue);

  const chartData = sortedPairs.map(pair => {
    const monthRecords = records.filter(r => r.fy === pair.fy && r.month?.toUpperCase() === pair.month);
    
    const totalTarget = monthRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
    const totalAdmissions = monthRecords.reduce((sum, r) => sum + (Number(r.closedAdm) || 0), 0);
    const totalClosedPoints = monthRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);

    const shortMonth = pair.month.substring(0, 3);
    const yearNum = parseInt(pair.fy);
    const label = `${shortMonth} '${yearNum.toString().substring(2)}`;

    return {
      label: label,
      target: totalTarget,
      admissions: totalAdmissions,
      closedPoints: totalClosedPoints,
      achievement: totalTarget > 0 ? Math.round((totalClosedPoints / totalTarget) * 100) : 0
    };
  });

  return chartData;
};


export interface BDEData {
  name: string;
  teamName: string;
  totalTarget: number;
  totalAdmissions: number;
  totalClosedPoints: number;
  avgAchievement: number;
  inactive?: boolean;
}

export interface TopAchiever {
  name: string;
  branch: string;
  teamLeader: string;
  totalTarget: number;
  totalAdmissions: number;
  totalClosedPoints: number;
  achievement: number;
}

export const getTopAchieversData = (records: SalesRecord[], count: number = 10): TopAchiever[] => {
  // Filter out inactive users and specific users like VP (Akash Dubey) and others from individual rankings
  const activeRecords = records.filter(r => !r.inactive && !INDIVIDUALS_HIDDEN_FROM_TRACKING.includes(r.bdeName.toLowerCase()) && r.role !== 'Operations Executive');
  const bdeMap = new Map<string, {
    name: string;
    branch: string;
    teamLeader: string;
    totalTarget: number;
    totalAdmissions: number;
    totalClosedPoints: number;
    achievement: number;
    recordsCount: number; // To calculate average later if needed, but not here for sum
  }>();

  activeRecords.forEach(record => {
    const key = record.bdeName;
    const target = Number(record.target) || 0;
    const admissions = Number(record.admissions) || 0;
    const closedPoints = Number(record.closedPoints) || 0;

    if (!bdeMap.has(key)) {
      bdeMap.set(key, {
        name: record.bdeName,
        branch: record.branch,
        teamLeader: record.teamLeader,
        totalTarget: 0,
        totalAdmissions: 0,
        totalClosedPoints: 0,
        achievement: 0,
        recordsCount: 0,
      });
    }
    const bde = bdeMap.get(key)!;
    bde.totalTarget += target;
    bde.totalAdmissions += admissions;
    bde.totalClosedPoints += closedPoints;
    bde.recordsCount++;

    // Update branch and teamLeader if this is a current record
    if (record.isCurrentTeamMember) {
      bde.branch = record.branch;
      bde.teamLeader = record.teamLeader;
    }
  });

  const achievers = Array.from(bdeMap.values()).map(bde => {
    const isPresident = bde.name?.includes('Akash Dubey');
    return {
      ...bde,
      // Achievement % = (Closed Points / Target) * 100 - standardized calculation
      achievement: isPresident ? 100 : (bde.totalTarget > 0 ? Math.round((bde.totalClosedPoints / bde.totalTarget) * 100) : 0),
    };
  });

  return achievers
    .sort((a, b) => b.achievement - a.achievement)
    .slice(0, count);
};

export const getBDEData = (records: SalesRecord[], branch?: string, team?: string, drive?: string, month?: string, includeInactive: boolean = false): BDEData[] => {
  let filtered = records;

  if (branch) filtered = filtered.filter(r => r.branch === branch);
  if (team) filtered = filtered.filter(r => r.teamLeader === team);
  if (drive) filtered = filtered.filter(r => r.drive === drive);
  if (month) filtered = filtered.filter(r => r.month === month);

  // Exclude records for non-current team members from individual lists unless showing inactive
  if (!includeInactive) {
    filtered = filtered.filter(r => r.isCurrentTeamMember !== false);
  }
  if (!includeInactive) {
    filtered = filtered.filter(r => !r.inactive);
  }

  // Always exclude specific high-level users like VP from individual BDE lists
  filtered = filtered.filter(r => !INDIVIDUALS_HIDDEN_FROM_TRACKING.includes(r.bdeName.toLowerCase()) && r.role !== 'Operations Executive');

  const bdeMap = new Map<string, BDEData>();

  filtered.forEach(record => {
    const target = Number(record.target) || 0;
    const admissions = Number(record.admissions) || 0;
    const closedPoints = Number(record.closedPoints) || 0;

    const existing = bdeMap.get(record.bdeName);
    if (existing) {
      existing.totalTarget += target;
      existing.totalAdmissions += admissions;
      existing.totalClosedPoints += closedPoints;

      // Update teamName if this is a current record
      if (record.isCurrentTeamMember) {
        existing.teamName = getEffectiveTeamName(record.teamLeader, record.teamName);
      }
      // If any record is active, the user is considered active in this context
      // but if we are including inactive, we want to know if the user as a whole is inactive.
      // For simplicity, if we found an active record, we mark as not inactive.
      if (!record.inactive) existing.inactive = false;
    } else {
      bdeMap.set(record.bdeName, {
        name: record.bdeName,
        teamName: getEffectiveTeamName(record.teamLeader, record.teamName), // Get mapped team name
        totalTarget: target,
        totalAdmissions: admissions,
        totalClosedPoints: closedPoints,
        avgAchievement: 0,
        inactive: record.inactive // Initial state
      });
    }
  });

  return Array.from(bdeMap.values()).map(bde => {
    const isPresident = bde.name?.includes('Akash Dubey');
    return {
      ...bde,
      // Achievement % = (Closed Points / Target) * 100 - standardized calculation
      avgAchievement: isPresident ? 100 : (bde.totalTarget > 0 ? Math.round((bde.totalClosedPoints / bde.totalTarget) * 100) : 0)
    };
  });
};

export const getBDEChartData = (records: SalesRecord[], bdeName: string): ChartDataPoint[] => {
  const bdeRecords = records.filter(r => r.bdeName === bdeName && !r.inactive);

  const uniquePairs = new Map<string, { fy: string; month: string; chronoValue: number }>();
  
  bdeRecords.forEach(r => {
    if (!r.fy || !r.month) return;
    const fy = r.fy;
    const month = r.month.toUpperCase();
    const key = `${fy}-${month}`;
    if (!uniquePairs.has(key)) {
      const chronoValue = getChronologicalValue(fy, month);
      uniquePairs.set(key, { fy, month, chronoValue });
    }
  });

  const sortedPairs = Array.from(uniquePairs.values())
    .sort((a, b) => a.chronoValue - b.chronoValue);

  return sortedPairs.map(pair => {
    const monthRecords = bdeRecords.filter(r => r.fy === pair.fy && r.month?.toUpperCase() === pair.month);
    const totalTarget = monthRecords.reduce((sum, r) => sum + (Number(r.target) || 0), 0);
    const totalAdmissions = monthRecords.reduce((sum, r) => sum + (Number(r.admissions) || 0), 0);
    const totalClosedPoints = monthRecords.reduce((sum, r) => sum + (Number(r.closedPoints) || 0), 0);

    const shortMonth = pair.month.substring(0, 3);
    const yearNum = parseInt(pair.fy);
    const label = `${shortMonth} '${yearNum.toString().substring(2)}`;

    return {
      label: label,
      target: totalTarget,
      admissions: totalAdmissions,
      closedPoints: totalClosedPoints,
      achievement: totalTarget > 0 ? Math.round((totalClosedPoints / totalTarget) * 100) : 0
    };
  });
};
