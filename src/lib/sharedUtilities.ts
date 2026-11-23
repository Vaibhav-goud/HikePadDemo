import { User, SalesRecord } from '@/types';

/**
 * SHARED UTILITIES FOR DASHBOARD
 * 
 * Centralized functions for:
 * - Achievement calculations
 * - Role-based access checks
 * - Data filtering
 */

/**
 * Calculate achievement percentage consistently across all components
 * Achievement % = (Total Closed Points / Total Target) * 100
 */
export const calculateAchievement = (closedPoints: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.round((closedPoints / target) * 100);
};

/**
 * Role-based access control for performance charts and details
 * Returns true if user can view chart/details for the specified BDE
 */
export const canUserViewBDEChart = (
  user: User | null,
  bdeName: string,
  bdeRecord: SalesRecord | undefined
): boolean => {
  if (!user) return false;

  const role = user.role?.toLowerCase() || '';

  // Admin, Vice President, Operations have full access
  if (role === 'admin' || role === 'operations' || role === 'vice president' || role === 'vp') {
    return true;
  }

  // Performers (BDE, BDM, Sr. BDM) can only view their own chart
  if (role.includes('business development executive') || role === 'bde' ||
    role === 'business development manager (bdm)' || role === 'bdm' ||
    role === 'senior business development manager (sr. bdm)' || role === 'sr bdm') {
    return user.name === bdeName;
  }

  // Team Leader / PTL can view their own chart, charts for BDEs in their team, or mapped ATLs and their members
  if (role.includes('team leader') || role === 'tl' || role.includes('ptl')) {
    if (user.name === bdeName) return true;

    // Access if they were the Team Leader for this record
    if (bdeRecord?.teamLeader === user.name) return true;

    // Mapped ATLs and their team members
    const assignedAtlNames = new Set((user.assignedAtls || []).map(name => name.toLowerCase()));
    if (assignedAtlNames.size > 0) {
      const recordBdeLower = bdeName.toLowerCase();
      const recordAtlLower = bdeRecord?.atl?.toLowerCase();
      const recordTlLower = bdeRecord?.teamLeader?.toLowerCase();

      // 1. Is the BDE an assigned ATL?
      if (assignedAtlNames.has(recordBdeLower)) return true;

      // 2. Is the BDE reporting to an assigned ATL?
      if (recordAtlLower && assignedAtlNames.has(recordAtlLower)) return true;

      // 3. Is the BDE reporting to someone who is an assigned ATL (ATL as TL)?
      if (recordTlLower && assignedAtlNames.has(recordTlLower)) return true;
    }
    return false;
  }

  // ATL / PATL can view their own chart or charts for BDEs in their team
  if (role.includes('assistant team leader') || role === 'atl' || role.includes('patl')) {
    if (user.name === bdeName) return true;
    return bdeRecord?.atl === user.name || bdeRecord?.teamLeader === user.name;
  }

  // DBM can only view charts for BDEs in their branch
  if (role === 'deputy branch manager') {
    if (!bdeRecord) return false;
    return user.branch === bdeRecord.branch;
  }

  return false;
};

/**
 * Check if user can click "See More" button for a BDE
 * Returns true if user should see and be able to click the See More button
 * Only for non-Team Leader and non-BDE roles (Admin, Operations, VP, DBM)
 */
export const canUserSeeMore = (user: User | null): boolean => {
  if (!user) return false;

  const role = user.role?.toLowerCase() || '';

  // BDE/BDM/Sr. BDM and Team Leader cannot see the "See more" button
  const isBde = role.includes('business development executive') || role === 'bde' ||
    role === 'business development manager (bdm)' || role === 'bdm' ||
    role === 'senior business development manager (sr. bdm)' || role === 'sr bdm';
  const isTeamLeader = role.includes('team leader') || role === 'tl';

  if (isBde || isTeamLeader) {
    return false;
  }

  // Everyone else (Admin, Operations, Vice President, DBM) can see it
  return true;
};

/**
 * Check if user can click on BDE name/row in Overall Performance table
 * Returns true if user can click
 */
export const canUserClickBDEName = (
  user: User | null,
  bdeName: string,
  bdeRecord: SalesRecord | undefined
): boolean => {
  if (!user) return false;

  const role = user.role?.toLowerCase() || '';

  // Performers (BDE, BDM, Sr. BDM) can only click their own name
  if (role.includes('business development executive') || role === 'bde' ||
    role === 'business development manager (bdm)' || role === 'bdm' ||
    role === 'senior business development manager (sr. bdm)' || role === 'sr bdm') {
    return user.name === bdeName;
  }

  // Team Leader / PTL can click their own name, BDEs in their team, or mapped ATLs and their members
  if (role.includes('team leader') || role === 'tl' || role.includes('ptl')) {
    if (user.name === bdeName) return true;

    // Access if they were the Team Leader for this record
    if (bdeRecord?.teamLeader === user.name) return true;

    // Mapped ATLs and their team members
    const assignedAtlNames = new Set((user.assignedAtls || []).map(name => name.toLowerCase()));
    if (assignedAtlNames.size > 0) {
      const recordBdeLower = bdeName.toLowerCase();
      const recordAtlLower = bdeRecord?.atl?.toLowerCase();
      const recordTlLower = bdeRecord?.teamLeader?.toLowerCase();

      // 1. Is the BDE an assigned ATL?
      if (assignedAtlNames.has(recordBdeLower)) return true;

      // 2. Is the BDE reporting to an assigned ATL?
      if (recordAtlLower && assignedAtlNames.has(recordAtlLower)) return true;

      // 3. Is the BDE reporting to someone who is an assigned ATL (ATL as TL)?
      if (recordTlLower && assignedAtlNames.has(recordTlLower)) return true;
    }
    return false;
  }

  // ATL / PATL can click their own name or BDEs in their team
  if (role.includes('assistant team leader') || role === 'atl' || role.includes('patl')) {
    if (user.name === bdeName) return true;
    return bdeRecord?.atl === user.name || bdeRecord?.teamLeader === user.name;
  }

  // DBM can only click BDEs from their branch
  if (role === 'deputy branch manager') {
    if (!bdeRecord) return false;
    return user.branch === bdeRecord.branch;
  }

  // Admin, VP, Operations can click any BDE
  if (role === 'admin' || role === 'operations' || role === 'vice president' || role === 'vp') {
    return true;
  }

  return true; // Default to true for any other roles
};

/**
 * Filter records based on user role
 * Used for fetching data that respects user's branch/team boundaries
 */
export const filterRecordsByUserRole = (records: SalesRecord[], user: User | null): SalesRecord[] => {
  if (!user) return records;

  switch (user.role) {
    case 'Admin':
    case 'Operations':
      // Full access to all records
      return records;

    case 'Deputy Branch Manager':
      // DBM sees all records for their assigned branch
      return records.filter(record => record.branch === user.branch);

    case 'Team Leader':
    case 'Proposed Team Leader (PTL)': {
      const userNameLower = user.name?.toLowerCase();
      const assignedAtlNames = new Set((user.assignedAtls || []).map(name => name.toLowerCase()));

      return records.filter(record => {
        const recordBdeLower = record.bdeName?.toLowerCase();
        const recordAtlLower = record.atl?.toLowerCase();
        const recordTlLower = record.teamLeader?.toLowerCase();

        // 1. Their own data
        if (recordBdeLower === userNameLower) return true;

        // 2. Data where they are the Team Leader (Direct BDEs)
        if (recordTlLower === userNameLower) return true;

        // 3. Data for an ATL explicitly mapped to them (ATL as Performer)
        if (recordBdeLower && assignedAtlNames.has(recordBdeLower)) return true;

        // 4. Data for a performer under an ATL explicitly mapped to them
        if (recordAtlLower && assignedAtlNames.has(recordAtlLower)) return true;

        // 5. Data where the record's Team Leader is an assigned ATL
        if (recordTlLower && assignedAtlNames.has(recordTlLower)) return true;

        return false;
      });
    }

    case 'Assistant Team Leader (ATL)':
    case 'Proposed Assistant Team Leader (PATL)': {
      const userNameLower = user.name?.toLowerCase();
      return records.filter(record =>
        record.atl?.toLowerCase() === userNameLower ||
        record.bdeName?.toLowerCase() === userNameLower
      );
    }

    case 'Business Development Executive':
      // Only their own records
      return records.filter(record => record.bdeName === user.name);

    default:
      return records;
  }
};

/**
 * Check if table should be read-only for a user
 * Read-only means no clicking on BDE names or "See more" button
 */
export const isTableReadOnlyForUser = (user: User | null): boolean => {
  if (!user) return true;

  // Performers have read-only table (except for clicking their own name which is handled separately)
  return ['Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)'].includes(user.role || '');
};

/**
 * Get visible columns for Top Achievers table based on user role
 * Some roles should not see numerical values
 */
export const shouldShowTopAchieversValues = (user: User | null): boolean => {
  if (!user) return false;

  const role = user.role?.toLowerCase() || '';
  // Only Vice President, Admin, Operations can see numerical values
  return role === 'admin' || role === 'operations' || role === 'vice president' || role === 'vp';
};
