import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Users,
    TrendingUp,
    GraduationCap,
    DollarSign,
    Target,
    BarChart3,
    Briefcase,
    Building2,
    Calendar as CalendarIcon,
    Search,
    Filter,
    RotateCcw,
    ArrowLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    CircleDashed,
    FileText,
    ArrowUpRight
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export default function Revenue() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [selectedFY, setSelectedFY] = useState<string>('all');
    const [hasDefaultFYBeenSet, setHasDefaultFYBeenSet] = useState(false);

    const months = [
        "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];

    // Queries
    const { data: dbStatuses } = useQuery({
        queryKey: ['revenueStatuses'],
        queryFn: () => api.getAdmissionStatuses()
    });

    const { data: masterData } = useQuery({
        queryKey: ['masterDataFY'],
        queryFn: () => api.getMasterData()
    });

    const getFinancialYear = (r: any) => {
        const yearNum = parseInt(r.fy) || 2025;
        if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
            return (yearNum - 1).toString();
        }
        return yearNum.toString();
    };

    const availableFYs = useMemo(() => {
        if (!masterData) return [];
        const validRecords = masterData.filter(r => {
            const yearNum = parseInt(r.fy) || 2025;
            let fy = yearNum;
            if (['JANUARY', 'FEBRUARY', 'MARCH'].includes(r.month?.toUpperCase())) {
                fy = yearNum - 1;
            }
            return fy >= 2025;
        });
        const years = new Set(validRecords.map(r => getFinancialYear(r)).filter(fy => fy));
        return Array.from(years).sort().reverse();
    }, [masterData]);



    const { data: bdeStats, isLoading: bdeLoading } = useQuery({
        queryKey: ['revenueBdeStats', selectedBranch, selectedStatus, startDate, endDate, selectedUniversity, selectedFY],
        queryFn: () => {
            let endISO = undefined;
            if (endDate) {
                const adjustedEnd = new Date(endDate);
                adjustedEnd.setHours(23, 59, 59, 999);
                endISO = adjustedEnd.toISOString();
            }
            return api.getAdmissionsBdeStats({
                branch: selectedBranch === 'all' ? undefined : selectedBranch,
                admissionStatus: selectedStatus === 'all' ? undefined : selectedStatus,
                startDate: startDate ? startDate.toISOString() : undefined,
                endDate: endISO,
                universityName: selectedUniversity === 'all' ? undefined : selectedUniversity,
                fy: selectedFY === 'all' ? undefined : selectedFY
            });
        }
    });

    const { data: teamStats, isLoading: teamLoading } = useQuery({
        queryKey: ['revenueTeamStats', selectedBranch, selectedStatus, startDate, endDate, selectedUniversity, selectedFY],
        queryFn: () => {
            let endISO = undefined;
            if (endDate) {
                const adjustedEnd = new Date(endDate);
                adjustedEnd.setHours(23, 59, 59, 999);
                endISO = adjustedEnd.toISOString();
            }
            return api.getAdmissionsTeamStats({
                branch: selectedBranch === 'all' ? undefined : selectedBranch,
                admissionStatus: selectedStatus === 'all' ? undefined : selectedStatus,
                startDate: startDate ? startDate.toISOString() : undefined,
                endDate: endISO,
                universityName: selectedUniversity === 'all' ? undefined : selectedUniversity,
                fy: selectedFY === 'all' ? undefined : selectedFY
            });
        }
    });

    const { data: universityStats, isLoading: universityLoading } = useQuery({
        queryKey: ['revenueUniversityStats', selectedBranch, selectedStatus, startDate, endDate, selectedUniversity, selectedFY],
        queryFn: () => {
            let endISO = undefined;
            if (endDate) {
                const adjustedEnd = new Date(endDate);
                adjustedEnd.setHours(23, 59, 59, 999);
                endISO = adjustedEnd.toISOString();
            }
            return api.getAdmissionsUniversityStats({
                branch: selectedBranch === 'all' ? undefined : selectedBranch,
                admissionStatus: selectedStatus === 'all' ? undefined : selectedStatus,
                startDate: startDate ? startDate.toISOString() : undefined,
                endDate: endISO,
                universityName: selectedUniversity === 'all' ? undefined : selectedUniversity,
                fy: selectedFY === 'all' ? undefined : selectedFY
            });
        }
    });

    const { data: financialStats, isLoading: financialLoading } = useQuery({
        queryKey: ['revenueFinancialStats', selectedBranch, selectedStatus, startDate, endDate, selectedUniversity, selectedFY],
        queryFn: () => {
            let endISO = undefined;
            if (endDate) {
                const adjustedEnd = new Date(endDate);
                adjustedEnd.setHours(23, 59, 59, 999);
                endISO = adjustedEnd.toISOString();
            }
            return api.getAdmissionsFinancialStats({
                branch: selectedBranch === 'all' ? undefined : selectedBranch,
                admissionStatus: selectedStatus === 'all' ? undefined : selectedStatus,
                startDate: startDate ? startDate.toISOString() : undefined,
                endDate: endISO,
                universityName: selectedUniversity === 'all' ? undefined : selectedUniversity,
                fy: selectedFY === 'all' ? undefined : selectedFY
            });
        }
    });

    const [drillDownView, setDrillDownView] = useState<'teams' | 'members' | 'admissions'>('teams');
    const [selectedTeam, setSelectedTeam] = useState<any>(null);
    const [selectedBDE, setSelectedBDE] = useState<any>(null);

    // Query for individual admissions when drilling down to a BDE
    const { data: bdeAdmissions, isLoading: bdeAdmissionsLoading } = useQuery({
        queryKey: ['bdeAdmissions', selectedBDE?.normalizedName, selectedBranch, selectedStatus, startDate, endDate],
        queryFn: () => {
            let endISO = undefined;
            if (endDate) {
                const adjustedEnd = new Date(endDate);
                adjustedEnd.setHours(23, 59, 59, 999);
                endISO = adjustedEnd.toISOString();
            }
            return api.getAdmissions({
                bdeNameNormalized: selectedBDE?.normalizedName,
                branch: selectedBranch === 'all' ? undefined : selectedBranch,
                admissionStatus: selectedStatus === 'all' ? undefined : selectedStatus,
                startDate: startDate ? startDate.toISOString() : undefined,
                endDate: endISO
            });
        },
        enabled: drillDownView === 'admissions' && !!selectedBDE?.normalizedName
    });

    const handleTeamClick = (team: any) => {
        setSelectedTeam(team);
        setDrillDownView('members');
    };

    const handleBDEClick = (bde: any) => {
        setSelectedBDE(bde);
        setDrillDownView('admissions');
    };

    const handleBack = () => {
        if (drillDownView === 'admissions') {
            setDrillDownView('members');
            setSelectedBDE(null);
        } else if (drillDownView === 'members') {
            setDrillDownView('teams');
            setSelectedTeam(null);
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedBranch('all');
        setSelectedStatus('all');
        setSelectedMonth('all');
        setSelectedUniversity('all');
        setSelectedFY('all');
        setStartDate(undefined);
        setEndDate(undefined);
        setDrillDownView('teams');
        setSelectedTeam(null);
        setSelectedBDE(null);
    };

    const handleMonthChange = (month: string) => {
        setSelectedMonth(month);
        if (month === 'all') {
            setStartDate(undefined);
            setEndDate(undefined);
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = months.indexOf(month);

        // Adjust year if it's Jan-Mar and we're looking at a past year's cycle?
        // Let's just use current year for simplicity unless specified.
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);

        setStartDate(firstDay);
        setEndDate(lastDay);
    };

    // Formatting totals for top KPI cards
    const totalAdmissions = statsSum(bdeStats, 'totalAdmissions');
    const totalRevenue = statsSum(bdeStats, 'totalRevenue');
    const totalApproved = statsSum(bdeStats, 'conversionCount');

    function statsSum(array: any[] | undefined, key: string) {
        if (!array) return 0;
        return array.reduce((sum, item) => {
            const val = item[key];
            const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]+/g, '')) : Number(val);
            return sum + (isNaN(num) ? 0 : num);
        }, 0);
    }

    const filteredBdeStats = bdeStats?.filter(bde =>
        bde.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout
            title="Revenue Intelligence"
            subtitle="Real-time enrollment analytics"
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            hideSearch={true}
            searchPlaceholder={
                drillDownView === 'teams' ? "Search teams..." :
                    drillDownView === 'members' ? "Search BDEs in team..." :
                        "Search reg no or name..."
            }
            liveRecords={bdeStats?.map((b: any) => ({ bdeName: b.displayName, inactive: false }))}
            onBdeSelect={(name) => {
                const bde = bdeStats?.find((b: any) => b.displayName === name);
                if (bde) handleBDEClick(bde);
            }}
        >
            <div className="space-y-8 animate-in fade-in duration-500">

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4 bg-background/50 backdrop-blur-md border border-border/50 p-5 rounded-2xl shadow-sm">
                    <div className="relative w-full lg:w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search names..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 bg-background/50 border-border/60 rounded-xl text-sm"
                        />
                        {searchTerm && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border/60 rounded-xl shadow-2xl z-50 max-h-[300px] overflow-y-auto">
                                {bdeStats?.filter(b => b.displayName?.toLowerCase().includes(searchTerm.toLowerCase())).map((bde, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            handleBDEClick(bde);
                                            setSearchTerm('');
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-muted/50 text-sm flex items-center justify-between group transition-colors"
                                    >
                                        <span className="font-medium">{bde.displayName}</span>
                                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 flex-1">
                        <Select value={selectedFY} onValueChange={setSelectedFY}>
                            <SelectTrigger className="w-[120px] h-11 bg-background/50 border-border/60 rounded-xl text-sm">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="FY" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All FYs</SelectItem>
                                {availableFYs.map(fy => (
                                    <SelectItem key={fy} value={fy}>FY {fy}-{parseInt(fy)%100 + 1}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                            <SelectTrigger className="w-[150px] h-11 bg-background/50 border-border/60 rounded-xl text-sm">
                                <Building2 className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Branches</SelectItem>
                                <SelectItem value="HYD">Hyderabad</SelectItem>
                                <SelectItem value="MUM">Mumbai</SelectItem>
                            </SelectContent>
                        </Select>



                        <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                            <SelectTrigger className="w-[180px] h-11 bg-background/50 border-border/60 rounded-xl text-sm">
                                <GraduationCap className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="University" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Universities</SelectItem>
                                {universityStats?.map(uni => (
                                    <SelectItem key={uni._id} value={uni._id}>{uni._id}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-[150px] h-11 bg-background/50 border-border/60 rounded-xl text-sm">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {dbStatuses?.map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-[240px] h-11 justify-start text-left font-normal bg-background/50 border-border/60 rounded-xl text-sm",
                                        !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-3 h-4 w-4" />
                                    {startDate ? (
                                        endDate ? (
                                            <>
                                                {format(startDate, "LLL dd")} - {format(endDate, "LLL dd")}
                                            </>
                                        ) : (
                                            format(startDate, "LLL dd")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={startDate}
                                    selected={{
                                        from: startDate,
                                        to: endDate,
                                    }}
                                    onSelect={(range) => {
                                        setStartDate(range?.from);
                                        setEndDate(range?.to);
                                        setSelectedMonth('all');
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleClearFilters}
                            className="h-11 w-11 border-border/60 hover:bg-muted/50 rounded-xl transition-all hover:rotate-180 duration-500"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* KPI Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Enrollments"
                        value={totalAdmissions.toLocaleString('en-IN')}
                        description="Across all branches"
                        icon={Target}
                        color="text-indigo-500"
                        isLoading={bdeLoading}
                    />
                    <StatCard
                        title="Total Revenue"
                        value={`₹${totalRevenue.toLocaleString('en-IN')}`}
                        description="Gross enrollment value"
                        icon={DollarSign}
                        color="text-emerald-500"
                        isLoading={bdeLoading}
                    />
                    <StatCard
                        title="Approved Forms"
                        value={totalApproved.toLocaleString('en-IN')}
                        description={`${((totalApproved / (totalAdmissions || 1)) * 100).toFixed(1)}% Conversion rate`}
                        icon={Users}
                        color="text-purple-500"
                        isLoading={bdeLoading}
                    />
                    <StatCard
                        title="Active Universities"
                        value={(universityStats?.length || 0).toLocaleString('en-IN')}
                        description="Partner academic institutions"
                        icon={GraduationCap}
                        color="text-pink-500"
                        isLoading={universityLoading}
                    />
                </div>

                {/* Navigation Tabs */}
                <Tabs defaultValue="bde" className="w-full space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-background/50 backdrop-blur-sm border border-border/60 h-12 p-1">
                            <TabsTrigger value="bde" className="px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <Briefcase className="w-4 h-4 mr-2" /> BDE Performance
                            </TabsTrigger>
                            <TabsTrigger value="team" className="px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <Users className="w-4 h-4 mr-2" /> Team View
                            </TabsTrigger>
                            <TabsTrigger value="university" className="px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <Building2 className="w-4 h-4 mr-2" /> University Stats
                            </TabsTrigger>
                            <TabsTrigger value="financial" className="px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <DollarSign className="w-4 h-4 mr-2" /> Financial
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="bde" className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2 bg-background/50 backdrop-blur-xl border-border/50 overflow-hidden">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-semibold flex items-center">
                                        <TrendingUp className="w-5 h-5 mr-2 text-indigo-400" /> BDE Revenue Ranking
                                    </CardTitle>
                                    <CardDescription>Performance comparison by gross revenue</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[450px] p-0">
                                    {bdeLoading ? <Skeleton className="w-full h-full" /> : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={filteredBdeStats?.slice(0, 15)} layout="vertical" margin={{ left: 40, right: 30, top: 20, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="displayName"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    fontSize={12}
                                                    width={100}
                                                    tick={{ fill: 'currentColor', opacity: 0.7 }}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-popover/90 border border-border p-3 rounded-lg shadow-xl backdrop-blur-md">
                                                                    <p className="font-bold text-popover-foreground mb-1">{payload[0].payload.displayName}</p>
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between gap-4">
                                                                            <span className="text-slate-400 text-xs">Revenue</span>
                                                                            <span className="text-emerald-400 font-medium font-mono text-xs">₹{payload[0].value?.toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                        <div className="flex justify-between gap-4">
                                                                            <span className="text-slate-400 text-xs">Admissions</span>
                                                                            <span className="text-white font-medium text-xs">{payload[0].payload.totalAdmissions.toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]} barSize={24}>
                                                    {filteredBdeStats?.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-background/50 backdrop-blur-xl border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Top Performers</CardTitle>
                                    <CardDescription>BDE leaders this period</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {bdeStats?.slice(0, 6).map((bde, idx) => (
                                            <div key={idx} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${idx < 3 ? 'bg-primary/10 text-primary shadow-sm' : 'bg-muted text-muted-foreground/70'}`}>
                                                        #{idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium group-hover:text-primary transition-colors">{bde.displayName}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase">{bde.totalAdmissions.toLocaleString('en-IN')} Enrollments</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-mono font-medium text-emerald-400">₹{bde.totalRevenue.toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="team" className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-6">
                            {/* Navigation Header for Drill-down */}
                            {drillDownView !== 'teams' && (
                                <div className="flex items-center gap-4 mb-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBack}
                                        className="h-8 bg-background/50 border-border hover:bg-primary/10 hover:text-primary"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to {drillDownView === 'admissions' ? 'Team Members' : 'Teams'}
                                    </Button>
                                    <div className="h-4 w-[1px] bg-border" />
                                    <p className="text-sm font-medium text-muted-foreground italic">
                                        Viewing {drillDownView === 'members' ? selectedTeam?.displayName : `${selectedBDE?.name}'s Enrollments`}
                                    </p>
                                </div>
                            )}

                            <AnimatePresence mode="wait">
                                {drillDownView === 'teams' && (
                                    <motion.div
                                        key="teams"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                                    >
                                        {teamLoading ? [1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />) : (
                                            teamStats?.filter((t: any) => t.displayName?.toLowerCase().includes(searchTerm.toLowerCase())).map((team: any, idx: number) => (
                                                <Card
                                                    key={idx}
                                                    className="bg-background/50 backdrop-blur-xl border-border/50 hover:border-primary/40 transition-all hover:translate-y-[-4px] cursor-pointer group rounded-3xl overflow-hidden"
                                                    onClick={() => handleTeamClick(team)}
                                                >
                                                    <CardHeader className="pb-3 px-6 pt-6">
                                                        <div className="flex justify-between items-start">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                                                <Users className="w-5 h-5" />
                                                            </div>
                                                            <Badge variant="outline" className="text-[10px] border-border/60 uppercase tracking-widest text-muted-foreground group-hover:border-primary/20 transition-colors">
                                                                {team.bdeCount.toLocaleString('en-IN')} Members
                                                            </Badge>
                                                        </div>
                                                        <CardTitle className="text-xl mt-4 group-hover:text-primary transition-colors">{team.displayName || 'Unnamed Team'}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="px-6 pb-6 space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Revenue</p>
                                                                <p className="text-lg font-mono font-bold text-emerald-400">₹{team.totalRevenue.toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Enrollments</p>
                                                                <p className="text-lg font-bold">{team.totalAdmissions.toLocaleString('en-IN')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="pt-2">
                                                            <div className="flex justify-between text-[10px] mb-1">
                                                                <span className="text-muted-foreground uppercase tracking-widest font-bold">Efficiency</span>
                                                                <span className="font-bold text-primary">₹{(team.totalRevenue / (team.totalAdmissions || 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })} avg</span>
                                                            </div>
                                                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary/60"
                                                                    style={{ width: `${Math.min(100, (team.totalRevenue / 1000000) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="pt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span>Click to view breakdown</span>
                                                            <ChevronRight className="w-4 h-4 text-primary" />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </motion.div>
                                )}

                                {drillDownView === 'members' && (
                                    <motion.div
                                        key="members"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                    >
                                        {selectedTeam?.members.filter((m: any) => m.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((member: any, idx: number) => (
                                            <Card
                                                key={idx}
                                                className="bg-background/40 backdrop-blur-3xl border-border/50 hover:border-indigo-500/40 transition-all duration-500 cursor-pointer group rounded-3xl overflow-hidden shadow-2xl hover:translate-y-[-4px]"
                                                onClick={() => handleBDEClick(member)}
                                            >
                                                <CardContent className="p-8">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-5">
                                                            <div className="relative">
                                                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                                                                    <Briefcase className="w-8 h-8" />
                                                                </div>
                                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-background shadow-lg shadow-emerald-500/20" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-extrabold text-xl tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{member.name}</h3>
                                                                <div className="flex flex-col gap-1 mt-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{member.admissions} Enrollments</span>
                                                                        <span className="text-muted-foreground text-[10px]">•</span>
                                                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">₹{member.revenue.toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest">Revenue Performer</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                                                            <ChevronRight className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </motion.div>
                                )}

                                {drillDownView === 'admissions' && (
                                    <motion.div
                                        key="admissions"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <Card className="bg-background/40 backdrop-blur-3xl border-border/50 rounded-3xl overflow-hidden shadow-3xl">
                                            <CardHeader className="p-8 border-b border-border/50">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <CardTitle className="text-2xl font-black tracking-tight">{selectedBDE?.name}'s Records</CardTitle>
                                                        <CardDescription className="font-medium">Direct enrollment history for this period</CardDescription>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3">
                                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 h-10 px-6 uppercase tracking-widest text-[10px] font-black">
                                                            {selectedBDE?.admissions} Enrollments
                                                        </Badge>
                                                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 h-10 px-6 uppercase tracking-widest text-[10px] font-black">
                                                            ₹{selectedBDE?.revenue.toLocaleString('en-IN')} Revenue
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-muted/30">
                                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">UID / Reg No</th>
                                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">Candidate Details</th>
                                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">Institution</th>
                                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">Enrollment Date</th>
                                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">Revenue Value</th>
                                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">Source</th>
                                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border/50">
                                                            {bdeAdmissionsLoading ? (
                                                                [1, 2, 3, 4, 5].map(i => (
                                                                    <tr key={i}>
                                                                        <td colSpan={7} className="px-8 py-7"><Skeleton className="h-4 w-full rounded-full" /></td>
                                                                    </tr>
                                                                ))
                                                            ) : bdeAdmissions?.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={7} className="px-8 py-20 text-center">
                                                                        <div className="flex flex-col items-center">
                                                                            <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
                                                                            <p className="text-muted-foreground font-medium text-lg italic">No enrollment history artifacts found.</p>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ) : (
                                                                bdeAdmissions?.filter((adm: any) =>
                                                                    adm.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                                    adm.regNo?.toLowerCase().includes(searchTerm.toLowerCase())
                                                                ).map((adm: any, idx: number) => (
                                                                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-mono text-sm font-bold text-emerald-400 mb-0.5 group-hover:scale-105 transition-transform origin-left">{adm.regNo}</span>
                                                                                <span className="text-[10px] text-muted-foreground uppercase font-bold opacity-60">Permanent ID</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-extrabold text-foreground group-hover:text-primary transition-colors tracking-tight">{adm.candidateName}</span>
                                                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{adm.branch} Branch Unit</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex items-center gap-2">
                                                                                <Building2 className="w-3.5 h-3.5 text-pink-500/60" />
                                                                                <span className="text-sm font-semibold text-muted-foreground">{adm.universityName}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-6">
                                                                            <div className="flex items-center gap-2">
                                                                                <Clock className="w-3.5 h-3.5 text-blue-400/60" />
                                                                                <span className="text-sm font-medium">
                                                                                    {adm.admissionDate ? format(new Date(adm.admissionDate), 'dd MMM, yyyy') : 'Pending'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-6">
                                                                            <span className="font-mono text-sm font-black text-emerald-400">₹{adm.amount?.toLocaleString('en-IN')}</span>
                                                                        </td>
                                                                        <td className="px-8 py-6">
                                                                            <Badge variant="outline" className="bg-indigo-500/5 text-indigo-400 border-indigo-500/10 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
                                                                                {adm.sourceOfAdmission || 'Direct Enrollment'}
                                                                            </Badge>
                                                                        </td>
                                                                        <td className="px-8 py-6">
                                                                            <div className={cn(
                                                                                "inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                                                                adm.admissionStatus === 'Approved' ?
                                                                                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                                                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                                            )}>
                                                                                {adm.admissionStatus === 'Approved' ? (
                                                                                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                                                                ) : (
                                                                                    <CircleDashed className="w-3 h-3 mr-1.5 animate-spin-slow" />
                                                                                )}
                                                                                {adm.admissionStatus}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </TabsContent>

                    <TabsContent value="university" className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="bg-background/50 backdrop-blur-xl border-border/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Building2 className="w-5 h-5 mr-2 text-pink-400" /> Enrollment Distribution
                                    </CardTitle>
                                    <CardDescription>Market share across universities</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    {universityLoading ? <Skeleton className="w-full h-full" /> : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={universityStats}
                                                    innerRadius={80}
                                                    outerRadius={120}
                                                    paddingAngle={5}
                                                    dataKey="totalAdmissions"
                                                    nameKey="_id"
                                                >
                                                    {universityStats?.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-background/50 backdrop-blur-xl border-border/50">
                                <CardHeader>
                                    <CardTitle>Detailed Breakdown</CardTitle>
                                    <CardDescription>University performance data</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-muted-foreground px-4 pb-2 border-b border-border/50">
                                            <div className="col-span-6">University</div>
                                            <div className="col-span-3 text-center">Adm.</div>
                                            <div className="col-span-3 text-right">Revenue</div>
                                        </div>
                                        {universityStats?.map((uni, idx) => (
                                            <div key={idx} className="grid grid-cols-12 items-center px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors">
                                                <div className="col-span-6 flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                    <span className="text-sm font-medium">{uni._id || 'Unknown'}</span>
                                                </div>
                                                <div className="col-span-3 text-center font-bold">{uni.totalAdmissions.toLocaleString('en-IN')}</div>
                                                <div className="col-span-3 text-right font-mono text-xs text-emerald-400">₹{uni.totalRevenue.toLocaleString('en-IN')}</div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="financial" className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="bg-background/50 backdrop-blur-xl border-border/50">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center">
                                                <TrendingUp className="w-5 h-5 mr-2 text-indigo-400" /> Fee Type Distribution
                                            </CardTitle>
                                            <CardDescription>Breakdown by enrollment fee categories</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Donut View</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    {financialLoading ? <Skeleton className="w-full h-full" /> : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={financialStats?.feeType}
                                                    innerRadius={80}
                                                    outerRadius={120}
                                                    paddingAngle={5}
                                                    dataKey="count"
                                                    nameKey="label"
                                                >
                                                    {financialStats?.feeType.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                                                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                                    formatter={(value: any, name: any, props: any) => [
                                                        <span className="font-medium">
                                                            {value.toLocaleString('en-IN')} Enrollments (₹{props.payload.revenue.toLocaleString('en-IN')})
                                                        </span>,
                                                        <span className="text-slate-400">{name}</span>
                                                    ]}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-background/50 backdrop-blur-xl border-border/50">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center">
                                                <DollarSign className="w-5 h-5 mr-2 text-emerald-400" /> Payment Mode Analysis
                                            </CardTitle>
                                            <CardDescription>Most common transaction channels</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Pie View</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    {financialLoading ? <Skeleton className="w-full h-full" /> : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={financialStats?.paymentMode}
                                                    innerRadius={0}
                                                    outerRadius={120}
                                                    paddingAngle={2}
                                                    dataKey="count"
                                                    nameKey="label"
                                                >
                                                    {financialStats?.paymentMode.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                                                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                                    formatter={(value: any, name: any, props: any) => [
                                                        <span className="font-medium">
                                                            {value.toLocaleString('en-IN')} Collections (₹{props.payload.revenue.toLocaleString('en-IN')})
                                                        </span>,
                                                        <span className="text-slate-400">{name}</span>
                                                    ]}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}

function StatCard({ title, value, description, icon: Icon, color, isLoading }: any) {
    if (isLoading) return <Skeleton className="h-32 w-full" />;

    return (
        <Card className="bg-background/50 backdrop-blur-xl border-border/50 hover:border-primary/20 transition-all">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-2xl font-bold font-mono tracking-tight">{value}</h3>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
