import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { SalesRecord, User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getTeamData } from '@/data/dataProcess';

export default function MyTeam() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [allRecords, setAllRecords] = useState<SalesRecord[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const [records, usersData] = await Promise.all([
                    api.getMasterData(),
                    api.getUsers(),
                ]);
                setAllRecords(records);
                setUsers(usersData);
            } catch (error) {
                console.error("Failed to fetch team data:", error);
            }
            setIsLoading(false);
        };

        fetchData();
    }, [user]);

    const teamDataForBDEView = useMemo(() => getTeamData(allRecords), [allRecords]);
    const activeTeamDataForBDEView = useMemo(() => {
        const inactiveLeaders = new Set(users.filter(u => u.inactive).map(u => u.name));
        return teamDataForBDEView.filter(t => !inactiveLeaders.has(t.teamLeader));
    }, [teamDataForBDEView, users]);

    const userTeams = useMemo(() => {
        const performerRoles = ['Business Development Executive', 'Business Development Manager (BDM)', 'Senior Business Development Manager (Sr. BDM)'];
        if (!user || !performerRoles.includes(user.role)) return [];
        return activeTeamDataForBDEView.filter(team =>
            team.records.some(r => {
                const bdeName = r.bdeName?.toLowerCase();
                const userName = user.name?.toLowerCase();
                // Check for exact match or if the record name is a substring of the user name (e.g. "Pranali" vs "Pranali D")
                // And ensure the record marks them as a current team member
                return (bdeName === userName || (userName && userName.includes(bdeName))) && r.isCurrentTeamMember;
            })
        );
    }, [activeTeamDataForBDEView, user]);

    const userTeamLeader = useMemo(() => {
        if (!user || !user.name) return undefined;
        return allRecords.find(r => r.bdeName?.toLowerCase() === user.name?.toLowerCase() && r.isCurrentTeamMember)?.teamLeader;
    }, [allRecords, user]);

    const bdeTeamData = useMemo(() => {
        // If the user is a Team Leader or ATL, prioritize showing the team they lead
        if (user?.role === 'Team Leader' || user?.role === 'Proposed Team Leader (PTL)') {
            const assignedAtlNames = new Set((user.assignedAtls || []).map(name => name.toLowerCase()));

            const ledTeam = activeTeamDataForBDEView.filter(team => {
                const teamTlLower = team.teamLeader?.toLowerCase();
                const teamAtlLower = team.atl?.toLowerCase();
                const userNameLower = user.name?.toLowerCase();

                // 1. Direct team (records where they are the TL)
                if (teamTlLower === userNameLower) return true;

                // 2. Team led by someone who is an assigned ATL
                if (teamTlLower && assignedAtlNames.has(teamTlLower)) return true;

                // 3. Team where they appear as the designated ATL
                if (teamAtlLower && assignedAtlNames.has(teamAtlLower)) return true;

                // 4. Team where the ATL themselves is the performer
                if (team.records.some(r => r.bdeName?.toLowerCase() && assignedAtlNames.has(r.bdeName.toLowerCase()))) return true;

                return false;
            });
            if (ledTeam.length > 0) return ledTeam;
        }

        if (user?.role === 'Assistant Team Leader (ATL)' || user?.role === 'Proposed Assistant Team Leader (PATL)') {
            const ledTeam = activeTeamDataForBDEView.filter(team =>
                team.atl?.toLowerCase() === user.name?.toLowerCase()
            );
            if (ledTeam.length > 0) return ledTeam;
        }

        // Otherwise (or if they lead no one), show the team they are a member of
        if (userTeams.length > 0) return userTeams;
        if (userTeamLeader) return activeTeamDataForBDEView.filter(team =>
            team.teamLeader?.toLowerCase() === userTeamLeader?.toLowerCase()
        );

        return [];
    }, [userTeams, userTeamLeader, activeTeamDataForBDEView, user]);

    if (isLoading) {
        return (
            <DashboardLayout title="My Team" subtitle="Loading your team members...">
                <div className="p-6">
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="My Team"
            subtitle="View your current team members and leaders"
        >
            <div className="p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card overflow-hidden"
                >
                    <div className="p-6 border-b border-border">
                        <h3 className="text-lg font-semibold text-foreground">Current Team Members</h3>
                    </div>
                    <div className="overflow-x-auto">
                        {activeTeamDataForBDEView.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">
                                <p>No sales data available.</p>
                            </div>
                        ) : bdeTeamData.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">
                                <p>You may not have a team assigned yet.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Team Member Name</th>
                                        <th>Designation</th>
                                        <th>Team Leader</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bdeTeamData.flatMap((team) => {
                                        const currentMembers = team.records
                                            .filter(r => !r.inactive && r.isCurrentTeamMember)
                                            .map(r => r.bdeName)
                                            .filter((name, idx, arr) => arr.indexOf(name) === idx);

                                        return currentMembers.map(name => {
                                            const memberUser = users.find(u => u.name === name);
                                            return {
                                                name,
                                                designation: memberUser?.role || 'Business Development Executive',
                                                teamLeader: team.teamLeader
                                            };
                                        });
                                    })
                                        .sort((a, b) => {
                                            const getWeight = (role: string) => {
                                                if (role.includes('Assistant Team Leader') || role.includes('(PATL)')) return 2;
                                                if (role.includes('Team Leader') || role.includes('(PTL)')) return 1;
                                                return 3;
                                            };
                                            const weightA = getWeight(a.designation);
                                            const weightB = getWeight(b.designation);

                                            if (weightA !== weightB) return weightA - weightB;
                                            return a.name.localeCompare(b.name);
                                        })
                                        .map((member, index) => (
                                            <motion.tr
                                                key={`${member.name}-${member.teamLeader}`}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 * index }}
                                            >
                                                <td>
                                                    <span className="font-medium text-foreground">{member.name}</span>
                                                </td>
                                                <td>
                                                    <span className="text-sm text-muted-foreground">{member.designation}</span>
                                                </td>
                                                <td>
                                                    <span className="text-sm text-muted-foreground">{member.teamLeader}</span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
