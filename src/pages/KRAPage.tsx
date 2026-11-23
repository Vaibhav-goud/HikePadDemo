import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Search, Filter, Calendar as CalendarIcon, Users, Phone, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface KRAReport {
    id: string;
    name: string;
    team: string;
    date: string;
    calls: number;
    prospects: number;
    duration_mins: number;
    last_updated: string;
    last_synced?: string;
    uid: string;
}

export default function KRAPage() {
    const { user } = useAuth();
    const [reports, setReports] = useState<KRAReport[]>([]);
    const [filteredReports, setFilteredReports] = useState<KRAReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<string>('all');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedWeek, setSelectedWeek] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [masterData, setMasterData] = useState<any[]>([]);


    // Initialize branch based on user role
    useEffect(() => {
        if (user) {
            const privilegedRoles = ['Admin', 'Operations Leader', 'Vice President', 'Super Admin'];
            if (privilegedRoles.includes(user.role)) {
                setSelectedBranch('all');
            } else {
                setSelectedBranch(user.branch === 'Mumbai Branch' ? 'MUM' : 'HYD');
            }
        }
    }, [user]);

    // Available months from data
    const availableMonths = useMemo(() => {
        if (reports.length === 0) return [];
        const monthsSet = new Set<string>();
        reports.forEach(r => {
            if (!r.date) return;
            const date = new Date(r.date);
            if (isNaN(date.getTime())) return;
            // Stable format: Month YYYY
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            monthsSet.add(monthYear);
        });
        return Array.from(monthsSet).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return dateB.getTime() - dateA.getTime();
        });
    }, [reports]);

    useEffect(() => {
        const fetchKRAData = async () => {
            try {
                setIsLoading(true);
                setError(null); // Clear previous errors
                const branchParam = selectedBranch;

                // Fetch KRA data and supporting data for all roles to ensure consistent team mapping
                const [kraData, masterData, allUsers] = await Promise.all([
                    api.getKRAReports(branchParam),
                    api.getMasterData(),
                    api.getUsers()
                ]);

                // Apply role-based filtering
                let filtered = kraData;
                if (user) {
                    const privilegedRoles = ['Admin', 'Operations Leader', 'Vice President', 'Super Admin'];
                    const userNameLower = (user.name || "").toLowerCase();
                    const assignedAtlNames = new Set((user.assignedAtls || []).map(name => name.toLowerCase()));

                    if (privilegedRoles.includes(user.role)) {
                        // Admins see everything initially, but we keep the fetched data for filtering
                        filtered = kraData;
                    } else if (user.role === 'Team Leader' || user.role === 'Proposed Team Leader (PTL)') {
                        // Include records explicitly tagged with the TL's name or their assigned ATLs' names as team
                        filtered = kraData.filter((report: any) => {
                            const reportNameLower = (report.name || "").toLowerCase().trim();
                            const reportTeamLower = (report.team || "").toLowerCase().trim();
                            const tlNameLower = userNameLower.trim();
                            const tlTeamStr = `team ${tlNameLower}`;

                            // 1. Their own data
                            if (reportNameLower === tlNameLower) return true;

                            // 2. Records explicitly tagged with their team name or an assigned ATL's name
                            const tlWords = tlNameLower.split(' ').filter(word => word.length > 2);
                            const matchesTeamName = reportTeamLower === tlTeamStr ||
                                reportTeamLower === tlNameLower ||
                                reportTeamLower.includes(tlNameLower) ||
                                (tlWords.length > 0 && tlWords.some(word => reportTeamLower.includes(word))) ||
                                assignedAtlNames.has(reportTeamLower.replace('team ', '').trim());

                            if (matchesTeamName) return true;

                            return false;
                        });
                    } else if (user.role === 'Assistant Team Leader (ATL)' || user.role === 'Proposed Assistant Team Leader (PATL)') {
                        filtered = kraData.filter((report: any) => {
                            const reportNameLower = (report.name || "").toLowerCase().trim();
                            const reportTeamLower = (report.team || "").toLowerCase().trim();
                            const tlNameLower = userNameLower.trim();
                            const tlTeamStr = `team ${tlNameLower}`;

                            // 1. Their own data
                            if (reportNameLower === tlNameLower) return true;

                            // 2. Records explicitly tagged with their team name
                            const tlWords = tlNameLower.split(' ').filter(word => word.length > 2);
                            const matchesTeamName = reportTeamLower === tlTeamStr ||
                                reportTeamLower === tlNameLower ||
                                reportTeamLower.includes(tlNameLower) ||
                                (tlWords.length > 0 && tlWords.some(word => reportTeamLower.includes(word)));

                            if (matchesTeamName) return true;

                            return false;
                        });
                    } else if (user.role === 'Business Development Executive' ||
                        user.role === 'Business Development Manager (BDM)' ||
                        user.role === 'Senior Business Development Manager (Sr. BDM)') {
                        // Only see their own records
                        filtered = kraData.filter((report: any) => report.name && report.name.toLowerCase() === userNameLower);
                    } else if (user.role === 'Deputy Branch Manager') {
                        // DBMs see everything in their branch (which is already filtered by API)
                        filtered = kraData;
                    }
                }

                setReports(filtered);
                setFilteredReports(filtered);
                setAllUsers(allUsers || []);
                setMasterData(masterData || []);
            } catch (err: any) {
                console.error('Failed to fetch KRA reports:', err);
                setError(err.message || 'Failed to load KRA reports. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchKRAData();
        }
    }, [user?.name, user?.role, selectedBranch, user?.assignedAtls]); // Added assignedAtls to dependencies

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedTeam('all');
        setSelectedMonth('all');
        setSelectedWeek('all');
        setSelectedDate(undefined);

        // Reset branch based on role again
        if (user) {
            const privilegedRoles = ['Admin', 'Operations Leader', 'Vice President', 'Super Admin'];
            if (privilegedRoles.includes(user.role)) {
                setSelectedBranch('all');
            } else {
                setSelectedBranch(user.branch === 'Mumbai Branch' ? 'MUM' : 'HYD');
            }
        }
    };

    // Handle Search and Filter application
    useEffect(() => {
        let result = reports;

        // Date Filter (replaces "Today")
        if (selectedDate) {
            // Using en-CA for YYYY-MM-DD format consistency
            // Adjust to local date string to match report dates if necessary, assuming report dates are YYYY-MM-DD strings
            // Ideally we compare simple date parts
            const targetDateStr = format(selectedDate, 'yyyy-MM-dd');

            result = result.filter(r => {
                if (!r.date) return false;
                // Parse report date
                const d = new Date(r.date);
                // Compare YYYY-MM-DD
                return format(d, 'yyyy-MM-dd') === targetDateStr;
            });
        }

        // Search
        if (searchQuery) {
            result = result.filter(r =>
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.team.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Team Filter
        if (selectedTeam !== 'all') {
            const selectedTeamLower = selectedTeam.toLowerCase().trim();
            const leaderName = selectedTeamLower.startsWith('team ') ? selectedTeamLower.replace('team ', '').trim() : selectedTeamLower;

            // Get all BDE names currently mapped to this team/leader in masterData
            const teamBdeNames = new Set(
                masterData
                    .filter(r => {
                        if (!r.isCurrentTeamMember) return false;
                        const rTl = (r.teamLeader || "").toLowerCase().trim();
                        const rAtl = (r.atl || "").toLowerCase().trim();
                        const rBde = (r.bdeName || "").toLowerCase().trim();
                        return rTl === leaderName || rAtl === leaderName || rTl.includes(leaderName) || rAtl.includes(leaderName);
                    })
                    .map(r => (r.bdeName || "").toLowerCase().trim())
            );

            result = result.filter(r => {
                const reportNameLower = (r.name || "").toLowerCase().trim();
                const reportTeamLower = (r.team || "").toLowerCase().trim();

                // Match if:
                // 1. Literal team name match
                // 2. Or the BDE is currently mapped to this leader in masterData
                return reportTeamLower === selectedTeamLower ||
                    reportTeamLower === leaderName ||
                    (reportTeamLower.includes(leaderName) && reportTeamLower.includes('team')) ||
                    teamBdeNames.has(reportNameLower);
            });
        }

        // Month Filter
        if (selectedMonth !== 'all' && !selectedDate) {
            result = result.filter(r => {
                if (!r.date) return false;
                const d = new Date(r.date);
                if (isNaN(d.getTime())) return false;
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const monthYear = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                return monthYear === selectedMonth;
            });
        }

        // Week Filter
        if (selectedWeek !== 'all' && !selectedDate) {
            result = result.filter(r => {
                const day = new Date(r.date).getDate();
                const weekNum = Math.ceil(day / 7);
                const weekLabel = `Week ${weekNum > 4 ? 4 : weekNum}`;
                return weekLabel === selectedWeek;
            });
        }

        setFilteredReports(result);
    }, [searchQuery, selectedTeam, selectedMonth, selectedWeek, selectedDate, reports]);

    const teams = useMemo(() => {
        const teamSet = new Set<string>();

        // 1. Add teams explicitly present in KRA reports (normalized)
        reports.forEach(r => {
            if (!r.team || r.team === 'Unassigned') return;
            const t = r.team.trim();
            const normalized = t.toLowerCase().startsWith('team ') ? t : `Team ${t}`;
            // We store the original case but use normalized for uniqueness check
            teamSet.add(normalized);
        });

        // 2. Add teams from masterData (current leads) to ensure they are always selectable
        masterData.forEach(r => {
            if (r.teamLeader) {
                const t = r.teamLeader.trim();
                const normalized = t.toLowerCase().startsWith('team ') ? t : `Team ${t}`;
                teamSet.add(normalized);
            }
            if (r.atl) {
                const t = r.atl.trim();
                const normalized = t.toLowerCase().startsWith('team ') ? t : `Team ${t}`;
                teamSet.add(normalized);
            }
        });

        return Array.from(teamSet).sort();
    }, [reports, masterData]);

    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    // 3. Aggregate Data by User
    interface AggregatedUser {
        name: string;
        team: string;
        totalCalls: number;
        totalProspects: number;
        totalDuration: number;
        recordCount: number;
        uniqueDates: Set<string>;
    }

    const aggregatedData = useMemo(() => {
        const groups: Record<string, AggregatedUser> = {};
        const userNameLower = user?.name?.toLowerCase();
        const assignedAtlNames = new Set((user?.assignedAtls || []).map(name => name.toLowerCase()));
        const inactiveUsers = new Set(allUsers.filter(u => u.inactive).map(u => (u.name || "").toLowerCase()));

        // Identify currently active/managed BDEs
        const currentManagedBdes = new Set(
            masterData
                .filter(r => {
                    // Filter by current membership
                    if (!r.isCurrentTeamMember) return false;

                    // For Super Admins / Admins, we show all current members of the selected team/branch
                    const privilegedRoles = ['Admin', 'Operations Leader', 'Vice President', 'Super Admin'];
                    if (user && privilegedRoles.includes(user.role)) {
                        return true;
                    }

                    // For TL/ATL, only their current teams
                    const bdeLower = r.bdeName?.toLowerCase();
                    const atlLower = r.atl?.toLowerCase();
                    const tlLower = r.teamLeader?.toLowerCase();

                    if (tlLower === userNameLower) return true;
                    if (assignedAtlNames.has(bdeLower || '')) return true;
                    if (atlLower && assignedAtlNames.has(atlLower)) return true;
                    if (tlLower && assignedAtlNames.has(tlLower)) return true;

                    return false;
                })
                .map(r => r.bdeName?.toLowerCase())
        );

        // Identify all team names associated with this supervisor in masterData (to handle aliases like "Team Marcos")
        const associatedTeamNames = new Set<string>();
        if (userNameLower) {
            masterData.forEach(r => {
                const tl = (r.teamLeader || "").toLowerCase().trim();
                const atl = (r.atl || "").toLowerCase().trim();
                const tName = (r.teamName || "").toLowerCase().trim();
                if (tl === userNameLower || atl === userNameLower) {
                    if (tl) associatedTeamNames.add(tl);
                    if (tl) associatedTeamNames.add(`team ${tl}`);
                    if (atl) associatedTeamNames.add(atl);
                    if (atl) associatedTeamNames.add(`team ${atl}`);
                    if (tName) associatedTeamNames.add(tName);
                    if (tName) associatedTeamNames.add(`team ${tName}`);
                }
            });
        }

        filteredReports.forEach(report => {
            const reportNameLower = (report.name || "").toLowerCase().trim();
            const reportTeamLower = (report.team || "").toLowerCase().trim();
            // Always display the user themselves
            const isSelf = userNameLower && reportNameLower === userNameLower;

            // Display if:
            // 1. Is self
            // 2. Report team matches any known team name/alias for this supervisor (e.g. "Team Marcos")
            // 3. Or the BDE is currently mapped to this supervisor in masterData
            const tlWords = userNameLower ? userNameLower.split(' ').filter(word => word.length > 2) : [];
            const matchesTeamName = associatedTeamNames.has(reportTeamLower) ||
                (userNameLower && (
                    (reportTeamLower.includes(userNameLower) && reportTeamLower.includes('team')) ||
                    (tlWords.length > 0 && tlWords.some(word => reportTeamLower.includes(word)) && reportTeamLower.includes('team'))
                ));

            if (!isSelf && !matchesTeamName && !currentManagedBdes.has(reportNameLower)) {
                return;
            }

            // Filter out empty teams and Unassigned from the display list
            if (!report.team || report.team === 'Unassigned') {
                return;
            }

            if (!groups[report.name]) {
                groups[report.name] = {
                    name: report.name,
                    team: report.team,
                    totalCalls: 0,
                    totalProspects: 0,
                    totalDuration: 0,
                    recordCount: 0,
                    uniqueDates: new Set()
                };
            }
            groups[report.name].totalCalls += (report.calls || 0);
            groups[report.name].totalProspects += (report.prospects || 0);
            groups[report.name].totalDuration += (report.duration_mins || 0);
            groups[report.name].recordCount++;
            if (report.date) {
                groups[report.name].uniqueDates.add(new Date(report.date).toDateString());
            }
        });

        return Object.values(groups);
    }, [filteredReports, masterData, allUsers, user]);

    // 4. Calculate Grand Totals for KPI Cards (includes ALL users, even Unassigned)
    const grandTotals = useMemo(() => {
        return filteredReports.reduce((acc, report) => ({
            calls: acc.calls + (report.calls || 0),
            prospects: acc.prospects + (report.prospects || 0),
            duration: acc.duration + (report.duration_mins || 0),
        }), { calls: 0, prospects: 0, duration: 0 });
    }, [filteredReports]);

    // Derived User Detail Data
    const userDetailRecords = useMemo(() => {
        if (!selectedUser) return [];
        return filteredReports.filter(r => r.name === selectedUser);
    }, [selectedUser, filteredReports]);

    if (isLoading) {
        return (
            <DashboardLayout title="KRA Reports" subtitle="Real-time Performance Metrics">
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-48" />
                    </div>
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (selectedUser) {
        return (
            <DashboardLayout
                title={`KRA Details: ${selectedUser}`}
                subtitle="Detailed daily records"
            >
                <div className="space-y-6">
                    <button
                        onClick={() => setSelectedUser(null)}
                        className="flex items-center text-sm text-primary hover:underline mb-4"
                    >
                        ← Back to Summary
                    </button>

                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Team</th>
                                        <th className="text-center">Calls</th>
                                        <th className="text-center">Prospects</th>
                                        <th className="text-center">Duration (mins)</th>
                                        <th>Last Updated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userDetailRecords.map((report, index) => (
                                        <motion.tr
                                            key={report.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <td className="font-semibold">
                                                {new Date(report.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td>
                                                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                                    {report.team}
                                                </span>
                                            </td>
                                            <td className="text-center font-mono text-primary">{report.calls}</td>
                                            <td className="text-center font-mono text-success">{report.prospects}</td>
                                            <td className="text-center font-mono">{report.duration_mins}</td>
                                            <td className="text-xs text-muted-foreground">
                                                {new Date(report.last_updated || report.last_synced || Date.now()).toLocaleString('en-GB')}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="KRA Reports"
            subtitle={selectedDate ? `Performance Summary for ${format(selectedDate, 'PPP')}` : `Average Performance (Based on individual attendance)`}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search BDE or Team..."
            liveRecords={allUsers?.map(u => ({ bdeName: u.name || '', inactive: u.inactive })) || []}
            onBdeSelect={(name) => setSelectedUser(name)}
        >
            <div className="space-y-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Prospects</p>
                                <h3 className="text-2xl font-bold mt-2 text-success">{grandTotals.prospects.toLocaleString()}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-success" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Duration</p>
                                <h3 className="text-2xl font-bold mt-2 text-blue-500">{Math.round(grandTotals.duration / 60).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">hrs</span></h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                                <h3 className="text-2xl font-bold mt-2 text-primary">{grandTotals.calls.toLocaleString()}</h3>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Phone className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Filters */}
                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between glass-card p-4">
                    <div className="flex flex-wrap gap-4 w-full xl:w-auto">


                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="w-40">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="All Teams" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Teams</SelectItem>
                                {teams.map(team => (
                                    <SelectItem key={team} value={team}>{team}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!!selectedDate}>
                            <SelectTrigger className="w-40">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="All Months" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {availableMonths.map(month => (
                                    <SelectItem key={month} value={month}>{month}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedWeek} onValueChange={setSelectedWeek} disabled={!!selectedDate}>
                            <SelectTrigger className="w-40">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="All Weeks" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Weeks</SelectItem>
                                <SelectItem value="Week 1">Week 1 (1-7)</SelectItem>
                                <SelectItem value="Week 2">Week 2 (8-14)</SelectItem>
                                <SelectItem value="Week 3">Week 3 (15-21)</SelectItem>
                                <SelectItem value="Week 4">Week 4 (22+)</SelectItem>
                            </SelectContent>
                        </Select>

                        {(user?.role === 'Admin' || user?.role === 'Operations Leader' || user?.role === 'Vice President' || user?.role === 'Super Admin') && (
                            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                <SelectTrigger className="w-40">
                                    <Users className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Branches</SelectItem>
                                    <SelectItem value="HYD">Hyderabad Branch</SelectItem>
                                    <SelectItem value="MUM">Mumbai Branch</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] pl-3 text-left font-normal",
                                        !selectedDate && "text-muted-foreground",
                                        selectedDate && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"

                                    )}
                                >
                                    {selectedDate ? (
                                        format(selectedDate, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        setSelectedDate(date);
                                        if (date) {
                                            setSelectedMonth('all');
                                            setSelectedWeek('all');
                                        }
                                    }}
                                    disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleClearFilters}
                            title="Clear All Filters"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Total Users: {aggregatedData.length}
                    </div>
                </div>

                {error ? (
                    <div className="p-8 text-center text-destructive glass-card">
                        {error}
                    </div>
                ) : aggregatedData.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground glass-card">
                        <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No KRA reports found</p>
                        <p className="text-sm">Try adjusting your filters or check back later.</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>BDE Name</th>
                                        <th>Team</th>
                                        <th className="text-center">{selectedDate ? 'Calls' : 'Avg Calls'}</th>
                                        <th className="text-center">{selectedDate ? 'Prospects' : 'Avg Prospects'}</th>
                                        <th className="text-center">{selectedDate ? 'Duration (mins)' : 'Avg Duration (mins)'}</th>
                                        <th className="text-center">{selectedDate ? 'Date' : 'Total Working Days'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {aggregatedData.map((userStats, index) => (
                                        <motion.tr
                                            key={userStats.name}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => setSelectedUser(userStats.name)}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        >
                                            <td className="font-semibold text-primary">{userStats.name}</td>
                                            <td>
                                                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                                    {userStats.team}
                                                </span>
                                            </td>
                                            <td className="text-center font-mono">
                                                {(userStats.totalCalls / (userStats.uniqueDates.size || 1)).toFixed(1)}
                                            </td>
                                            <td className="text-center font-mono text-success">
                                                {(userStats.totalProspects / (userStats.uniqueDates.size || 1)).toFixed(1)}
                                            </td>
                                            <td className="text-center font-mono">
                                                {(userStats.totalDuration / (userStats.uniqueDates.size || 1)).toFixed(0)}
                                            </td>
                                            <td className="text-center text-xs text-muted-foreground">
                                                {selectedDate ? format(selectedDate, 'yyyy-MM-dd') : `${userStats.uniqueDates.size} Days`}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </DashboardLayout>
    );
}

