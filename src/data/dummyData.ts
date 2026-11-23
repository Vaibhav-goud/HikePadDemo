import { SalesRecord, User } from '@/types';

export interface DummyDrive {
  id: string;
  name: string;
  startMonth: string;
  startYear: number;
  endMonth: string;
  endYear: number;
}

export const dummyDrives: DummyDrive[] = [
  { id: 'drive-1', name: 'Drive 1 (2025)', startMonth: 'APRIL', startYear: 2025, endMonth: 'JUNE', endYear: 2025 },
  { id: 'drive-2', name: 'Drive 2 (2025)', startMonth: 'JULY', startYear: 2025, endMonth: 'SEPTEMBER', endYear: 2025 },
  { id: 'drive-3', name: 'Drive 3 (2025)', startMonth: 'OCTOBER', startYear: 2025, endMonth: 'DECEMBER', endYear: 2025 },
  { id: 'drive-4', name: 'Drive Jan 2026', startMonth: 'JANUARY', startYear: 2026, endMonth: 'MARCH', endYear: 2026 },
  { id: 'drive-5', name: 'Drive 1 (2026)', startMonth: 'APRIL', startYear: 2026, endMonth: 'JUNE', endYear: 2026 },
];

export const dummyUsers: User[] = [
  {
    id: 'user-admin',
    username: 'admin@hikepad.demo',
    name: 'Admin Demo',
    role: 'Admin',
    branch: 'All',
    branches: ['Hyderabad Branch', 'Mumbai Branch'],
    inactive: false,
    assignedAtls: [],
  },
  {
    id: 'user-dbm-1',
    username: 'rahul.verma@hikepad.demo',
    name: 'Rahul Verma',
    role: 'Deputy Branch Manager',
    branch: 'Hyderabad Branch',
    branches: ['Hyderabad Branch'],
    inactive: false,
  },
  {
    id: 'user-dbm-2',
    username: 'pooja.mehta@hikepad.demo',
    name: 'Pooja Mehta',
    role: 'Deputy Branch Manager',
    branch: 'Mumbai Branch',
    branches: ['Mumbai Branch'],
    inactive: false,
  },
  {
    id: 'user-tl-1',
    username: 'harsh.g@hikepad.demo',
    name: 'Harsh G',
    role: 'Team Leader',
    branch: 'Hyderabad Branch',
    branches: ['Hyderabad Branch'],
    inactive: false,
  },
  {
    id: 'user-tl-2',
    username: 'vishal.g@hikepad.demo',
    name: 'Vishal G',
    role: 'Team Leader',
    branch: 'Hyderabad Branch',
    branches: ['Hyderabad Branch'],
    inactive: false,
  },
  {
    id: 'user-tl-3',
    username: 'mahesh@hikepad.demo',
    name: 'Mahesh',
    role: 'Team Leader',
    branch: 'Hyderabad Branch',
    branches: ['Hyderabad Branch'],
    inactive: false,
  },
  {
    id: 'user-tl-4',
    username: 'atharv@hikepad.demo',
    name: 'Atharv',
    role: 'Team Leader',
    branch: 'Mumbai Branch',
    branches: ['Mumbai Branch'],
    inactive: false,
  },
  {
    id: 'user-tl-5',
    username: 'lakhan.p@hikepad.demo',
    name: 'Lakhan P',
    role: 'Team Leader',
    branch: 'Mumbai Branch',
    branches: ['Mumbai Branch'],
    inactive: false,
  },
  {
    id: 'user-tl-6',
    username: 't.rajesh@hikepad.demo',
    name: 'T Rajesh',
    role: 'Team Leader',
    branch: 'Mumbai Branch',
    branches: ['Mumbai Branch'],
    inactive: false,
  },
  {
    id: 'user-tl-7',
    username: 'swapnil@hikepad.demo',
    name: 'Swapnil',
    role: 'Team Leader',
    branch: 'Mumbai Branch',
    branches: ['Mumbai Branch'],
    inactive: false,
  },
];

interface TeamStructure {
  branch: string;
  dbm: string;
  leader: string;
  bdes: string[];
}

const teamsConfig: TeamStructure[] = [
  {
    branch: 'Hyderabad Branch',
    dbm: 'Rahul Verma',
    leader: 'Harsh G',
    bdes: ['Aarav Sharma', 'Neha Gupta', 'Rohan Mehta', 'Simran Kaur'],
  },
  {
    branch: 'Hyderabad Branch',
    dbm: 'Rahul Verma',
    leader: 'Vishal G',
    bdes: ['Aditya Patil', 'Priya Nair', 'Varun Desai', 'Ananya Roy'],
  },
  {
    branch: 'Hyderabad Branch',
    dbm: 'Rahul Verma',
    leader: 'Mahesh',
    bdes: ['Kunal Shah', 'Bhavna Joshi', 'Deepak Verma', 'Tanvi Joshi'],
  },
  {
    branch: 'Mumbai Branch',
    dbm: 'Pooja Mehta',
    leader: 'Atharv',
    bdes: ['Siddharth Jain', 'Rhea Kapoor', 'Manish Tiwari'],
  },
  {
    branch: 'Mumbai Branch',
    dbm: 'Pooja Mehta',
    leader: 'Lakhan P',
    bdes: ['Gaurav Malhotra', 'Shreya Sen', 'Akash Rao', 'Kritika Pandey'],
  },
  {
    branch: 'Mumbai Branch',
    dbm: 'Pooja Mehta',
    leader: 'T Rajesh',
    bdes: ['Karthik Raja', 'Divya Pillai', 'Sanjay Nambiar'],
  },
  {
    branch: 'Mumbai Branch',
    dbm: 'Pooja Mehta',
    leader: 'Swapnil',
    bdes: ['Mayur Chawla', 'Nikita Saxena', 'Pranav Kulkarni'],
  },
];

const monthsByFY: { fy: string; months: string[] }[] = [
  {
    fy: '2025',
    months: [
      'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER',
      'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'
    ],
  },
  {
    fy: '2026',
    months: ['APRIL', 'MAY', 'JUNE'],
  },
];

function getDriveForMonth(month: string, fy: string): string {
  if (fy === '2026') return 'Drive 1 (2026)';
  if (['APRIL', 'MAY', 'JUNE'].includes(month)) return 'Drive 1 (2025)';
  if (['JULY', 'AUGUST', 'SEPTEMBER'].includes(month)) return 'Drive 2 (2025)';
  if (['OCTOBER', 'NOVEMBER', 'DECEMBER'].includes(month)) return 'Drive 3 (2025)';
  return 'Drive Jan 2026';
}

// Deterministic pseudo-random number generator for consistent dummy figures
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateDummySalesRecords(): SalesRecord[] {
  const records: SalesRecord[] = [];
  let recordId = 1;
  let seed = 42;

  monthsByFY.forEach(({ fy, months }) => {
    months.forEach((month, monthIndex) => {
      const drive = getDriveForMonth(month, fy);

      teamsConfig.forEach((team) => {
        team.bdes.forEach((bde) => {
          // Generate realistic variations
          const rand1 = pseudoRandom(seed++);
          const rand2 = pseudoRandom(seed++);
          const rand3 = pseudoRandom(seed++);
          const rand4 = pseudoRandom(seed++);

          // Seasonal/month multiplier for realistic MoM trends
          const seasonalFactor = 1 + (monthIndex % 4) * 0.08;
          const target = Math.round((12 + Math.floor(rand1 * 8)) * seasonalFactor);
          const completionRate = 0.75 + rand2 * 0.35; // 75% to 110% achievement
          const closedAdm = Math.max(1, Math.round(target * completionRate));
          const closedPoints = Math.max(1, Math.round(closedAdm * (0.9 + rand3 * 0.2)));
          const cancellation = Math.floor(rand4 * 3); // 0 to 2
          const incomplete = rand1 > 0.6 ? 1 : 0;
          const enrolled = closedAdm + Math.floor(rand2 * 3);
          const ep = Math.floor(rand3 * 4) + 1;
          const bayana = rand4 > 0.7 ? 1 : 0;

          records.push({
            id: `dummy-rec-${recordId++}`,
            fy,
            month,
            branch: team.branch,
            drive,
            vp: 'VP Sales',
            dbm: team.dbm,
            teamLeader: team.leader,
            teamName: team.leader,
            bdeName: bde,
            target,
            enrolled,
            ep,
            bayana,
            cancellation,
            closedAdm,
            closedPoints,
            incomplete,
            role: 'Business Development Executive',
            isCurrentTeamMember: true,
          });
        });
      });
    });
  });

  return records;
}

export const dummySalesRecords: SalesRecord[] = generateDummySalesRecords();
