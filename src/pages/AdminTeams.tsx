import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { SalesRecord, User } from '@/types';
import { MONTHS } from '@/data/dataProcess';
import {
  Users,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  ArrowRightLeft,
  UserPlus,
  Calendar,
  UserCog,
  Mail,
  RefreshCcw,
  Trash2
} from 'lucide-react';
import { Image } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';

interface TeamMember {
  bdeName: string;
  inactive: boolean;
  isCurrentTeamMember: boolean;
  role: string;
}

interface Team {
  leader: string;
  users: TeamMember[];
  inactive: boolean;
}

interface TeamTree {
  [teamName: string]: Team;
}

interface BranchTeamData {
  [branchName: string]: TeamTree;
}

export default function AdminTeams() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [reassigningBDE, setReassigningBDE] = useState<{ bdeName: string, fromTeam: string, branch: string } | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showNonCurrentMembers, setShowNonCurrentMembers] = useState(false);
  const [creatingDrive, setCreatingDrive] = useState(false);
  const [isCreatingDrive, setIsCreatingDrive] = useState(false);
  const [namingTeam, setNamingTeam] = useState<{ teamLeader: string, currentName: string } | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserBranch, setNewUserBranch] = useState('');
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [mappingTl, setMappingTl] = useState<User | null>(null);
  const [selectedAtlsForMapping, setSelectedAtlsForMapping] = useState<string[]>([]);
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  // New Joinee States
  const [isNewJoinee, setIsNewJoinee] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');

  // Bulk Email State
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailMessage, setBulkEmailMessage] = useState('');
  const [singleRecipientMode, setSingleRecipientMode] = useState(false);
  const [singleRecipientEmail, setSingleRecipientEmail] = useState('');
  const [showNormalizeDialog, setShowNormalizeDialog] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [oldNameForNormalize, setOldNameForNormalize] = useState('');
  const [newNameForNormalize, setNewNameForNormalize] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<FileList | null>(null);


  const handleCreateDrive = async (name: string, startMonth: string, startYear: number, endMonth: string, endYear: number) => {
    setIsCreatingDrive(true);
    try {
      await api.createDrive(name, startMonth, startYear, endMonth, endYear);
      toast({
        title: 'Success',
        description: `Drive "${name}" has been created successfully.`,
      });
      setCreatingDrive(false);
    } catch (error) {
      console.error('Failed to create drive:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Could not create the drive. Please try again.',
      });
    } finally {
      setIsCreatingDrive(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleBdeSelect = (bdeName: string) => {
    toast({
      title: 'Info',
      description: `Cannot view BDE performance from this page. Go to the dashboard to see charts for ${bdeName}.`,
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesData, usersData] = await Promise.all([
          api.getMasterData(),
          api.getUsers(),
        ]);

        setSalesRecords(salesData);
        setUsers(usersData);

        if (salesData.length > 0) {
          const branches = Array.from(new Set(salesData.map(r => r.branch)));
          setSelectedBranch(branches[0] || '');
        }
      } catch (error) {
        console.error("Failed to fetch initial data", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load necessary data. Please refresh the page.',
        });
      }
    };

    fetchData();

    // Refetch data when window gains focus (user navigates back to this page)
    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const teamData = useMemo<BranchTeamData>(() => {
    const data: BranchTeamData = {};
    salesRecords.forEach(record => {
      if (!showInactive && record.inactive) {
        return;
      }
      if (!data[record.branch]) {
        data[record.branch] = {};
      }
      const teamKey = record.teamName || record.teamLeader;
      if (!data[record.branch][teamKey]) {
        const leaderUser = users.find(u => u.name === record.teamLeader && u.branch === record.branch);
        data[record.branch][teamKey] = {
          leader: record.teamLeader,
          users: [],
          inactive: leaderUser ? leaderUser.inactive : false
        };
      }
      // Add member if not already present for this team and they are current team member (or if showing non-current members)
      if (!data[record.branch][teamKey].users.some(m => m.bdeName === record.bdeName) && (record.isCurrentTeamMember || showNonCurrentMembers)) {
        data[record.branch][teamKey].users.push({
          bdeName: record.bdeName,
          inactive: record.inactive,
          isCurrentTeamMember: record.isCurrentTeamMember,
          role: record.role
        });
      }
    });
    return data;
  }, [salesRecords, users, showInactive, showNonCurrentMembers]);

  const branches = useMemo(() => Object.keys(teamData), [teamData]);
  const teamTree = useMemo(() => {
    if (selectedBranch && teamData[selectedBranch]) {
      return teamData[selectedBranch];
    }
    return {};
  }, [teamData, selectedBranch]);

  const toggleTeam = (teamName: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) {
      newExpanded.delete(teamName);
    } else {
      newExpanded.add(teamName);
    }
    setExpandedTeams(newExpanded);
  };

  const handleReassign = async (bdeName: string, fromTeam: string, toTeam: string, month: string, branch: string) => {
    try {
      const targetTeamDetails = teamTree[toTeam];
      const resolvedLeader = targetTeamDetails?.leader || toTeam;
      const resolvedTeamName = targetTeamDetails?.leader ? toTeam : undefined;

      await api.updateBdeTeam(bdeName, resolvedLeader, month, branch);
      setSalesRecords(prevRecords => {
        return prevRecords.map(record => {
          if (record.bdeName === bdeName && record.month === month && record.branch === branch) {
            return {
              ...record,
              teamLeader: resolvedLeader,
              teamName: resolvedTeamName || record.teamName
            };
          }
          return record;
        });
      });
      toast({
        title: 'Success',
        description: `${bdeName}'s team has been changed to ${toTeam} for ${month}.`,
      });
      setReassigningBDE(null);
    } catch (error) {
      console.error('Failed to change team:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the BDE\'s team. Please try again.',
      });
    }
  };

  const handleToggleInactive = async (bdeName: string, inactive: boolean, branch: string) => {
    try {
      await api.updateUserStatus(bdeName, branch, inactive);
      setSalesRecords(prevRecords => {
        return prevRecords.map(record => {
          if (record.bdeName === bdeName && record.branch === branch) {
            return { ...record, inactive };
          }
          return record;
        });
      });
      setUsers(prevUsers =>
        prevUsers.map(u =>
          (u.name === bdeName && u.branch === branch) ? { ...u, inactive } : u
        )
      );
      toast({
        title: 'Success',
        description: `${bdeName} has been marked as ${inactive ? 'inactive' : 'active'}.`,
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the user\'s status. Please try again.',
      });
    }
  };

  const handleToggleCurrentTeamMember = async (bdeName: string, isCurrentTeamMember: boolean, branch: string, teamName?: string) => {
    try {
      // Update the specific team - backend handles atomic update of other teams
      await api.updateUserStatus(bdeName, branch, undefined, isCurrentTeamMember, teamName);

      // Refetch data to ensure consistency
      const [salesData, usersData] = await Promise.all([
        api.getMasterData(),
        api.getUsers(),
      ]);
      setSalesRecords(salesData);
      setUsers(usersData);

      toast({
        title: 'Success',
        description: `${bdeName} has been ${isCurrentTeamMember ? 'added to' : 'removed from'} the current team.`,
      });

      // Notify other components (like Dashboard) to refresh their data
      window.dispatchEvent(new CustomEvent('teamMembershipChanged'));
    } catch (error) {
      console.error('Failed to update team membership:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the team membership. Please try again.',
      });
    }
  };

  const handleToggleTeamLeaderInactive = async (teamLeaderName: string, inactive: boolean, branch: string) => {
    try {
      await api.updateUserStatus(teamLeaderName, branch, inactive);

      setUsers(prevUsers =>
        prevUsers.map(u =>
          (u.name === teamLeaderName && u.branch === branch) ? { ...u, inactive } : u
        )
      );

      toast({
        title: 'Success',
        description: `Team leader ${teamLeaderName} has been marked as ${inactive ? 'inactive' : 'active'}.`,
      });
    } catch (error) {
      console.error('Failed to update team leader status:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the team leader\'s status. Please try again.',
      });
    }
  };

  const handleUpdateTeamName = async (teamLeader: string, newTeamName: string) => {
    try {
      await api.updateTeamName(teamLeader, newTeamName, selectedBranch);
      setSalesRecords(prevRecords => {
        return prevRecords.map(record => {
          if (record.teamLeader === teamLeader && record.branch === selectedBranch) {
            return { ...record, teamName: newTeamName };
          }
          return record;
        });
      });
      toast({
        title: 'Success',
        description: `Team name updated to "${newTeamName}".`,
      });
      setNamingTeam(null);
      setNewTeamName('');
    } catch (error) {
      console.error('Failed to update team name:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the team name. Please try again.',
      });
    }
  };

  const handleCreateUser = async (name: string, email: string, password: string, role: string, branch: string) => {
    if (isNewJoinee && !selectedTeam) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a team to map the new joinee.',
      });
      return;
    }

    console.log('[handleCreateUser] Sending request:', { name, email, role, branch, isNewJoinee, selectedTeam });
    setIsCreatingUser(true);
    try {
      await api.createUser(name, email, password, role, branch, true, isNewJoinee, selectedTeam);
      toast({
        title: 'Success',
        description: `User "${name}" has been created successfully.`,
      });
      setCreatingUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('');
      setNewUserBranch('');
      setIsNewJoinee(false);
      setSelectedTeam('');

      // Refresh user list if necessary (though Manage Teams is driven by sales records)
      const [salesData, usersData] = await Promise.all([
        api.getMasterData(),
        api.getUsers(),
      ]);
      setSalesRecords(salesData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to create user:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Could not create the user. Please try again.',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (bdeName: string, branch: string) => {
    if (!window.confirm(`Are you sure you want to delete ${bdeName}? This will remove them as a user, but their sales metrics will be preserved for branch totals.`)) {
      return;
    }

    try {
      await api.deleteUser(bdeName, branch);
      toast({
        title: 'User Deleted',
        description: `${bdeName} has been removed successfully.`,
      });
      // Refresh data
      const [salesData, usersData] = await Promise.all([
        api.getMasterData(),
        api.getUsers(),
      ]);
      setSalesRecords(salesData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user.',
      });
    }
  };

  const handleSendBulkEmail = async () => {
    if (!bulkEmailSubject || !bulkEmailMessage) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Subject and message are required.',
      });
      return;
    }

    if (singleRecipientMode && !singleRecipientEmail) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a recipient email address.',
      });
      return;
    }

    setIsSendingBulkEmail(true);
    try {
      const updateName = singleRecipientMode ? null : `Update: ${bulkEmailSubject}`;

      if (singleRecipientMode) {
        // Send to single recipient - call backend directly
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/admin/send-single-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            email: singleRecipientEmail,
            subject: bulkEmailSubject,
            message: bulkEmailMessage
          })
        });

        if (!response.ok) throw new Error('Failed to send email');

        toast({
          title: 'Email Sent',
          description: `Email sent successfully to ${singleRecipientEmail}`,
        });
      } else {
        // Send bulk email
        const result = await api.sendBulkEmail(bulkEmailSubject, bulkEmailMessage, updateName);

        toast({
          title: 'Emails Sent',
          description: `Successfully sent emails to ${result.sent} users.`,
        });
      }

      setSendingBulkEmail(false);
      setBulkEmailSubject('');
      setBulkEmailMessage('');
      setSingleRecipientMode(false);
      setSingleRecipientEmail('');
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast({
        variant: 'destructive',
        title: 'Email Sending Failed',
        description: error.message || 'An error occurred while sending emails.',
      });
    } finally {
      setIsSendingBulkEmail(false);
    }
  };

  const handleNormalizeName = async () => {
    if (!oldNameForNormalize || !newNameForNormalize) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Both names are required.',
      });
      return;
    }

    setIsNormalizing(true);
    try {
      await api.normalizeName(oldNameForNormalize, newNameForNormalize);
      toast({
        title: 'Success',
        description: `Name normalized successfully.`,
      });
      setShowNormalizeDialog(false);
      setOldNameForNormalize('');
      setNewNameForNormalize('');

      // Refresh data
      const [salesData, usersData] = await Promise.all([
        api.getMasterData(),
        api.getUsers(),
      ]);
      setSalesRecords(salesData);
      setUsers(usersData);
    } catch (error: any) {
      console.error('Normalization failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to normalize name.',
      });
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleUploadImages = async () => {
    if (!selectedImages || selectedImages.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select images to upload.',
      });
      return;
    }

    setIsUploadingImages(true);
    try {
      const filesArray = Array.from(selectedImages);
      await api.uploadCompetitionImages(filesArray);
      toast({
        title: 'Success',
        description: `${filesArray.length} competition images uploaded and replaced successfully.`,
      });
      setShowImageUpload(false);
      setSelectedImages(null);
    } catch (error: any) {
      console.error('Image upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Failed to upload competition images.',
      });
    } finally {
      setIsUploadingImages(false);
    }
  };


  if (salesRecords.length === 0) {
    return (
      <DashboardLayout
        title="Manage Teams"
        subtitle="No sales data found"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={salesRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
        onBdeSelect={handleBdeSelect}
      >
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-semibold mb-2">No Data to Manage</h2>
          <p className="text-muted-foreground mb-4">
            Upload sales records to begin managing your teams.
          </p>
          <a href="/admin/upload" className="text-blue-500 hover:underline">
            Go to Upload Page
          </a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Manage Teams"
      subtitle="View and reassign BDEs across teams"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      liveRecords={salesRecords.map(r => ({ bdeName: r.bdeName, inactive: r.inactive }))}
      onBdeSelect={handleBdeSelect}
    >

      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 p-4 glass-card border-border/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Column: Branch & Filter Toggles */}
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-full md:w-64">
                  <label htmlFor="branch-select" className="block text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5 ml-1">
                    Select Branch
                  </label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger id="branch-select" className="w-full bg-background/50 border-border/50">
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-10 w-px bg-border/50 hidden md:block" />

                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="show-inactive"
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    />
                    <Label htmlFor="show-inactive" className="text-sm font-medium cursor-pointer text-foreground/80 hover:text-foreground transition-colors">
                      Show Inactive
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="show-non-current"
                      checked={showNonCurrentMembers}
                      onCheckedChange={setShowNonCurrentMembers}
                    />
                    <Label htmlFor="show-non-current" className="text-sm font-medium cursor-pointer text-foreground/80 hover:text-foreground transition-colors">
                      Show Non-Current Members
                    </Label>
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              {user?.role === 'Admin' && (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    onClick={() => setShowNormalizeDialog(true)}
                    variant="outline"
                    className="border-border/50 hover:bg-muted/50 transition-all text-orange-500 hover:text-orange-600"
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Normalize Name
                  </Button>
                  <Button
                    onClick={() => setShowMappingDialog(true)}
                    variant="outline"
                    className="border-border/50 hover:bg-muted/50 transition-all"
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2 text-primary" />
                    Leadership Mapping
                  </Button>
                  <Button onClick={() => setCreatingUser(true)} variant="outline" className="border-border/50 hover:bg-muted/50 transition-all">
                    <UserPlus className="w-4 h-4 mr-2 text-primary" />
                    Create User
                  </Button>
                  <Button onClick={() => setCreatingDrive(true)} variant="outline" className="border-border/50 hover:bg-muted/50 transition-all">
                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                    Drive Range
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/admin/users'}
                    variant="outline"
                    className="border-border/50 hover:bg-muted/50 transition-all"
                  >
                    <UserCog className="w-4 h-4 mr-2 text-primary" />
                    Edit Users
                  </Button>
                  <Button
                    onClick={() => setSendingBulkEmail(true)}
                    variant="default"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all group"
                  >
                    <Mail className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    Send Bulk Update Mail
                  </Button>
                  <Button
                    onClick={() => setShowImageUpload(true)}
                    variant="default"
                    className="bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Upload Competition Images
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/admin/user-images'}
                    variant="default"
                    className="bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-600/20 transition-all"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    User Images
                  </Button>
                </div>
              )}
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
          >
            <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold text-foreground tracking-tight">
                  Team Structure: <span className="text-primary">{selectedBranch}</span>
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {Object.keys(teamTree).length} Teams Found
              </p>
            </div>

            <div className="divide-y divide-border">
              {Object.entries(teamTree).map(([teamName, teamDetails]: [string, Team]) => {
                const isExpanded = expandedTeams.has(teamName);
                return (
                  <div key={teamName}>
                    <button
                      onClick={() => toggleTeam(teamName)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}><ChevronRight className="w-5 h-5" /></motion.div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setNamingTeam({ teamLeader: teamDetails.leader, currentName: teamName });
                          setNewTeamName(teamName);
                        }}
                        className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        {teamName}
                      </span>
                      <p className="text-sm text-muted-foreground">{teamDetails.users.length} BDEs</p>
                      <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={!teamDetails.inactive}
                          onCheckedChange={(checked) => handleToggleTeamLeaderInactive(teamDetails.leader, !checked, selectedBranch)}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-16 pr-4 pb-4 space-y-2">
                            {/* Renamed variable to "bde" to avoid confusion with "User" interface, added defensive checks */}
                            {teamDetails.users && Array.isArray(teamDetails.users) && teamDetails.users.length > 0 ? (
                              teamDetails.users.map((bde) => (
                                <div
                                  key={bde.bdeName}
                                  className={`flex items-center gap-3 p-3 rounded-lg ${bde.isCurrentTeamMember
                                    ? 'bg-muted/30'
                                    : 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800'
                                    }`}
                                >
                                  <UserIcon className={`w-4 h-4 ${bde.isCurrentTeamMember ? 'text-secondary-foreground' : 'text-orange-600'}`} />
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${bde.isCurrentTeamMember ? 'text-foreground' : 'text-orange-700 dark:text-orange-300'}`}>
                                      {bde.bdeName}
                                      {!bde.isCurrentTeamMember && <span className="ml-2 text-xs">(Former)</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{bde.role}</p>
                                  </div>
                                  <div className="ml-auto flex items-center gap-2">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Active</span>
                                      <Switch
                                        checked={!bde.inactive}
                                        onCheckedChange={(checked) => handleToggleInactive(bde.bdeName, !checked, selectedBranch)}
                                      />
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs text-muted-foreground">Current</span>
                                      <Switch
                                        checked={bde.isCurrentTeamMember}
                                        onCheckedChange={(checked) => handleToggleCurrentTeamMember(bde.bdeName, checked, selectedBranch, teamName)}
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setReassigningBDE({ bdeName: bde.bdeName, fromTeam: teamName, branch: selectedBranch })}
                                      className="group"
                                    >
                                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteUser(bde.bdeName, selectedBranch)}
                                      className="group text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground italic px-3 py-2">No BDEs in this team.</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div >

      <AnimatePresence>
        {showNormalizeDialog && (
          <Dialog open={showNormalizeDialog} onOpenChange={setShowNormalizeDialog}>
            <DialogContent className="glass-card border-primary/20 sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Normalize Performer Name</DialogTitle>
                <DialogDescription>
                  Globally replace an old name with a corrected name across all records.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="old-name">Old Name (exactly as in records)</Label>
                  <Input
                    id="old-name"
                    value={oldNameForNormalize}
                    onChange={(e) => setOldNameForNormalize(e.target.value)}
                    placeholder="e.g. John Doe (Incorrect)"
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-name">Corrected Name</Label>
                  <Input
                    id="new-name"
                    value={newNameForNormalize}
                    onChange={(e) => setNewNameForNormalize(e.target.value)}
                    placeholder="e.g. John Doe (Correct)"
                    className="bg-background/50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowNormalizeDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleNormalizeName}
                  disabled={isNormalizing || !oldNameForNormalize || !newNameForNormalize}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isNormalizing ? 'Normalizing...' : 'Normalize Global Records'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Competition Image Upload Dialog */}
        <Dialog open={showImageUpload} onOpenChange={setShowImageUpload}>
          <DialogContent className="glass-card border-primary/20 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Competition Images</DialogTitle>
              <DialogDescription>
                Upload images for the "Kaante Ki Takkar" page. These will replace all existing competition images.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="image-files">Select Images (e.g. "Face off 1.png")</Label>
                <Input
                  id="image-files"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setSelectedImages(e.target.files)}
                  className="bg-background/50 cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Note: Numerical sorting works best if names include "Face off 1", "Face off 2", etc.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowImageUpload(false)}>Cancel</Button>
              <Button
                onClick={handleUploadImages}
                disabled={isUploadingImages || !selectedImages || selectedImages.length === 0}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isUploadingImages ? 'Uploading...' : 'Upload & Replace All'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {reassigningBDE && (
          <ReassignmentModal
            bde={reassigningBDE}
            onClose={() => setReassigningBDE(null)}
            onConfirm={handleReassign}
            teamTree={teamTree}
            salesRecords={salesRecords}
          />
        )}
        {creatingDrive && (
          <DriveRangeModal
            onClose={() => setCreatingDrive(false)}
            onConfirm={handleCreateDrive}
            isLoading={isCreatingDrive}
          />
        )}
        {namingTeam && (
          <TeamNameModal
            teamLeader={namingTeam.teamLeader}
            currentName={namingTeam.currentName}
            newName={newTeamName}
            onNameChange={setNewTeamName}
            onClose={() => {
              setNamingTeam(null);
              setNewTeamName('');
            }}
            onConfirm={handleUpdateTeamName}
          />
        )}
        {creatingUser && (
          <CreateUserModal
            onClose={() => setCreatingUser(false)}
            onConfirm={handleCreateUser}
            isLoading={isCreatingUser}
            name={newUserName}
            setName={setNewUserName}
            email={newUserEmail}
            setEmail={setNewUserEmail}
            password={newUserPassword}
            setPassword={setNewUserPassword}
            role={newUserRole}
            setRole={setNewUserRole}
            branch={newUserBranch}
            setBranch={setNewUserBranch}
            isNewJoinee={isNewJoinee}
            setIsNewJoinee={setIsNewJoinee}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            teamTree={teamTree}
          />
        )}
        {sendingBulkEmail && (
          <Dialog open={sendingBulkEmail} onOpenChange={setSendingBulkEmail}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Send Email</DialogTitle>
                <DialogDescription>
                  {singleRecipientMode
                    ? 'Send an email to a specific person.'
                    : 'Send an email to all active users. This will also update the "Latest Update" highlight on the dashboard.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="single-recipient"
                    checked={singleRecipientMode}
                    onCheckedChange={setSingleRecipientMode}
                  />
                  <Label htmlFor="single-recipient">Send to single recipient</Label>
                </div>

                {singleRecipientMode && (
                  <div className="grid gap-2">
                    <Label htmlFor="recipient-email">Recipient Email</Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      placeholder="user@example.com"
                      value={singleRecipientEmail}
                      onChange={(e) => setSingleRecipientEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., New Dashboard Features"
                    value={bulkEmailSubject}
                    onChange={(e) => setBulkEmailSubject(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message Body</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your message here..."
                    className="min-h-[150px]"
                    value={bulkEmailMessage}
                    onChange={(e) => setBulkEmailMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    HTML tags are supported for formatting. A link to the dashboard will be automatically appended.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSendingBulkEmail(false)}>Cancel</Button>
                <Button onClick={handleSendBulkEmail} disabled={isSendingBulkEmail}>
                  {isSendingBulkEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {showNormalizeDialog && (
          <Dialog open={showNormalizeDialog} onOpenChange={setShowNormalizeDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Normalize Name</DialogTitle>
                <DialogDescription>
                  This will replace the target name across ALL database records. This action is powerful and irreversible.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="old-name">Original Name (Incorrect)</Label>
                  <Input
                    id="old-name"
                    placeholder="e.g. AbbasTL"
                    value={oldNameForNormalize}
                    onChange={(e) => setOldNameForNormalize(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-name">New Name (Correct)</Label>
                  <Input
                    id="new-name"
                    placeholder="e.g. Abbas"
                    value={newNameForNormalize}
                    onChange={(e) => setNewNameForNormalize(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNormalizeDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleNormalizeName}
                  disabled={isNormalizing}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isNormalizing ? 'Processing...' : 'Update All Records'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leadership Mapping</DialogTitle>
            <DialogDescription>
              Pair Team Leaders with multiple Assistant Team Leaders to control data visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <Label>Step 1: Select Team Leader</Label>
              <Select
                value={mappingTl?.name || ''}
                onValueChange={(val) => {
                  const tl = users.find(u => u.name === val);
                  setMappingTl(tl || null);
                  setSelectedAtlsForMapping(tl?.assignedAtls || []);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a Team Leader" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => u.role === 'Team Leader' || u.role === 'Proposed Team Leader (PTL)')
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(tl => (
                      <SelectItem key={tl.name} value={tl.name || ''}>
                        {tl.name} ({tl.branch})
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {mappingTl && (
              <div className="space-y-4">
                <Label>Step 2: Assign Assistant Team Leaders to {mappingTl.name}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto p-2 border rounded-md">
                  {(() => {
                    const filteredAtls = users
                      .filter(u => (u.role === 'Assistant Team Leader (ATL)' || u.role === 'Proposed Assistant Team Leader (PATL)') && u.branch === mappingTl.branch)
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                    if (filteredAtls.length === 0) {
                      return (
                        <div className="col-span-full py-8 text-center bg-muted/20 rounded-lg border border-dashed border-border">
                          <p className="text-sm text-muted-foreground">No ATLs found in {mappingTl.branch}.</p>
                          <p className="text-[10px] mt-1 text-muted-foreground/60">Make sure you have created user accounts with the 'ATL' role for this branch.</p>
                        </div>
                      );
                    }

                    return filteredAtls.map(atl => (
                      <div key={atl.name} className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border/50">
                        <Switch
                          id={`atl-${atl.name}`}
                          checked={selectedAtlsForMapping.includes(atl.name || '')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAtlsForMapping([...selectedAtlsForMapping, atl.name || '']);
                            } else {
                              setSelectedAtlsForMapping(selectedAtlsForMapping.filter(name => name !== atl.name));
                            }
                          }}
                        />
                        <Label htmlFor={`atl-${atl.name}`} className="cursor-pointer flex flex-col flex-1">
                          <span className="font-medium text-sm">{atl.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{atl.branch}</span>
                        </Label>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMappingDialog(false)}>Cancel</Button>
            <Button
              disabled={!mappingTl || isSavingMapping}
              onClick={async () => {
                if (!mappingTl) return;
                setIsSavingMapping(true);
                try {
                  await api.updateAssignedAtls(mappingTl.name!, mappingTl.branch!, selectedAtlsForMapping);
                  toast({
                    title: 'Success',
                    description: `Mapping updated for ${mappingTl.name}`,
                  });
                  // Update local state
                  setUsers(users.map(u =>
                    u.name === mappingTl.name && u.branch === mappingTl.branch
                      ? { ...u, assignedAtls: selectedAtlsForMapping }
                      : u
                  ));
                  setShowMappingDialog(false);
                } catch (error) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to save mapping.',
                  });
                } finally {
                  setIsSavingMapping(false);
                }
              }}
            >
              {isSavingMapping ? 'Saving...' : 'Save Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function ReassignmentModal({ bde, onClose, onConfirm, teamTree, salesRecords }: {
  bde: { bdeName: string, fromTeam: string, branch: string } | null,
  onClose: () => void,
  onConfirm: (bdeName: string, fromTeam: string, toTeam: string, month: string, branch: string) => void,
  teamTree: TeamTree,
  salesRecords: SalesRecord[]
}) {
  const [newTeam, setNewTeam] = useState('');
  const [month, setMonth] = useState('');
  if (!bde) return null;

  const availableTeams = Object.keys(teamTree).filter(t => t !== bde.fromTeam);
  const availableMonths = Array.from(new Set(salesRecords.filter(r => r.bdeName === bde.bdeName && r.branch === bde.branch).map(r => r.month)));

  return (
    <Dialog open={!!bde} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign BDE</DialogTitle>
          <DialogDescription>
            Reassign {bde.bdeName} from {bde.fromTeam} to a new team for a specific month.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-team" className="text-right">New Team</Label>
            <Select value={newTeam} onValueChange={setNewTeam}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select new team" /></SelectTrigger>
              <SelectContent>
                {availableTeams.map(teamName => (
                  <SelectItem key={teamName} value={teamName}>{teamName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="month" className="text-right">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select month" /></SelectTrigger>
              <SelectContent>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(bde.bdeName, bde.fromTeam, newTeam, month, bde.branch)} disabled={!newTeam || !month}>
            Confirm Reassignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DriveRangeModal({ onClose, onConfirm, isLoading }: {

  onClose: () => void,

  onConfirm: (name: string, startMonth: string, startYear: number, endMonth: string, endYear: number) => void,

  isLoading: boolean

}) {

  const [name, setName] = useState('');

  const [startMonth, setStartMonth] = useState('');

  const [startYear, setStartYear] = useState<number | null>(null);

  const [endMonth, setEndMonth] = useState('');

  const [endYear, setEndYear] = useState<number | null>(null);



  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);



  return (

    <Dialog open onOpenChange={onClose}>

      <DialogContent className="sm:max-w-[500px]">

        <DialogHeader>

          <DialogTitle>Create Drive Range</DialogTitle>

          <DialogDescription>

            Create a new drive with date boundaries for filtering dashboard data. This will create the drive for all branches.

          </DialogDescription>

        </DialogHeader>

        <div className="grid gap-4 py-4">

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="drive-name" className="text-right">Name</Label>

            <Input

              id="drive-name"

              value={name}

              onChange={(e) => setName(e.target.value)}

              placeholder="e.g., Q3 Drive"

              className="col-span-3"

            />

          </div>

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="start-month" className="text-right">Start Month</Label>

            <Select value={startMonth} onValueChange={setStartMonth}>

              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select start month" /></SelectTrigger>

              <SelectContent>

                {MONTHS.map(m => (

                  <SelectItem key={m} value={m}>{m}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="start-year" className="text-right">Start Year</Label>

            <Select onValueChange={(value) => setStartYear(parseInt(value))}>

              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select start year" /></SelectTrigger>

              <SelectContent>

                {years.map(y => (

                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="end-month" className="text-right">End Month</Label>

            <Select value={endMonth} onValueChange={setEndMonth}>

              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select end month" /></SelectTrigger>

              <SelectContent>

                {MONTHS.map(m => (

                  <SelectItem key={m} value={m}>{m}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

          <div className="grid grid-cols-4 items-center gap-4">

            <Label htmlFor="end-year" className="text-right">End Year</Label>

            <Select onValueChange={(value) => setEndYear(parseInt(value))}>

              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select end year" /></SelectTrigger>

              <SelectContent>

                {years.map(y => (

                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

        </div>

        <DialogFooter>

          <Button variant="outline" onClick={onClose}>Cancel</Button>

          <Button onClick={() => onConfirm(name, startMonth, startYear as number, endMonth, endYear as number)} disabled={!name || !startMonth || !startYear || !endMonth || !endYear || isLoading}>

            {isLoading ? 'Creating...' : 'Create Drive'}

          </Button>

        </DialogFooter>

      </DialogContent>

      </Dialog>
    );
  }


function TeamNameModal({ teamLeader, currentName, newName, onNameChange, onClose, onConfirm }: {
  teamLeader: string,
  currentName: string,
  newName: string,
  onNameChange: (name: string) => void,
  onClose: () => void,
  onConfirm: (teamLeader: string, newName: string) => void
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Name Team</DialogTitle>
          <DialogDescription>
            Enter a new name for the team led by {teamLeader}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="team-name" className="text-right">Team Name</Label>
            <Input
              id="team-name"
              value={newName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter team name"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(teamLeader, newName)} disabled={!newName.trim()}>
            Update Team Name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateUserModal({ onClose, onConfirm, isLoading, name, setName, email, setEmail, password, setPassword, role, setRole, branch, setBranch, isNewJoinee, setIsNewJoinee, selectedTeam, setSelectedTeam, teamTree }: {
  onClose: () => void,
  onConfirm: (name: string, email: string, password: string, role: string, branch: string) => void,
  isLoading: boolean,
  name: string,
  setName: (name: string) => void,
  email: string,
  setEmail: (email: string) => void,
  password: string,
  setPassword: (password: string) => void,
  role: string,
  setRole: (role: string) => void,
  branch: string,
  setBranch: (branch: string) => void,
  isNewJoinee: boolean,
  setIsNewJoinee: (val: boolean) => void,
  selectedTeam: string,
  setSelectedTeam: (val: string) => void,
  teamTree: TeamTree
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Create a new user account with the specified details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-name" className="text-right">Name</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter user name"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-email" className="text-right">Email ID</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-password" className="text-right">Password</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-role" className="text-right">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Vice President">Vice President</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="Operations Executive">Operations Executive</SelectItem>
                <SelectItem value="Operations Leader">Operations Leader</SelectItem>
                <SelectItem value="Deputy Branch Manager">Deputy Branch Manager</SelectItem>
                <SelectItem value="Team Leader">Team Leader</SelectItem>
                <SelectItem value="Proposed Team Leader (PTL)">Proposed Team Leader (PTL)</SelectItem>
                <SelectItem value="Assistant Team Leader (ATL)">Assistant Team Leader (ATL)</SelectItem>
                <SelectItem value="Proposed Assistant Team Leader (PATL)">Proposed Assistant Team Leader (PATL)</SelectItem>
                <SelectItem value="Senior Business Development Manager (Sr. BDM)">Senior Business Development Manager (Sr. BDM)</SelectItem>
                <SelectItem value="Business Development Manager (BDM)">Business Development Manager (BDM)</SelectItem>
                <SelectItem value="Business Development Executive">Business Development Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role !== 'Vice President' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-branch" className="text-right">Branch</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hyderabad Branch">Hyderabad Branch</SelectItem>
                  <SelectItem value="Mumbai Branch">Mumbai Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {role === 'Vice President' && (
            <div className="text-sm text-muted-foreground italic">
              Vice President has access to all branches
            </div>
          )}

          <div className="h-px bg-border/50 my-2" />

          <div className="flex items-center space-x-2 p-1">
            <Switch
              id="new-joinee"
              checked={isNewJoinee}
              onCheckedChange={setIsNewJoinee}
            />
            <Label htmlFor="new-joinee" className="cursor-pointer">New Joinee</Label>
          </div>

          {isNewJoinee && (
            <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in duration-200">
              <Label htmlFor="map-team" className="text-right">Assign Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger id="map-team" className="col-span-3">
                  <SelectValue placeholder="Select team to map" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(teamTree).length > 0 ? (
                    Object.keys(teamTree).map(teamName => (
                      <SelectItem key={teamName} value={teamName}>
                        {teamName}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground italic text-center">
                      No teams found for the selected branch.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(name, email, password, role, role === 'Vice President' ? 'All' : branch)}
            disabled={!name || !email || !password || !role || (role !== 'Vice President' && !branch) || (isNewJoinee && !selectedTeam) || isLoading}>
            {isLoading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
