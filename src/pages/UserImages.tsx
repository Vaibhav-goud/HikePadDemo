import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api, API_BASE_URL } from '@/lib/api';
import { User } from '@/types';
import { Upload, Trash2, Search, Image, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function UserImages() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  });

  const { data: userImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['userImages'],
    queryFn: () => api.getUserImages(),
  });

  // Active users for the dropdown
  const activeUsers = useMemo(() => {
    return users
      .filter((u: User) => !u.inactive && u.name)
      .map((u: User) => u.name!)
      .filter((name, index, self) => self.indexOf(name) === index)
      .sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return activeUsers.slice(0, 10);
    return activeUsers.filter(name =>
      name.toLowerCase().includes(userSearch.toLowerCase())
    ).slice(0, 10);
  }, [activeUsers, userSearch]);

  // Filter gallery images
  const filteredImages = useMemo(() => {
    if (!gallerySearch) return userImages;
    return userImages.filter((img: any) =>
      img.name?.toLowerCase().includes(gallerySearch.toLowerCase())
    );
  }, [userImages, gallerySearch]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      setSelectedFiles(fileList);
      
      // For preview, just show the first one if there are multiple
      setPreviewUrl(URL.createObjectURL(fileList[0]));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Files Selected',
        description: 'Please select one or more image files.',
      });
      return;
    }

    // If only one file, we might use the selected name
    // But backend is now set up to use filenames for everything in the batch
    // For simplicity and alignment with user request, we'll suggest using filenames
    // and letting them edit in the gallery after.

    setUploading(true);
    try {
      await api.uploadUserImages(selectedFiles, selectedUserName);
      toast({
        title: 'Upload Successful',
        description: `${selectedFiles.length} profile image(s) processed.`,
      });
      setSelectedFiles([]);
      setSelectedUserName('');
      setUserSearch('');
      setPreviewUrl(null);
      // Reset file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Refresh images list
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not upload the images.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete profile image for "${name}"?`)) return;

    try {
      await api.deleteUserImage(id);
      toast({
        title: 'Image Deleted',
        description: `Profile image for "${name}" has been removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Could not delete the image.',
      });
    }
  };

  const handleUpdateName = async (id: string) => {
    if (!editName.trim()) return;

    try {
      await api.updateUserImageName(id, editName.trim());
      toast({
        title: 'Name Updated',
        description: `Image name updated to "${editName.trim()}".`,
      });
      setEditingId(null);
      setEditName('');
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update the name.',
      });
    }
  };

  return (
    <DashboardLayout
      title="User Images"
      subtitle="Upload and manage user profile images for the Wrapped page"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      liveRecords={[]}
      onBdeSelect={() => {}}
    >
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/admin/teams'}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Manage Teams
          </Button>

          {/* Upload Section */}
          <Card className="p-6 glass-card border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <h3 className="text-lg font-semibold">Upload User Image</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* User Selection */}
              <div className="space-y-2 relative">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Select User (Leave empty for bulk upload)
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={selectedUserName || userSearch}
                      disabled={selectedFiles.length > 1}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setSelectedUserName('');
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="pl-10"
                    />
                  </div>
                  {showDropdown && !selectedUserName && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredUsers.length > 0 ? filteredUsers.map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            setSelectedUserName(name);
                            setUserSearch('');
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors text-sm border-b border-border/30 last:border-b-0"
                        >
                          {name}
                        </button>
                      )) : (
                        <div className="px-4 py-3 text-sm text-muted-foreground">No users found</div>
                      )}
                    </div>
                  )}
                  {selectedFiles.length > 1 && (
                    <p className="text-[10px] text-amber-500 font-medium">Multiple files selected: names will be taken from filenames.</p>
                  )}
                </div>

                {/* File Selection */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Choose Images
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="flex items-center gap-3 mt-2">
                      {previewUrl && (
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-border flex-shrink-0">
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-xs font-medium text-muted-foreground">
                        {selectedFiles.length} file(s) selected
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex items-end">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || selectedFiles.length === 0}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : `Upload ${selectedFiles.length > 1 ? 'Batch' : 'Image'}`}
                  </Button>
                </div>
            </div>
          </Card>

          {/* Gallery Section */}
          <Card className="p-6 glass-card border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h3 className="text-lg font-semibold">
                  Uploaded Images
                  <span className="ml-2 text-sm text-muted-foreground font-normal">({userImages.length} total)</span>
                </h3>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by name..."
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {imagesLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading images...</div>
            ) : filteredImages.length === 0 ? (
              <div className="text-center py-12">
                <Image className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  {userImages.length === 0 ? 'No images uploaded yet. Upload your first image above.' : 'No images match your search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredImages.map((img: any) => (
                  <div
                    key={img._id}
                    className="group relative bg-muted/20 rounded-2xl overflow-hidden border border-border/30 hover:border-primary/30 transition-all"
                  >
                    {/* Image */}
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={`${API_BASE_URL}/api/user-images/${img._id}/raw`}
                        alt={img.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>

                    {/* Name & Actions */}
                    <div className="p-3">
                      {editingId === img._id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleUpdateName(img._id)}
                          >
                            <Check className="w-3 h-3 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => { setEditingId(null); setEditName(''); }}
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium truncate flex-1">{img.name}</p>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => { setEditingId(img._id); setEditName(img.name); }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(img._id, img.name)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
