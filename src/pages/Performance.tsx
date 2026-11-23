import { useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    TrendingUp,
    TrendingDown,
    Users,
    Target,
    Clock,
    ShieldCheck,
    Zap,
    Search,
    ArrowUpRight,
    ChevronRight,
    Activity,
    Info,
    CheckCircle2,
    BarChart3,
    Crown,
    Medal
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line,
    ScatterChart,
    Scatter,
    ZAxis
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { EPIIntroModal } from '@/components/dashboard/EPIIntroModal';
import { SalesRecord, User as AppUser } from '@/types';
import { getChronologicalValue } from '@/data/dataProcess';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export default function Performance() {
    const { user, isLoading: authLoading } = useAuth();

    // Show loading state while checking session

    // Restricted access: Admins and VP only
    const allowedRoles = ['Admin', 'Super Admin', 'Operations Leader', 'Vice President'];
    const hasAccess = user && (allowedRoles.includes(user.role) || user.name?.toLowerCase().includes('vaibhav'));

    if (!hasAccess) {
        return <Navigate to="/dashboard" replace />;
    }

    const [view, setView] = useState<'stability' | 'efficiency' | 'lead-conversion'>('stability');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDrive, setSelectedDrive] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedFinancialYear, setSelectedFinancialYear] = useState('');
    const [hasDefaultFYBeenSet, setHasDefaultFYBeenSet] = useState(false);
    const [isMyReportActive, setIsMyReportActive] = useState(false);
    const [isNonLeadersActive, setIsNonLeadersActive] = useState(false);

    const [listDialog, setListDialog] = useState<{ open: boolean, title: string, names: string[] }>({
        open: false,
        title: '',
        names: []
    });

    const [showAllModal, setShowAllModal] = useState(false);
    const [showEfficiencyModal, setShowEfficiencyModal] = useState(false);
    const [sourceViewAll, setSourceViewAll] = useState<{ open: boolean, source: string, leaders: any[] }>({
        open: false,
        source: '',
        leaders: []
    });
    const [searchTermAll, setSearchTermAll] = useState('');
    const [selectedPerformerForDetail, setSelectedPerformerForDetail] = useState<any>(null);
    const [showEPIIntro, setShowEPIIntro] = useState(false);

    // Show EPI intro modal on first visit — Vaibhav only
    useEffect(() => {
        const seen = localStorage.getItem('hikepad_epi_intro_seen_v1');
        if (!seen) setShowEPIIntro(true);
    }, []);

    const handleCloseEPIIntro = () => {
        localStorage.setItem('hikepad_epi_intro_seen_v1', 'true');
        setShowEPIIntro(false);
    };

    // Data Queries
    const { data: salesRecords, isLoading: salesLoading } = useQuery({
        queryKey: ['masterData', !!user],
        queryFn: () => api.getMasterData(),
        enabled: !!user
    });

    const { data: kraReports, isLoading: kraLoading } = useQuery({
        queryKey: ['kraReports', !!user],
        queryFn: () => api.getKRAReports(),
        enabled: !!user
    });

    const { data: allUsers, isLoading: usersLoading } = useQuery({
        queryKey: ['users', !!user],
        queryFn: () => api.getUsers(),
        enabled: !!user
    });

    const { data: sourceLeaders, isLoading: sourceLoading } = useQuery({
        queryKey: ['sourceLeaders', selectedBranch, !!user],
        queryFn: () => api.getSourceLeaders(selectedBranch === 'ALL' ? '' : selectedBranch),
        enabled: !!user
    });

    const { data: drivesData = [] } = useQuery({
        queryKey: ['drives', !!user],
        queryFn: () => api.getDrives(),
        enabled: !!user
    });

    const filterRecordsByRole = (records: SalesRecord[], allUsers: AppUser[] = []): SalesRecord[] => {
        if (!user) return [];
        switch (user.role) {
            case 'Admin':
            case 'Super Admin':
            case 'Operations Leader':
            case 'Vice President':
                return records;
            case 'Deputy Branch Manager':
            case 'DBM':
                if (isMyReportActive) return records.filter(record => record.bdeName === user.name);
                return records.filter(record => record.branch === user.branch);
            case 'Team Leader':
            case 'Proposed Team Leader (PTL)': {
                if (isMyReportActive) return records.filter(record => record.bdeName?.toLowerCase() === user.name?.toLowerCase());
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
                if (isMyReportActive) return records.filter(record => record.bdeName?.toLowerCase() === user.name?.toLowerCase());
                const inactiveUsersATL = new Set(allUsers.filter(u => u.inactive).map(u => (u.name || "").toLowerCase()));
                const userNameLower = user.name?.toLowerCase();

                return records.filter(record => {
                    const recordBdeLower = record.bdeName?.toLowerCase();
                    const recordATLLower = record.atl?.toLowerCase();
                    const recordTLLower = record.teamLeader?.toLowerCase();

                    return recordBdeLower === userNameLower ||
                        recordATLLower === userNameLower ||
                        recordTLLower === userNameLower;
                });
            }
            case 'Business Development Executive':
            case 'Business Development Manager (BDM)':
            case 'Senior Business Development Manager (Sr. BDM)':
                return records.filter(record => record.bdeName?.toLowerCase() === user.name?.toLowerCase());
            default:
                return records;
        }
    };

    const roleFilteredRecords = useMemo(() => {
        if (!salesRecords) return [];
        const validRecords = salesRecords.filter(r => {
            const yearNum = parseInt(r.fy) || 2025;
            let fy = yearNum;
            if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
                fy = yearNum - 1;
            }
            return fy >= 2025;
        });
        return filterRecordsByRole(validRecords, allUsers || []);
    }, [salesRecords, allUsers, user, isMyReportActive]);



    const availableBranches = useMemo(() => {
        const branches = new Set(roleFilteredRecords.map(r => r.branch));
        return Array.from(branches);
    }, [roleFilteredRecords]);

    const getFinancialYear = (r: SalesRecord) => {
        const yearNum = parseInt(r.fy) || 2025;
        if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
            return (yearNum - 1).toString();
        }
        return yearNum.toString();
    };

    const availableFinancialYears = useMemo(() => {
        const years = new Set(roleFilteredRecords.map(r => getFinancialYear(r)).filter(fy => fy));
        return Array.from(years).sort().reverse();
    }, [roleFilteredRecords]);

    const availableDrives = useMemo(() => {
        const uniqueDrives = new Set(drivesData.map(drive => drive.name));
        return Array.from(uniqueDrives);
    }, [drivesData]);

    const fyFilteredRecords = useMemo(() => {
        let records = roleFilteredRecords;
        if (selectedFinancialYear) records = records.filter(r => getFinancialYear(r) === selectedFinancialYear);
        return records;
    }, [roleFilteredRecords, selectedFinancialYear]);

    const overallFilteredRecords = useMemo(() => {
        let records = fyFilteredRecords;
        if (selectedBranch) records = records.filter(r => r.branch === selectedBranch);
        if (selectedDrive) {
            const matchedDrive = drivesData.find(d => d.name === selectedDrive);
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
                        return recordMonthNum >= matchedDrive.startMonth && recordMonthNum <= matchedDrive.endMonth;
                    } else {
                        return recordMonthNum >= matchedDrive.startMonth || recordMonthNum <= matchedDrive.endMonth;
                    }
                });
            }
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
    }, [fyFilteredRecords, selectedBranch, selectedDrive, selectedMonth, drivesData]);

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

    const filteredKraReports = useMemo(() => {
        if (!kraReports) return [];
        let reports = kraReports;
        if (selectedMonth) {
            const normalizedMonth = selectedMonth.includes(' - ') ? selectedMonth.split(' - ')[0] : selectedMonth;
            reports = reports.filter(r => (r.month || '').toUpperCase() === normalizedMonth.toUpperCase());
        }
        return reports;
    }, [kraReports, selectedMonth]);

    // Processed Data for Elite Performer Index (EPI)
    // Formula: 40% Success Rate + 30% Achievement + 20% Consistency + 10% Trend
    const stabilityData = useMemo(() => {
        if (!overallFilteredRecords.length) return [];

        const monthOrder = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'];
        const bdeMap: Record<string, {
            monthlyMetrics: { month: string, year: string, rate: number }[],
            totalAdm: number,
            closed: number,
            canceled: number,
            incomplete: number,
            totalTarget: number,
            totalClosedPoints: number,
            branch: string
        }> = {};

        // 1. Group and Calculate Monthly Data
        overallFilteredRecords.forEach(r => {
            const name = r.bdeName;
            if (!name) return;

            if (!bdeMap[name]) {
                bdeMap[name] = {
                    monthlyMetrics: [],
                    totalAdm: 0,
                    closed: 0,
                    canceled: 0,
                    incomplete: 0,
                    totalTarget: 0,
                    totalClosedPoints: 0,
                    branch: r.branch
                };
            }

            const stats = bdeMap[name];
            stats.totalAdm += (r.admissions || 0);
            stats.closed += (r.closedAdm || 0);
            stats.canceled += (r.cancellation || 0);
            stats.incomplete += (r.incomplete || 0);
            stats.totalTarget += (r.target || 0);
            stats.totalClosedPoints += (r.closedPoints || 0);

            const denom = (r.admissions || 0) + (r.cancellation || 0) + (r.incomplete || 0);
            const rate = denom === 0 ? 0 : (r.closedAdm || 0) / denom;
            stats.monthlyMetrics.push({
                month: (r.month || '').toUpperCase(),
                year: String(r.fy),
                rate
            });
        });

        return Object.entries(bdeMap).map(([name, stats]) => {
            // A. Base Success Rate (Primary Metric)
            const denominator = stats.totalAdm + stats.canceled + stats.incomplete;
            const successRate = denominator === 0 ? 0 : (stats.closed / denominator) * 100;

            // B. Consistency Score (Standard Deviation based)
            // Group by actual time periods to get unique monthly rates
            const rates = stats.monthlyMetrics.map(m => m.rate);
            const mean = rates.reduce((a, b) => a + b, 0) / (rates.length || 1);
            const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (rates.length || 1);
            const stdDev = Math.sqrt(variance);

            // Consistency: 100% is perfect (0 deviation), drops as deviation increases
            // 0.3 StdDev is a lot for 0-1 scale, so we scale it
            const consistency = Math.max(0, 100 - (stdDev * 150));

            // C. Trend Analysis (Last 2 months vs previous average)
            // Sort by month order
            const sortedMetrics = [...stats.monthlyMetrics].sort((a, b) => {
                const aIdx = monthOrder.indexOf(a.month);
                const bIdx = monthOrder.indexOf(b.month);
                return aIdx - bIdx;
            });

            let trend = 0; // -10 to +10
            if (sortedMetrics.length >= 2) {
                const recent = sortedMetrics[sortedMetrics.length - 1].rate;
                const prev = sortedMetrics[sortedMetrics.length - 2].rate;
                trend = (recent - prev) * 50; // Max difference (1.0) gives 50 points, capped later
            }

            // D. Achievement Power (40% Weight)
            const achievementRaw = stats.totalTarget === 0 ? 0 : (stats.totalClosedPoints / stats.totalTarget) * 100;
            const achievementScore = Math.min(110, achievementRaw); // Capped at 110% for ranking purposes

            // E. Elite Performer Index (EPI) - Well-thought Weighted Formula
            // IF DRIVE SELECTED: 45% Success Rate, 35% Achievement, 20% Consistency (Trend ignored)
            // DEFAULT: 40% Success Rate, 30% Achievement, 20% Consistency, 10% Trend
            const trendFactor = (Math.max(-10, Math.min(10, trend)) + 5); // Normalized trend score

            const isDriveActive = !!selectedDrive;
            const weightedIndex = isDriveActive
                ? (successRate * 0.45) + (achievementScore * 0.35) + (consistency * 0.20)
                : (successRate * 0.40) + (achievementScore * 0.30) + (consistency * 0.20) + (trendFactor);

            return {
                name,
                index: parseFloat(weightedIndex.toFixed(1)),
                achievement: parseFloat(achievementRaw.toFixed(1)),
                successRate: parseFloat(successRate.toFixed(1)),
                consistency: parseFloat(consistency.toFixed(1)),
                trend: parseFloat(trend.toFixed(1)),
                stdDev: parseFloat(stdDev.toFixed(3)),
                recentRate: sortedMetrics.length >= 1 ? parseFloat((sortedMetrics[sortedMetrics.length - 1].rate * 100).toFixed(1)) : 0,
                prevRate: sortedMetrics.length >= 2 ? parseFloat((sortedMetrics[sortedMetrics.length - 2].rate * 100).toFixed(1)) : 0,
                closed: stats.closed,
                total: stats.totalAdm,
                failed: stats.canceled + stats.incomplete,
                points: stats.totalClosedPoints,
                target: stats.totalTarget,
                branch: stats.branch,
                isDriveView: isDriveActive
            };
        })
            .filter(d => {
                // Statistical significance: must have at least 5 total record attempts
                const denom = d.total + d.failed;
                if (denom < 5) return false;

                const normName = d.name.trim().toLowerCase().replace(/\s+/g, ' ');
                if (allUsers) {
                    const u = (allUsers as AppUser[]).find(user => {
                        const uName = (user.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
                        const uUser = (user.username || '').trim().toLowerCase().replace(/\s+/g, ' ');
                        return uName === normName || uUser === normName;
                    });
                    if (u) return !u.inactive;
                }
                const records = overallFilteredRecords.filter(r => r.bdeName === d.name);
                const latestRecord = records[records.length - 1];
                return latestRecord ? !latestRecord.inactive : true;
            })
            .sort((a, b) => b.index - a.index);
    }, [overallFilteredRecords, allUsers]);

    // Processed Data for Effort vs Result
    // Formula: Total Talk Time / Closed Admissions
    const efficiencyData = useMemo(() => {
        if (!overallFilteredRecords.length || !filteredKraReports.length) return [];

        // Helper to normalize names for reliable matching
        const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

        const effortMap: Record<string, { prospects: number, admissions: number, branch: string, displayName: string }> = {};
        const normalizationMap: Record<string, string> = {}; // normalized -> original

        // 1. Get admissions from sales records
        overallFilteredRecords.forEach(r => {
            const name = r.bdeName;
            if (!name) return;
            const norm = normalize(name);

            if (!effortMap[norm]) {
                effortMap[norm] = { prospects: 0, admissions: 0, branch: r.branch, displayName: name };
                normalizationMap[norm] = name;
            }
            effortMap[norm].admissions += (r.closedAdm || r.admissions || 0);
        });

        // 2. Get prospects from KRA reports
        filteredKraReports.forEach(r => {
            const name = r.name;
            if (!name) return;
            const norm = normalize(name);

            // Try to find the BDE in our effort map using normalized name
            if (!effortMap[norm]) return;

            effortMap[norm].prospects += (Number(r.prospects) || 0);
        });

        return Object.entries(effortMap).map(([norm, stats]) => {
            const efficiency = stats.prospects === 0 ? 0 : (stats.admissions / stats.prospects) * 100;

            // Find user role for precise filtering
            let role = 'Business Development Executive';
            if (allUsers) {
                const u = (allUsers as AppUser[]).find(user => {
                    const uName = (user.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
                    const uUser = (user.username || '').trim().toLowerCase().replace(/\s+/g, ' ');
                    return uName === norm || uUser === norm;
                });
                if (u) role = u.role || 'Business Development Executive';
            }

            return {
                name: stats.displayName,
                prospects: stats.prospects,
                admissions: stats.admissions,
                efficiency: parseFloat(efficiency.toFixed(1)), // Higher is better (Conversion Rate)
                branch: stats.branch,
                role: role
            };
        })
            .filter(d => {
                if (d.prospects <= 5) return false; // Minimum volume to be statistically significant

                const normName = d.name.trim().toLowerCase().replace(/\s+/g, ' ');

                // Priority 1: Check users list
                if (allUsers) {
                    const u = (allUsers as AppUser[]).find(user => {
                        const uName = (user.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
                        const uUser = (user.username || '').trim().toLowerCase().replace(/\s+/g, ' ');
                        return uName === normName || uUser === normName;
                    });
                    if (u) return !u.inactive;
                }

                // Priority 2: Fallback to sales records
                const records = overallFilteredRecords.filter(r => r.bdeName === d.name);
                const latestRecord = records[records.length - 1];
                return latestRecord ? !latestRecord.inactive : true;
            })
            .sort((a, b) => b.efficiency - a.efficiency); // Higher conversion rate is better
    }, [overallFilteredRecords, filteredKraReports, allUsers]);



    const filteredStability = stabilityData.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const filteredEfficiency = useMemo(() => {
        let data = efficiencyData.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (isNonLeadersActive) {
            // Identify "Team Leaders" - Anyone with leadership or management roles
            const leaderRoles = [
                'Team Leader', 'Proposed Team Leader (PTL)',
                'Assistant Team Leader (ATL)', 'Proposed Assistant Team Leader (PATL)',
                'Deputy Branch Manager', 'DBM', 'Admin', 'Super Admin', 'Operations Leader', 'Vice President'
            ];

            // Filter for members who are NOT Team Leaders
            return data.filter(d => !leaderRoles.includes(d.role));
        }
        return data;
    }, [efficiencyData, searchTerm, isNonLeadersActive]);

    const isLoading = salesLoading || kraLoading || usersLoading;

    return (
        <>
            <EPIIntroModal isOpen={showEPIIntro} onClose={handleCloseEPIIntro} />
            <DashboardLayout
                title="Insights & Analytics"
                subtitle={view === 'stability' ? "Elite Performer Index and reliability tracking" :
                    view === 'efficiency' ? "Conversion rates and closing efficiency" :
                        "Lead conversion and source performance leaders"}
                searchQuery={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search performer..."
                liveRecords={allUsers?.map(u => ({ bdeName: u.name || '', inactive: u.inactive })) || []}
                actions={
                    <div className="relative p-1.5 bg-muted/50 dark:bg-background/50 backdrop-blur-sm border border-border dark:border-white/10 rounded-2xl flex items-center h-11 w-[420px] shadow-sm overflow-hidden">
                        <motion.div
                            className="absolute inset-1.5 bg-primary rounded-xl"
                            layoutId="activeTabHeader"
                            initial={false}
                            animate={{
                                x: view === 'stability' ? 0 : view === 'efficiency' ? 136 : 272
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            style={{ width: '136px' }}
                        />
                        <button
                            onClick={() => setView('stability')}
                            className={cn(
                                "relative flex-1 text-[11px] font-bold uppercase tracking-wider transition-colors z-10",
                                view === 'stability' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Stability
                        </button>
                        <button
                            onClick={() => setView('efficiency')}
                            className={cn(
                                "relative flex-1 text-[11px] font-bold uppercase tracking-wider transition-colors z-10",
                                view === 'efficiency' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Efficiency
                        </button>
                        <button
                            onClick={() => setView('lead-conversion')}
                            className={cn(
                                "relative flex-1 text-[11px] font-bold uppercase tracking-wider transition-colors z-10",
                                view === 'lead-conversion' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Source Conversion
                        </button>
                    </div>
                }
            >
                <div className="space-y-8 animate-in fade-in duration-500">
                    <FilterBar
                        branches={availableBranches}
                        drives={availableDrives}
                        months={availableMonths}
                        selectedBranch={selectedBranch}
                        selectedDrive={selectedDrive}
                        selectedMonth={selectedMonth}
                        onBranchChange={setSelectedBranch}
                        onDriveChange={setSelectedDrive}
                        onMonthChange={setSelectedMonth}
                        onMyReportToggle={() => {
                            setIsMyReportActive(!isMyReportActive);
                            setSelectedBranch('');
                            setSelectedDrive('');
                            setSelectedMonth('');
                            setSelectedFinancialYear('');
                        }}
                        isMyReportActive={isMyReportActive}
                        financialYears={availableFinancialYears}
                        selectedFinancialYear={selectedFinancialYear}
                        onFinancialYearChange={setSelectedFinancialYear}
                        showViewAll={view === 'stability'}
                        onViewAll={() => setShowAllModal(true)}
                        showNonLeadersOption={view === 'efficiency'}
                        isNonLeadersActive={isNonLeadersActive}
                        onNonLeadersToggle={() => setIsNonLeadersActive(!isNonLeadersActive)}
                    />



                    {/* Content Area */}
                    <AnimatePresence mode="wait">
                        {view === 'stability' ? (
                            <motion.div
                                key="stability"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Ranking Chart */}
                                    <Card className="lg:col-span-2 bg-background/40 backdrop-blur-2xl border-border dark:border-white/5 overflow-hidden rounded-3xl">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                                        Elite Performer Index (EPI)
                                                    </CardTitle>
                                                    <CardDescription>Performance Power Score (40% Success, 30% Achieve, 20% Const, 10% Trend)</CardDescription>
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Top 15 Performers</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="h-[400px]">
                                            {isLoading ? <Skeleton className="w-full h-full" /> : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={filteredStability.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                                                        <XAxis
                                                            dataKey="name"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            fontSize={10}
                                                            tick={{ fill: '#888888' }}
                                                            interval={0}
                                                            angle={-45}
                                                            textAnchor="end"
                                                            height={60}
                                                        />
                                                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#888888' }} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: 'rgba(var(--background), 0.8)',
                                                                backdropFilter: 'blur(8px)',
                                                                border: '1px solid rgba(128,128,128,0.2)',
                                                                borderRadius: '12px',
                                                                color: 'inherit'
                                                            }}
                                                            itemStyle={{ color: 'inherit' }}
                                                            cursor={{ fill: 'rgba(128,128,128,0.1)' }}
                                                        />
                                                        <Bar
                                                            dataKey="index"
                                                            name="Stability Index %"
                                                            radius={[6, 6, 0, 0]}
                                                            barSize={30}
                                                            onClick={(data) => setSelectedPerformerForDetail(data)}
                                                            className="cursor-pointer"
                                                        >
                                                            {filteredStability.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.index > 75 ? '#10b981' : entry.index > 50 ? '#6366f1' : '#f43f5e'} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Top Performers List */}
                                    <Card className="bg-background/40 backdrop-blur-2xl border-border dark:border-white/5 rounded-3xl">
                                        <CardHeader>
                                            <CardTitle className="text-xl">Elite Leaders</CardTitle>
                                            <CardDescription>Top overall performers</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {isLoading ? [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />) :
                                                    filteredStability.slice(0, 5).map((item, idx) => (
                                                        <div
                                                            key={item.name}
                                                            onClick={() => setSelectedPerformerForDetail(item)}
                                                            className="flex items-center justify-between p-4 bg-muted/20 dark:bg-white/5 rounded-2xl hover:bg-muted/30 dark:hover:bg-white/10 transition-colors group cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 font-bold">
                                                                    #{idx + 1}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold group-hover:text-primary transition-colors text-foreground">{item.name}</p>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        <p className="text-[9px] text-emerald-500 dark:text-emerald-400 font-bold tracking-tighter">{item.achievement}% ACH</p>
                                                                        <span className="text-[8px] opacity-20 text-foreground">•</span>
                                                                        <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">{item.successRate}% SUC</p>
                                                                        <span className="text-[8px] opacity-20 text-foreground">•</span>
                                                                        <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">{item.consistency}% CON</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <p className="text-lg font-black font-mono text-emerald-500 dark:text-emerald-400 leading-none">{item.index.toFixed(0)}%</p>
                                                                    <div className={`flex items-center gap-0.5 mt-1 ${item.trend >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                                                        {item.trend >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                                                                        <span className="text-[8px] font-bold uppercase">{Math.abs(item.trend).toFixed(0)}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {isLoading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />) : (
                                        <>
                                            <MetricCard title="Avg. Elite Index" value={`${(stabilityData.reduce((a, b) => a + b.index, 0) / (stabilityData.length || 1)).toFixed(1)}%`} icon={ShieldCheck} />
                                            <MetricCard
                                                title="Elite Performers (>85%)"
                                                value={stabilityData.filter(d => d.index >= 85).length}
                                                icon={Target}
                                                onClick={() => setListDialog({
                                                    open: true,
                                                    title: 'Elite Performers (EPI >85%)',
                                                    names: stabilityData.filter(d => d.index >= 85).map(d => `${d.name} (${d.index}%)`)
                                                })}
                                            />
                                            <MetricCard
                                                title="Moderate Performance"
                                                value={stabilityData.filter(d => d.index >= 50 && d.index < 85).length}
                                                icon={Activity}
                                                onClick={() => setListDialog({
                                                    open: true,
                                                    title: 'Moderate Performance (50-85%)',
                                                    names: stabilityData.filter(d => d.index >= 50 && d.index < 85).map(d => `${d.name} (${d.index}%)`)
                                                })}
                                            />
                                            <MetricCard
                                                title="Attention Reqd ( <50% )"
                                                value={stabilityData.filter(d => d.index < 50).length}
                                                icon={TrendingUp}
                                                onClick={() => setListDialog({
                                                    open: true,
                                                    title: 'Attention Required Performers (<50%)',
                                                    names: stabilityData.filter(d => d.index < 50).map(d => `${d.name} (${d.index}%)`)
                                                })}
                                            />
                                        </>
                                    )}
                                </div>


                            </motion.div>
                        ) : view === 'efficiency' ? (
                            <motion.div
                                key="efficiency"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Efficiency Chart */}
                                    <Card className="lg:col-span-2 bg-background/40 backdrop-blur-2xl border-border dark:border-white/5 overflow-hidden rounded-3xl">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                                        <Zap className="w-5 h-5 text-amber-400" />
                                                        {isNonLeadersActive ? 'Non-Leader Conversion Ratio' : 'Prospect Conversion Ratio'}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {isNonLeadersActive ? 'Conversion metrics for performers outside top 5' : 'Admissions achieved per 100 prospects (Higher is better)'}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="h-[400px]">
                                            {isLoading ? <Skeleton className="w-full h-full" /> : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={filteredEfficiency.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                                                        <XAxis
                                                            dataKey="name"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            fontSize={10}
                                                            tick={{ fill: '#888888' }}
                                                            interval={0}
                                                            angle={-45}
                                                            textAnchor="end"
                                                            height={60}
                                                        />
                                                        <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#888888' }} label={{ value: 'Conversion %', angle: -90, position: 'insideLeft', fill: '#888888', fontSize: 10 }} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: 'rgba(var(--background), 0.8)',
                                                                backdropFilter: 'blur(8px)',
                                                                border: '1px solid rgba(128,128,128,0.2)',
                                                                borderRadius: '12px',
                                                                color: 'inherit'
                                                            }}
                                                            itemStyle={{ color: 'inherit' }}
                                                            cursor={{ fill: 'rgba(128,128,128,0.1)' }}
                                                        />
                                                        <Bar dataKey="efficiency" name="Conversion Rate" radius={[6, 6, 0, 0]} barSize={30}>
                                                            {filteredEfficiency.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.efficiency > 20 ? '#10b981' : entry.efficiency > 10 ? '#f59e0b' : '#f43f5e'} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-background/40 backdrop-blur-2xl border-border dark:border-white/5 rounded-3xl">
                                        <CardHeader>
                                            <CardTitle className="text-xl font-bold text-foreground">
                                                {isNonLeadersActive ? 'Non-Leader Efficiency' : 'Efficiency Leaders'}
                                            </CardTitle>
                                            <CardDescription>
                                                {isNonLeadersActive ? 'Non-Team Leaders outside top 5' : 'Fastest closure rates'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {isLoading ? [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />) :
                                                    filteredEfficiency.slice(0, 5).map((item, idx) => (
                                                        <div key={item.name} className="flex items-center justify-between p-4 bg-muted/20 dark:bg-white/5 rounded-2xl hover:bg-muted/30 dark:hover:bg-white/10 transition-colors group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 dark:text-amber-400 font-bold">
                                                                    #{isNonLeadersActive ? idx + 6 : idx + 1}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold group-hover:text-primary transition-colors text-foreground">{item.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.prospects} Prospects | {item.admissions} Adm.</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-black font-mono text-amber-500 dark:text-amber-400">{item.efficiency.toFixed(1)}%</p>
                                                                <p className="text-[8px] text-muted-foreground uppercase font-bold">Conv. Rate</p>
                                                            </div>
                                                        </div>
                                                    ))}

                                                {filteredEfficiency.length > 5 && (
                                                    <button
                                                        onClick={() => setShowEfficiencyModal(true)}
                                                        className="w-full mt-4 py-3 rounded-2xl border border-dashed border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5 text-amber-500 text-[10px] font-black uppercase tracking-widest transition-all group flex items-center justify-center gap-2"
                                                    >
                                                        View All Ranking
                                                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                    </button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Efficiency Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {isLoading ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />) : (
                                        <>
                                            <MetricCard title="Avg. Conversion" value={`${(efficiencyData.reduce((a, b) => a + b.efficiency, 0) / (efficiencyData.length || 1)).toFixed(1)}%`} icon={Zap} />
                                            <MetricCard
                                                title="High Conversion ( >20% )"
                                                value={efficiencyData.filter(d => d.efficiency > 20).length}
                                                icon={ShieldCheck}
                                                onClick={() => setListDialog({
                                                    open: true,
                                                    title: 'High Conversion (>20%)',
                                                    names: efficiencyData.filter(d => d.efficiency > 20).map(d => `${d.name} (${d.efficiency}%)`)
                                                })}
                                            />
                                            <MetricCard
                                                title="Average Performers"
                                                value={efficiencyData.filter(d => d.efficiency >= 10 && d.efficiency <= 20).length}
                                                icon={Activity}
                                                onClick={() => setListDialog({
                                                    open: true,
                                                    title: 'Average Performers (10-20%)',
                                                    names: efficiencyData.filter(d => d.efficiency >= 10 && d.efficiency <= 20).map(d => `${d.name} (${d.efficiency}%)`)
                                                })}
                                            />
                                            <MetricCard
                                                title="Needs Optimization"
                                                value={efficiencyData.filter(d => d.efficiency < 10).length}
                                                icon={TrendingUp}
                                                onClick={() => setListDialog({
                                                    open: true,
                                                    title: 'Needs Optimization (<10%)',
                                                    names: efficiencyData.filter(d => d.efficiency < 10).map(d => `${d.name} (${d.efficiency}%)`)
                                                })}
                                            />
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="lead-conversion"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="space-y-10"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sourceLoading ? (
                                        [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[400px] rounded-3xl" />)
                                    ) : sourceLeaders?.length > 0 ? (
                                        sourceLeaders.map((source: any, idx: number) => (
                                            <Card key={idx} className="bg-background/40 backdrop-blur-2xl border-border dark:border-white/5 rounded-3xl overflow-hidden group hover:border-primary/40 transition-all flex flex-col">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                                                            <Target className="w-5 h-5 text-emerald-500" />
                                                            <span className="truncate max-w-[150px] text-foreground">{source.source}</span>
                                                        </CardTitle>
                                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                            {source.totalAdmissions} Admissions
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="flex-1 pb-4">
                                                    <div className="space-y-3">
                                                        {source.leaders.slice(0, 5).map((leader: any, lIdx: number) => (
                                                            <div key={lIdx} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border hover:bg-muted/30 transition-colors group/item relative overflow-hidden">
                                                                <div className="absolute inset-y-0 left-0 w-1 bg-primary/40 translate-x-[-100%] group-hover/item:translate-x-0 transition-transform" />
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
                                                                        #{lIdx + 1}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold truncate max-w-[100px] group-hover/item:text-primary transition-colors text-foreground">{leader.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{leader.count} Adm.</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                                                                        ₹{leader.revenue >= 100000 ? `${(leader.revenue / 100000).toFixed(1)}L` : `${(leader.revenue / 1000).toFixed(0)}k`}
                                                                    </p>
                                                                    <p className="text-[8px] text-muted-foreground uppercase font-bold">Revenue</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {source.leaders.length > 5 && (
                                                        <button
                                                            onClick={() => setSourceViewAll({ open: true, source: source.source, leaders: source.leaders })}
                                                            className="w-full mt-4 py-3 rounded-2xl border border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest transition-all group flex items-center justify-center gap-2"
                                                        >
                                                            View All Contributors
                                                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                        </button>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <div className="col-span-full h-64 flex flex-col items-center justify-center bg-background/20 rounded-3xl border border-dashed border-border dark:border-white/10 italic text-muted-foreground">
                                            <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                                            No source lead data available for the selected filters
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Performer List Dialog */}
                    <Dialog open={listDialog.open} onOpenChange={(open) => setListDialog(prev => ({ ...prev, open }))}>
                        <DialogContent className="max-w-md bg-background border-border backdrop-blur-xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-3">
                                    <Users className="w-5 h-5 text-primary" />
                                    {listDialog.title}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 space-y-2">
                                {listDialog.names.length > 0 ? (
                                    listDialog.names.map((name, i) => {
                                        const displayName = name.split(' (')[0];
                                        const scoreValue = parseFloat(name.split(' (')[1].replace('%)', ''));
                                        const performer = stabilityData.find(d => d.name === displayName);

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setSelectedPerformerForDetail(performer)}
                                                className={cn(
                                                    "p-4 rounded-xl border border-white/5 flex justify-between items-center group transition-all duration-300 cursor-pointer hover:scale-[1.02]",
                                                    scoreValue >= 75 ? "bg-emerald-500/10 hover:bg-emerald-500/20" :
                                                        scoreValue >= 50 ? "bg-amber-500/10 hover:bg-amber-500/20" :
                                                            "bg-rose-500/10 hover:bg-rose-500/20"
                                                )}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-sm">{displayName}</span>
                                                    {user?.name?.toLowerCase().includes('vaibhav') && (
                                                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click for details</span>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className={cn(
                                                    "font-mono font-black",
                                                    scoreValue >= 75 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                                                        scoreValue >= 50 ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                                                            "bg-rose-500/20 text-rose-400 border-rose-500/40"
                                                )}>
                                                    {scoreValue}%
                                                </Badge>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No performers in this category</p>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Metric Definitions Note */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-12"
                    >
                        <Card className="bg-primary/5 border-primary/10 rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-primary/10 bg-primary/5">
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                                    <Info className="w-5 h-5" />
                                    Understanding the Performance Metrics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                        <h4 className="font-bold text-foreground">Elite Performer Index (EPI)</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        A balanced "Power Score" that evaluates a BDE's total impact by weighing volume, quality, and reliability.
                                    </p>
                                    <ul className="space-y-3">
                                        <li className="flex gap-3 text-xs">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">40% Success Rate:</span>
                                            <span className="text-muted-foreground font-medium">Historical closure efficiency (Closed vs. Non Closed Admissions).</span>
                                        </li>
                                        <li className="flex gap-3 text-xs">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">30% Achievement:</span>
                                            <span className="text-muted-foreground font-medium">Admissions vs. assigned Target. Capped at 110% to prevent extreme outliers from skewing the team average.</span>
                                        </li>
                                        <li className="flex gap-3 text-xs">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">20% Consistency:</span>
                                            <span className="text-muted-foreground font-medium">Monthly volatility score. Higher scores go to those who hit their numbers reliably every month.</span>
                                        </li>
                                        <li className="flex gap-3 text-xs">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">10% Trend:</span>
                                            <span className="text-muted-foreground font-medium">Recent momentum (improvement over last 2 months).</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                        <h4 className="font-bold text-foreground">Prospect Conversion Ratio</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Measures the pure efficiency of a BDE's pipeline conversion.
                                    </p>
                                    <div className="p-4 bg-muted/20 dark:bg-white/5 rounded-2xl border border-border dark:border-white/5">
                                        <p className="text-xs font-mono text-amber-400">
                                            Formula: (Total Admissions / Total Prospects) × 100
                                        </p>
                                    </div>
                                    <p className="text-xs text-foreground/70 dark:text-muted-foreground font-bold italic">
                                        *Note: A minimum of 5 prospects/attempts is required for a performer to be included in these rankings to ensure statistical significance.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                    {/* Redesigned Premium View All Performance Modal */}
                    <Dialog open={showAllModal} onOpenChange={(open) => {
                        setShowAllModal(open);
                        if (!open) setSearchTermAll('');
                    }}>
                        <DialogContent className="max-w-5xl bg-background/95 border-border backdrop-blur-3xl rounded-[2rem] p-0 overflow-hidden shadow-2xl border-white/20">
                            <DialogHeader className="p-8 pb-6 bg-muted/30 border-b border-border sticky top-0 z-20 backdrop-blur-md">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <DialogTitle className="text-3xl font-black text-foreground flex items-center gap-3 tracking-tighter">
                                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                <Users className="w-6 h-6 text-primary" />
                                            </div>
                                            TEAM RANKINGS
                                        </DialogTitle>
                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] ml-[3.25rem]">Complete Performance Index</p>
                                    </div>
                                    <div className="relative group w-full md:w-72">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            placeholder="Find team member..."
                                            value={searchTermAll}
                                            onChange={(e) => setSearchTermAll(e.target.value)}
                                            className="pl-11 pr-4 py-6 bg-background/50 border-border rounded-2xl focus:ring-primary/20 transition-all text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
                                {stabilityData
                                    .filter(p => p.name.toLowerCase().includes(searchTermAll.toLowerCase()) || p.branch.toLowerCase().includes(searchTermAll.toLowerCase()))
                                    .map((performer, i) => {
                                        const score = performer.index;
                                        const rank = i + 1;
                                        const getScoreStyle = (s: number) => {
                                            if (s >= 90) return "from-emerald-500 to-teal-500 shadow-emerald-500/20 text-white border-emerald-400/50";
                                            if (s >= 75) return "from-blue-500 to-indigo-500 shadow-blue-500/20 text-white border-blue-400/50";
                                            if (s >= 60) return "from-amber-500 to-orange-500 shadow-amber-500/20 text-white border-amber-400/50";
                                            return "from-rose-500 to-red-500 shadow-rose-500/20 text-white border-rose-400/50";
                                        };

                                        return (
                                            <motion.div
                                                key={performer.name}
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05, duration: 0.4 }}
                                                onClick={() => setSelectedPerformerForDetail(performer)}
                                                className="group flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[1.5rem] bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden cursor-pointer"
                                            >
                                                {/* Left Section: Score + Name */}
                                                <div className="flex items-center gap-6">
                                                    {/* Score Pill */}
                                                    <div className="relative">
                                                        <div className={cn(
                                                            "w-16 h-16 md:w-20 md:h-20 rounded-3xl flex flex-col items-center justify-center bg-gradient-to-br border-2 shadow-xl shrink-0 transition-transform duration-500 group-hover:scale-105",
                                                            getScoreStyle(score)
                                                        )}>
                                                            <span className="text-xl md:text-2xl font-black tracking-tighter leading-none">{score.toFixed(0)}</span>
                                                            <span className="text-[8px] font-black uppercase tracking-widest opacity-80 mt-1">EPI Score</span>
                                                        </div>
                                                        {/* Glow Effect */}
                                                        <div className={cn(
                                                            "absolute inset-0 rounded-3xl blur-2xl opacity-20 -z-10 transition-opacity duration-500 group-hover:opacity-40",
                                                            score >= 90 ? "bg-emerald-500" : score >= 75 ? "bg-blue-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500"
                                                        )} />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
                                                                {performer.name}
                                                            </span>
                                                            {rank === 1 && <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10"><Crown className="w-5 h-5" fill="currentColor" fillOpacity={0.2} /></div>}
                                                            {rank > 1 && rank <= 3 && (
                                                                <div className={cn(
                                                                    "p-1.5 rounded-full shadow-lg",
                                                                    rank === 2 ? "bg-slate-400/20 text-slate-400 shadow-slate-400/10" : "bg-orange-400/20 text-orange-400 shadow-orange-400/10"
                                                                )}>
                                                                    <Medal className="w-4 h-4" fill="currentColor" fillOpacity={0.2} />
                                                                </div>
                                                            )}
                                                            {rank <= 3 && (
                                                                <div className={cn(
                                                                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border",
                                                                    rank === 1 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                                                                        rank === 2 ? "bg-slate-400/20 text-slate-600 dark:text-slate-400 border-slate-400/30" :
                                                                            "bg-orange-400/20 text-orange-600 dark:text-orange-400 border-orange-400/30"
                                                                )}>
                                                                    Tier {rank}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Badge variant="secondary" className="bg-muted text-[10px] font-bold tracking-widest px-2 py-0">
                                                                {performer.branch} BRANCH
                                                            </Badge>
                                                            <div className="w-1 h-1 rounded-full bg-border" />
                                                            <span className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">#{rank} Ranked</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Section: Progress Indicators */}
                                                <div className="mt-6 md:mt-0 flex flex-col md:flex-row gap-6 md:gap-12 md:mr-4">
                                                    {/* Success Metric */}
                                                    <div className="w-full md:w-36 space-y-2">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Success</span>
                                                            <span className="text-xs font-black text-foreground font-mono">{performer.successRate}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${performer.successRate}%` }}
                                                                transition={{ duration: 1, delay: 0.5 }}
                                                                className="h-full bg-primary rounded-full relative"
                                                            >
                                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                            </motion.div>
                                                        </div>
                                                    </div>

                                                    {/* Achievement Metric */}
                                                    <div className="w-full md:w-36 space-y-2">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Achievement</span>
                                                            <span className="text-xs font-black text-foreground font-mono">{performer.achievement}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, performer.achievement)}%` }}
                                                                transition={{ duration: 1, delay: 0.7 }}
                                                                className={cn(
                                                                    "h-full rounded-full relative",
                                                                    performer.achievement >= 100 ? "bg-emerald-500" : "bg-blue-500"
                                                                )}
                                                            >
                                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                            </motion.div>
                                                        </div>
                                                    </div>

                                                    {user?.name?.toLowerCase().includes('vaibhav') && (
                                                        <div className="hidden md:flex items-center">
                                                            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-300">
                                                                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                {stabilityData.filter(p => p.name.toLowerCase().includes(searchTermAll.toLowerCase()) || p.branch.toLowerCase().includes(searchTermAll.toLowerCase())).length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                                            <Search className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-foreground">No matches found</p>
                                            <p className="text-sm text-muted-foreground">Try searching for a different name or branch</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Efficiency Leaderboard Modal */}
                    <Dialog open={showEfficiencyModal} onOpenChange={(open) => {
                        setShowEfficiencyModal(open);
                        if (!open) setSearchTermAll('');
                    }}>
                        <DialogContent className="max-w-5xl bg-background/95 border-border backdrop-blur-3xl rounded-[2rem] p-0 overflow-hidden shadow-2xl border-white/20">
                            <DialogHeader className="p-8 pb-6 bg-muted/30 border-b border-border sticky top-0 z-20 backdrop-blur-md">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <DialogTitle className="text-3xl font-black text-foreground flex items-center gap-3 tracking-tighter">
                                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                                <Zap className="w-6 h-6 text-amber-500" />
                                            </div>
                                            {isNonLeadersActive ? 'NON-LEADER RANKINGS' : 'EFFICIENCY RANKINGS'}
                                        </DialogTitle>
                                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] ml-[3.25rem]">
                                            {isNonLeadersActive ? 'Full Team Performance (Excl. Top 5)' : 'Prospect Conversion Analysis'}
                                        </p>
                                    </div>
                                    <div className="relative group w-full md:w-72">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            placeholder="Find team member..."
                                            value={searchTermAll}
                                            onChange={(e) => setSearchTermAll(e.target.value)}
                                            className="pl-11 pr-4 py-6 bg-background/50 border-border rounded-2xl focus:ring-primary/20 transition-all text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-amber-500/10 hover:scrollbar-thumb-amber-500/20">
                                {(() => {
                                    const chartLeadersNames = new Set(efficiencyData.slice(0, 5).map(d => d.name));
                                    const leaderRoles = [
                                        'Team Leader', 'Proposed Team Leader (PTL)',
                                        'Assistant Team Leader (ATL)', 'Proposed Assistant Team Leader (PATL)',
                                        'Deputy Branch Manager', 'DBM', 'Admin', 'Super Admin', 'Operations Leader', 'Vice President'
                                    ];

                                    let displayData = efficiencyData;
                                    if (isNonLeadersActive) {
                                        displayData = efficiencyData.filter(d =>
                                            !leaderRoles.includes(d.role) &&
                                            !chartLeadersNames.has(d.name)
                                        );
                                    }

                                    return displayData
                                        .filter(p => p.name.toLowerCase().includes(searchTermAll.toLowerCase()) || p.branch.toLowerCase().includes(searchTermAll.toLowerCase()))
                                        .map((performer, i) => {
                                            const score = performer.efficiency;
                                            // Find absolute rank from original efficiencyData (includes everyone)
                                            const rank = efficiencyData.findIndex(d => d.name === performer.name) + 1;
                                            const getScoreStyle = (s: number) => {
                                                if (s >= 25) return "from-emerald-500 to-teal-500 shadow-emerald-500/20 text-white border-emerald-400/50";
                                                if (s >= 15) return "from-blue-500 to-indigo-500 shadow-blue-500/20 text-white border-blue-400/50";
                                                if (s >= 10) return "from-amber-500 to-orange-500 shadow-amber-500/20 text-white border-amber-400/50";
                                                return "from-rose-500 to-red-500 shadow-rose-500/20 text-white border-rose-400/50";
                                            };

                                            return (
                                                <motion.div
                                                    key={performer.name}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05, duration: 0.4 }}
                                                    className="group flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[1.5rem] bg-card border border-border/50 hover:border-amber-500/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className="relative">
                                                            <div className={cn(
                                                                "w-16 h-16 md:w-20 md:h-20 rounded-3xl flex flex-col items-center justify-center bg-gradient-to-br border-2 shadow-xl shrink-0 transition-transform duration-500 group-hover:scale-105",
                                                                getScoreStyle(score)
                                                            )}>
                                                                <span className="text-xl md:text-2xl font-black tracking-tighter leading-none">{score.toFixed(1)}%</span>
                                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-80 mt-1 text-center px-1">Conv. Rate</span>
                                                            </div>
                                                            <div className={cn(
                                                                "absolute inset-0 rounded-3xl blur-2xl opacity-20 -z-10 transition-opacity duration-500 group-hover:opacity-40",
                                                                score >= 25 ? "bg-emerald-500" : score >= 15 ? "bg-blue-500" : score >= 10 ? "bg-amber-500" : "bg-rose-500"
                                                            )} />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xl font-bold text-foreground tracking-tight group-hover:text-amber-500 transition-colors duration-300">
                                                                    {performer.name}
                                                                </span>
                                                                {rank <= 3 && (
                                                                    <div className={cn(
                                                                        "p-1.5 rounded-full shadow-lg",
                                                                        rank === 1 ? "bg-amber-500/20 text-amber-500 shadow-amber-500/10" :
                                                                            rank === 2 ? "bg-slate-400/20 text-slate-400 shadow-slate-400/10" : "bg-orange-400/20 text-orange-400 shadow-orange-400/10"
                                                                    )}>
                                                                        {rank === 1 ? <Crown className="w-5 h-5" fill="currentColor" fillOpacity={0.2} /> : <Medal className="w-4 h-4" fill="currentColor" fillOpacity={0.2} />}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="secondary" className="bg-muted text-[10px] font-bold tracking-widest px-2 py-0">
                                                                    {performer.branch} BRANCH
                                                                </Badge>
                                                                <div className="w-1 h-1 rounded-full bg-border" />
                                                                <span className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">#{rank} Ranked</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 md:mt-0 flex flex-col md:flex-row gap-6 md:gap-12 md:mr-4">
                                                        <div className="w-full md:w-36 space-y-2">
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Prospects</span>
                                                                <span className="text-xs font-black text-foreground font-mono">{performer.prospects}</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(100, (performer.prospects / 500) * 100)}%` }}
                                                                    transition={{ duration: 1 }}
                                                                    className="h-full bg-muted-foreground/30 rounded-full"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="w-full md:w-36 space-y-2">
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Admissions</span>
                                                                <span className="text-xs font-black text-foreground font-mono">{performer.admissions}</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(100, (performer.admissions / 100) * 100)}%` }}
                                                                    transition={{ duration: 1 }}
                                                                    className="h-full bg-amber-500 rounded-full relative"
                                                                >
                                                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                                </motion.div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        });
                                })()}

                                {(() => {
                                    const chartLeadersNames = new Set(efficiencyData.slice(0, 5).map(d => d.name));
                                    const leaderRoles = [
                                        'Team Leader', 'Proposed Team Leader (PTL)',
                                        'Assistant Team Leader (ATL)', 'Proposed Assistant Team Leader (PATL)',
                                        'Deputy Branch Manager', 'DBM', 'Admin', 'Super Admin', 'Operations Leader', 'Vice President'
                                    ];

                                    let displayData = efficiencyData;
                                    if (isNonLeadersActive) {
                                        displayData = efficiencyData.filter(d =>
                                            !leaderRoles.includes(d.role) &&
                                            !chartLeadersNames.has(d.name)
                                        );
                                    }

                                    const results = displayData.filter(p => p.name.toLowerCase().includes(searchTermAll.toLowerCase()) || p.branch.toLowerCase().includes(searchTermAll.toLowerCase()));

                                    if (results.length === 0) {
                                        return (
                                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                                                    <Search className="w-8 h-8 text-muted-foreground" />
                                                </div>
                                                <p className="text-xl font-bold text-foreground">No matches found</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Vaibhav Detailed Calculation View */}
                    <Dialog open={!!selectedPerformerForDetail} onOpenChange={() => setSelectedPerformerForDetail(null)}>
                        <DialogContent className="max-w-2xl bg-background border-border backdrop-blur-3xl rounded-3xl overflow-hidden">
                            <DialogHeader className="p-8 pb-4">
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "w-20 h-20 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl skew-x-[-4deg]",
                                        selectedPerformerForDetail?.index >= 75 ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30" :
                                            selectedPerformerForDetail?.index >= 50 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-2 border-amber-500/30" :
                                                "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-2 border-rose-500/30"
                                    )}>
                                        {selectedPerformerForDetail?.index.toFixed(0)}
                                    </div>
                                    <div className="space-y-1">
                                        <DialogTitle className="text-4xl font-bold text-foreground tracking-tighter uppercase">{selectedPerformerForDetail?.name}</DialogTitle>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest">{selectedPerformerForDetail?.branch} UNIT</Badge>
                                            <div className="h-4 w-[1px] bg-border dark:bg-white/10" />
                                            <p className="text-xs font-bold text-muted-foreground uppercase">EPI Stability Analysis {selectedPerformerForDetail?.isDriveView ? "(Drive Restricted)" : ""}</p>
                                        </div>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="p-8 pt-4">
                                <div className="bg-muted/10 dark:bg-white/5 rounded-3xl border border-border dark:border-white/10 overflow-hidden shadow-3xl">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/20 dark:bg-white/5 border-b border-border dark:border-white/5">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Factor Component</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Weight</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Exact Calculation</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border dark:divide-white/5">
                                            <tr className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-foreground">Target Achievement</span>
                                                        <span className="text-[9px] text-muted-foreground uppercase font-black opacity-60">Revenue Performance</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center text-xs font-bold text-muted-foreground">
                                                    {selectedPerformerForDetail?.isDriveView ? '35%' : '30%'}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-mono font-bold text-foreground">{selectedPerformerForDetail?.points || 0} / {selectedPerformerForDetail?.target || 0}</span>
                                                        <span className="text-[8px] text-muted-foreground uppercase font-black">Points / Target</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-mono font-black text-primary text-base">{selectedPerformerForDetail?.achievement}%</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-foreground">Success Rate</span>
                                                        <span className="text-[9px] text-muted-foreground uppercase font-black opacity-60">Closure Efficiency</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center text-xs font-bold text-muted-foreground">
                                                    {selectedPerformerForDetail?.isDriveView ? '45%' : '40%'}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-mono font-bold text-foreground">{selectedPerformerForDetail?.closed} / {selectedPerformerForDetail?.total + (selectedPerformerForDetail?.failed || 0)}</span>
                                                        <span className="text-[8px] text-muted-foreground uppercase font-black">Approved / Attempts</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-mono font-black text-primary text-base">{selectedPerformerForDetail?.successRate}%</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-foreground">Stability Consistency</span>
                                                        <span className="text-[9px] text-muted-foreground uppercase font-black opacity-60">Monthly Rates StdDev</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center text-xs font-bold text-muted-foreground">20%</td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center text-foreground">
                                                        <span className="text-xs font-mono font-bold">σ = {selectedPerformerForDetail?.stdDev}</span>
                                                        <span className="text-[8px] text-muted-foreground uppercase font-black">Standard Deviation</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-mono font-black text-primary text-base">{selectedPerformerForDetail?.consistency}%</td>
                                            </tr>
                                            <tr className={cn(
                                                "hover:bg-muted/30 transition-colors",
                                                selectedPerformerForDetail?.isDriveView ? "opacity-30 grayscale" : ""
                                            )}>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-foreground">Momentum Trend</span>
                                                        <span className="text-[9px] text-muted-foreground uppercase font-black opacity-60">
                                                            {selectedPerformerForDetail?.isDriveView ? "Disabled for Drive View" : "Improvement Index"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center text-xs font-bold text-muted-foreground">
                                                    {selectedPerformerForDetail?.isDriveView ? '0%' : '10%'}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center text-foreground">
                                                        <span className="text-xs font-mono font-bold">{selectedPerformerForDetail?.recentRate}% vs {selectedPerformerForDetail?.prevRate}%</span>
                                                        <span className="text-[8px] text-muted-foreground uppercase font-black">Recent vs Prev</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-mono font-black text-primary text-base">
                                                    {selectedPerformerForDetail?.isDriveView ? '—' : (selectedPerformerForDetail?.trend > 0 ? '+' : '') + selectedPerformerForDetail?.trend + '%'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-8 flex justify-between items-center bg-primary/5 p-6 rounded-3xl border border-primary/20">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Final Elite Index Calculation</p>
                                        <p className="text-xs text-muted-foreground italic font-medium">
                                            {selectedPerformerForDetail?.isDriveView
                                                ? "Calculated as: (SuccessRate × 0.45) + (Achievement × 0.35) + (Consistency × 0.20)"
                                                : "Weighted sum of normalized performance factors (40/30/20/10)"}
                                        </p>
                                    </div>
                                    <div className="text-4xl font-black font-mono text-primary tracking-tighter">
                                        {selectedPerformerForDetail?.index.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog >

                    {/* Source Leaderboard View All Modal */}
                    <Dialog open={sourceViewAll.open} onOpenChange={(open) => setSourceViewAll(prev => ({ ...prev, open }))}>
                        <DialogContent className="max-w-2xl bg-background/95 border-border backdrop-blur-3xl rounded-[2rem] p-0 overflow-hidden shadow-2xl border-white/20">
                            <DialogHeader className="p-8 pb-6 bg-muted/30 border-b border-border sticky top-0 z-20 backdrop-blur-md">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3 tracking-tighter uppercase">
                                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                                <Target className="w-6 h-6 text-emerald-500" />
                                            </div>
                                            {sourceViewAll.source} Leaders
                                        </DialogTitle>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] ml-[3.25rem]">Full contributor list</p>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
                                {sourceViewAll.leaders.map((leader, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                                                #{i + 1}
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{leader.name}</p>
                                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{leader.count} Admissions</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                                                ₹{leader.revenue >= 100000 ? `${(leader.revenue / 100000).toFixed(1)}L` : `${(leader.revenue / 1000).toFixed(0)}k`}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Revenue</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div >
            </DashboardLayout >
        </>
    );
}

function MetricCard({ title, value, icon: Icon, onClick }: { title: string, value: string | number, icon: any, onClick?: () => void }) {
    return (
        <Card
            className={cn(
                "bg-background/40 backdrop-blur-2xl border-border dark:border-white/5 rounded-3xl transition-all",
                onClick ? "cursor-pointer hover:border-primary/40 hover:bg-background/60 hover:scale-[1.02] active:scale-[0.98]" : ""
            )}
            onClick={onClick}
        >
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                    <Icon className="w-4 h-4 text-primary opacity-50" />
                </div>
                <h3 className="text-2xl font-black font-mono tracking-tight text-foreground">{value}</h3>
                {onClick && (
                    <div className="mt-2 flex items-center text-[10px] text-primary font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                        View List <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
