import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Users,
    GraduationCap,
    ChevronRight,
    Search,
    ArrowLeft,
    Calendar,
    Building2,
    Briefcase,
    Filter,
    User as UserIcon,
    ArrowUpRight,
    MapPin,
    Clock,
    CheckCircle2,
    CircleDashed,
    FileText
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ViewState = 'teams' | 'members' | 'details';

export default function Enrolled() {
    const { user } = useAuth();
    const [view, setView] = useState<ViewState>('teams');
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [selectedBDE, setSelectedBDE] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Roles check
    const isPerformer = user?.role === 'Business Development Executive' ||
        user?.role === 'Business Development Manager (BDM)' ||
        user?.role === 'Senior Business Development Manager (Sr. BDM)';

    // Set initial view and BDE
    useEffect(() => {
        if (isPerformer) {
            setView('details');
            setSelectedBDE(user?.name || null);
        }
    }, [isPerformer, user?.name]);

    // Queries
    const { data: salesRecords, isLoading: masterLoading } = useQuery({
        queryKey: ['masterData'],
        queryFn: () => api.getMasterData(),
        enabled: !isPerformer
    });

    const { data: allAdmissions, isLoading: allAdmissionsLoading } = useQuery({
        queryKey: ['admissions_all'],
        queryFn: () => api.getAdmissions({}),
        enabled: !isPerformer
    });

    const { data: performerAdmissions, isLoading: performerLoading } = useQuery({
        queryKey: ['admissions', user?.name],
        queryFn: () => api.getAdmissions({ bdeName: user?.name || undefined }),
        enabled: isPerformer && !!user?.name
    });

    const admissionsLoading = isPerformer ? performerLoading : allAdmissionsLoading;
    const rawAdmissions = isPerformer ? performerAdmissions : allAdmissions;

    // The display list of admissions for the Details view
    const admissions = useMemo(() => {
        if (!rawAdmissions) return [];
        if (isPerformer) return rawAdmissions;
        if (selectedBDE) {
            return rawAdmissions.filter(a => a.bdeName === selectedBDE || a.candidateName?.toLowerCase() === selectedBDE.toLowerCase());
        }
        return [];
    }, [rawAdmissions, selectedBDE, isPerformer]);

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.getUsers(),
        enabled: !isPerformer
    });

    // Process Team Hierarchy exactly as in AdminTeams
    const teamTree = useMemo(() => {
        const tree: Record<string, { members: Set<string>, leader: string, branch: string }> = {};

        if (salesRecords) {
            salesRecords.forEach(record => {
                if (record.inactive) {
                    return;
                }

                const teamKey = record.teamName || record.teamLeader;
                if (!teamKey) return; // Skip if no team leader/name

                if (!tree[teamKey]) {
                    const leaderUser = users?.find(u => u.name === record.teamLeader && u.branch === record.branch);
                    // Skip inactive team leaders
                    if (leaderUser && leaderUser.inactive) return;

                    tree[teamKey] = {
                        members: new Set(),
                        leader: record.teamLeader,
                        branch: record.branch || 'Unknown'
                    };
                }

                // Add member if active and current team member
                if (record.isCurrentTeamMember) {
                    if (record.bdeName) {
                        tree[teamKey].members.add(record.bdeName);
                    }
                }
            });
        }

        // Remove teams with no members or inactive leader handled above
        Object.keys(tree).forEach(t => {
            if (tree[t].members.size === 0) {
                delete tree[t];
            }
        });

        return tree;
    }, [salesRecords, users]);

    const teams = useMemo(() => Object.keys(teamTree).sort(), [teamTree]);

    const filteredTeams = teams.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    // Maps BDE name to their enrolled count
    const bdeAdmissionsCount = useMemo(() => {
        if (!rawAdmissions) return {};
        return rawAdmissions.reduce((acc, adm) => {
            const bde = adm.bdeName || 'Unknown';
            acc[bde] = (acc[bde] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [rawAdmissions]);

    // Calculate total admissions per team by combining the mapped BDE counts
    const teamAdmissionsCount = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.entries(teamTree).forEach(([teamName, teamData]) => {
            let total = 0;
            teamData.members.forEach(bdeName => {
                total += (bdeAdmissionsCount[bdeName] || 0);
            });
            counts[teamName] = total;
        });
        return counts;
    }, [teamTree, bdeAdmissionsCount]);

    const currentTeamMembers = useMemo(() => {
        if (!selectedTeam || !teamTree[selectedTeam]) return [];
        return Array.from(teamTree[selectedTeam].members).sort();
    }, [selectedTeam, teamTree]);

    const filteredMembers = currentTeamMembers.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleTeamClick = (teamName: string) => {
        setSelectedTeam(teamName);
        setView('members');
        setSearchTerm('');
    };

    const handleMemberClick = (bdeName: string) => {
        setSelectedBDE(bdeName);
        setView('details');
        setSearchTerm('');
    };

    const handleBack = () => {
        if (view === 'details' && !isPerformer) {
            setView('members');
            setSelectedBDE(null);
        } else if (view === 'members') {
            setView('teams');
            setSelectedTeam(null);
        }
    };

    return (
        <DashboardLayout
            title={view === 'teams' ? 'Enrolled Candidates' :
                view === 'members' ? selectedTeam || "" :
                    selectedBDE || user?.name || ""}
            subtitle={view === 'teams' ? 'Select a team to analyze admissions' :
                view === 'members' ? `Viewing members of ${selectedTeam}` :
                    `Individual enrollment track for candidates`}
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            hideSearch={true}
            searchPlaceholder={view === 'teams' ? "Search all teams..." : view === 'members' ? "Search BDEs..." : "Search reg no or name..."}
            liveRecords={users?.map(u => ({ bdeName: u.name, inactive: u.inactive }))}
            onBdeSelect={(name) => handleMemberClick(name)}
        >
            <div className="space-y-8 animate-in fade-in duration-500">
                {view !== 'teams' && !isPerformer && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBack}
                        className="rounded-xl bg-background/50 border-white/10 hover:bg-primary/10 hover:text-primary transition-all shadow-lg flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                )}

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    {view === 'teams' && (
                        <motion.div
                            key="teams"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30, transition: { duration: 0.2 } }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            {masterLoading || usersLoading ? (
                                [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="h-44 bg-white/5 rounded-3xl animate-pulse border border-white/5" />
                                ))
                            ) : filteredTeams.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                        <Search className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-bold">No teams found</h3>
                                    <p className="text-muted-foreground mt-2">Try adjusting your search query</p>
                                </div>
                            ) : (
                                filteredTeams.map((teamName) => (
                                    <Card
                                        key={teamName}
                                        className="relative bg-background/40 backdrop-blur-2xl border-white/10 hover:border-primary/40 transition-all duration-500 cursor-pointer group overflow-hidden rounded-3xl shadow-xl hover:shadow-primary/5 hover:translate-y-[-4px]"
                                        onClick={() => handleTeamClick(teamName)}
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowUpRight className="w-5 h-5 text-primary" />
                                        </div>
                                        <CardContent className="p-8">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                                    <Users className="w-7 h-7" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{teamTree[teamName].branch}</span>
                                                    </div>
                                                    <h3 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                                                        {teamName}
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <div className="flex -space-x-2">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                                                            <UserIcon className="w-3 h-3 text-muted-foreground" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                                    {teamAdmissionsCount[teamName] || 0} Enrolled
                                                </Badge>
                                                <Badge variant="outline" className="bg-white/5 border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                                                    {teamTree[teamName].members.size} Members
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </motion.div>
                    )}

                    {view === 'members' && (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {filteredMembers.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-20">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                        <Search className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-bold">No members found</h3>
                                    <p className="text-muted-foreground mt-2">Try adjusting your search query or select another team.</p>
                                </div>
                            ) : filteredMembers.map((memberName) => (
                                <Card
                                    key={memberName}
                                    className="bg-background/40 backdrop-blur-3xl border-white/10 hover:border-indigo-500/40 transition-all duration-500 cursor-pointer group rounded-3xl overflow-hidden shadow-2xl hover:translate-y-[-4px]"
                                    onClick={() => handleMemberClick(memberName)}
                                >
                                    <CardContent className="p-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                                                        <UserIcon className="w-8 h-8" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-background" />
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-xl tracking-tight group-hover:text-indigo-400 transition-colors uppercase">{memberName}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                            Team Performance Track
                                                        </span>
                                                        <span className="text-muted-foreground text-xs mx-1">•</span>
                                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                                            {bdeAdmissionsCount[memberName] || 0} Enrolled
                                                        </span>
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

                    {view === 'details' && (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Summary Cards for the BDE */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-background/50 border-white/10 rounded-3xl">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Enrolled</p>
                                            <h4 className="text-2xl font-black">{admissions?.length || 0}</h4>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-background/50 border-white/10 rounded-3xl">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</p>
                                            <h4 className="text-2xl font-black">
                                                {admissions?.[0]?.admissionDate ? format(new Date(admissions[0].admissionDate), 'MMM yyyy') : 'N/A'}
                                            </h4>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-background/50 border-white/10 rounded-3xl">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                            <CircleDashed className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Average Processing</p>
                                            <h4 className="text-2xl font-black">Active</h4>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="bg-background/40 backdrop-blur-3xl border-white/10 rounded-3xl overflow-hidden shadow-3xl">
                                <CardHeader className="p-8 border-b border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xl font-black tracking-tight">Admission Ledger</CardTitle>
                                            <CardDescription>Comprehensive list of all candidates enrolled by this BDE</CardDescription>
                                        </div>
                                        <Badge className="bg-primary/10 text-primary border-primary/20 pointer-events-none uppercase tracking-widest text-[10px] px-4 py-1">
                                            {admissions?.length || 0} Records Found
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5">
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">UID / Reg No</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">Candidate Details</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">Institution</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">Enrollment Date</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">Program Track</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">Source</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {admissionsLoading ? (
                                                    [1, 2, 3, 4, 5, 6].map(i => (
                                                        <tr key={i}>
                                                            <td colSpan={7} className="px-8 py-6"><Skeleton className="h-8 w-full rounded-lg" /></td>
                                                        </tr>
                                                    ))
                                                ) : admissions?.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="px-8 py-20 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
                                                                <p className="text-muted-foreground font-medium text-lg">No enrollment history artifacts found.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    admissions?.filter(adm =>
                                                        adm.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                        adm.regNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                        adm.universityName?.toLowerCase().includes(searchTerm.toLowerCase())
                                                    ).map((adm: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                                                            <td className="px-8 py-6">
                                                                <div className="flex flex-col">
                                                                    <span className="font-mono text-sm font-bold text-emerald-400 mb-0.5 group-hover:scale-105 transition-transform origin-left">{adm.regNo}</span>
                                                                    <span className="text-[10px] text-muted-foreground uppercase opacity-60">Permanent ID</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex flex-col">
                                                                    <span className="font-extrabold text-foreground group-hover:text-primary transition-colors">{adm.candidateName}</span>
                                                                    <span className="text-xs text-muted-foreground">Premium Prospect</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-2">
                                                                    <Building2 className="w-3.5 h-3.5 text-pink-500/60" />
                                                                    <span className="text-sm font-medium text-muted-foreground">{adm.universityName}</span>
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
                                                            <td className="px-8 py-6 max-w-[240px]">
                                                                <div className="text-xs font-semibold text-muted-foreground line-clamp-2 leading-relaxed" title={adm.programName}>
                                                                    {adm.programName}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <Badge variant="outline" className="bg-indigo-500/5 text-indigo-400 border-indigo-500/10 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5">
                                                                    {adm.sourceOfAdmission || 'Portal Admission'}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className={cn(
                                                                    "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
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
        </DashboardLayout>
    );
}
