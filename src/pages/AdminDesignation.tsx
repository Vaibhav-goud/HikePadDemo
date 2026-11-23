import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { Trash2 } from 'lucide-react';

export default function AdminDesignation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [originalUser, setOriginalUser] = useState<User | null>(null);

  const handleBdeSelect = (bdeName: string) => {
    toast({
      title: 'Info',
      description: `Cannot view BDE performance from this page. Go to the dashboard to see charts for ${bdeName}.`,
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await api.getUsers();
      setUsers(usersData.filter((u: User) => u.name && u.name !== 'Unassigned'));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load user data.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (origUser: User, updates: Partial<User>) => {
    setIsUpdating(true);
    try {
      // Update user in database
      await api.updateUser(origUser.name!, origUser.branch || '', updates);

      toast({
        title: 'Success',
        description: `${origUser.name}'s information has been updated.`,
      });
      setEditingUser(null);
      setOriginalUser(null);
      fetchUsers(); // Re-fetch all users to ensure UI is in sync
    } catch (error) {
      console.error('Failed to update user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user information.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This will remove them as a user, but their sales metrics will be preserved for branch totals.`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await api.deleteUser(user.name!, user.branch || '');
      toast({
        title: 'User Deleted',
        description: `${user.name} has been removed successfully.`,
      });
      setEditingUser(null);
      setOriginalUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Vice President':
        return 'destructive';
      case 'Deputy Branch Manager':
        return 'default';
      case 'Team Leader':
        return 'secondary';
      case 'Business Development Executive':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Edit Users"
        subtitle="Loading user data..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={users.map(u => ({ bdeName: u.name, inactive: u.inactive }))}
        onBdeSelect={handleBdeSelect}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Edit Users"
      subtitle="View and update user information"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      liveRecords={users.map(u => ({ bdeName: u.name || '', inactive: u.inactive }))}
      onBdeSelect={handleBdeSelect}
    >

      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
          >
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">User Management</h3>
            </div>

            <div className="divide-y divide-border">
              {users.map((u) => (
                <motion.div
                  key={u._id || `${u.name}-${u.branch}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-foreground">{u.name || 'Unnamed'}</p>
                      <p className="text-sm text-muted-foreground">{u.branch || 'No Branch'}</p>
                      {u.email && <p className="text-sm text-muted-foreground">{u.email}</p>}
                      {user?.role === 'Admin' && (
                        <p className="text-sm text-muted-foreground">
                          Password: <span className="font-mono">{u.password || 'Set'}</span>
                        </p>
                      )}
                    </div>
                    <Badge variant={getRoleBadgeVariant(u.role)}>
                      {u.role}
                    </Badge>
                    {u.inactive && (
                      <Badge variant="secondary">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingUser({ ...u });
                        setOriginalUser(u);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(u)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {editingUser && originalUser && (
        <Dialog open={!!editingUser} onOpenChange={() => {
          setEditingUser(null);
          setOriginalUser(null);
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Edit {editingUser.name}'s information.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Operations Leader">Operations Leader</SelectItem>
                    <SelectItem value="Vice President">Vice President</SelectItem>
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branch" className="text-right">Branch</Label>
                <Select
                  value={editingUser.branch}
                  onValueChange={(value) => setEditingUser({ ...editingUser, branch: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hyderabad Branch">Hyderabad Branch</SelectItem>
                    <SelectItem value="Mumbai Branch">Mumbai Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <Select
                  value={editingUser.inactive ? 'inactive' : 'active'}
                  onValueChange={(value) => setEditingUser({ ...editingUser, inactive: value === 'inactive' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {user?.role === 'Admin' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">Password</Label>
                  <div className="col-span-3 relative">
                    <Input
                      id="password"
                      type={showEditPassword ? 'text' : 'password'}
                      value={editingUser.password || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="pr-10"
                      placeholder="Enter new password to change"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showEditPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88L4.62 4.62" /><path d="M1 1l22 22" /><path d="M9.09 9.09a3 3 0 0 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><path d="M17.39 17.39a13.12 13.12 0 0 1-5.39 1.61c-7 0-10-7-10-7a13.87 13.87 0 0 1 1.61-2.61" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between items-center sm:justify-between">
              {user?.role === 'Admin' && (
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteUser(originalUser!)}
                  disabled={isUpdating}
                  className="order-first"
                >
                  Delete User
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setEditingUser(null);
                  setOriginalUser(null);
                }}>Cancel</Button>
                <Button
                  onClick={() => handleEditUser(originalUser, {
                    name: editingUser.name,
                    email: editingUser.email,
                    role: editingUser.role,
                    branch: editingUser.branch,
                    inactive: editingUser.inactive,
                    ...(user?.role === 'Admin' && editingUser.password && { password: editingUser.password })
                  })}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
