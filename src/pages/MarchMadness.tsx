import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api, API_BASE_URL } from '@/lib/api';
import {
    Trophy,
    Users,
    Target,
    Trophy as TrophyIcon,
    Plus,
    Trash2,
    ChevronRight,
    Search,
    CheckCircle2,
    Medal,
    Activity,
    UserPlus
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import {
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContestTrio {
    trioName: string;
    members: {
        name: string;
        admissions: number;
    }[];
    totalAdmissions: number;
    branch: string;
}

interface TrioDefinition {
    trioName: string;
    members: string[];
    branch: string;
}

export default function MarchMadness() {
    const { toast } = useToast();
    const [stats, setStats] = useState<ContestTrio[]>([]);
    const [trios, setTrios] = useState<TrioDefinition[]>([]);
    const [images, setImages] = useState<any[]>([]);
    const [bdeNames, setBdeNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddTrio, setShowAddTrio] = useState(false);

    // New trio form state
    const [newTrioName, setNewTrioName] = useState('');
    const [newTrioBranch, setNewTrioBranch] = useState('HYD');
    const [member1, setMember1] = useState('');
    const [member2, setMember2] = useState('');
    const [member3, setMember3] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [open1, setOpen1] = useState(false);
    const [open2, setOpen2] = useState(false);
    const [open3, setOpen3] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsData, triosData, bdeData, imagesData] = await Promise.all([
                api.getMarchMadnessStats(),
                api.getMarchMadnessTrios(),
                api.getBdeNames(),
                api.getMarchMadnessImages()
            ]);
            setStats(statsData);
            setTrios(triosData);
            setBdeNames(bdeData);
            setImages(imagesData);
        } catch (error) {
            console.error('Failed to fetch March Madness data:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load contest data.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveTrio = async () => {
        if (!member1 || !member2 || !member3) {
            toast({
                variant: 'destructive',
                title: 'Incomplete',
                description: 'Please select all 3 members.',
            });
            return;
        }

        setIsSaving(true);
        try {
            // Automatically generate a name from members if no name is provided
            const autoName = `${member1}, ${member2} & ${member3}`;
            await api.saveMarchMadnessTrio({
                trioName: autoName,
                members: [member1, member2, member3],
                branch: 'Global' // Defaulting to Global since branch selection is removed
            });
            toast({
                title: 'Success',
                description: `Trio has been created.`,
            });
            setShowAddTrio(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Failed to save trio:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to create the contest trio.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTrio = async (trioName: string) => {
        if (!window.confirm(`Delete trio "${trioName}" from the contest?`)) return;

        try {
            await api.deleteMarchMadnessTrio(trioName);
            toast({
                title: 'Trio Deleted',
                description: `Trio ${trioName} removed from contest.`,
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete trio:', error);
        }
    };

    const resetForm = () => {
        setNewTrioName('');
        setMember1('');
        setMember2('');
        setMember3('');
    };

    // Helper to filter bdeNames for each slot
    const getAvailableNames = (currentMember: string) => {
        const selected = [member1, member2, member3].filter(m => m && m !== currentMember);
        return bdeNames.filter(name => !selected.includes(name));
    };

    const MemberSelector = ({
        value,
        onValueChange,
        open,
        setOpen,
        label
    }: {
        value: string,
        onValueChange: (val: string) => void,
        open: boolean,
        setOpen: (open: boolean) => void,
        label: string
    }) => {
        const availableNames = getAvailableNames(value);

        return (
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs whitespace-nowrap">{label}</Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="col-span-3 justify-between bg-muted/20 font-normal"
                        >
                            {value ? value : "Search BDE..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder={`Search ${label}...`} />
                            <CommandList>
                                <CommandEmpty>No BDE found.</CommandEmpty>
                                <CommandGroup>
                                    {availableNames.map((name) => (
                                        <CommandItem
                                            key={name}
                                            value={name}
                                            onSelect={(currentValue) => {
                                                onValueChange(currentValue === value ? "" : currentValue);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === name ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        );
    };

    const topTrio = stats.length > 0 ? stats[0] : null;

    // Helper to get global top performers (highest individual admissions across all trios)
    const topPerformers = useMemo(() => {
        const allMembers = stats.flatMap(t =>
            t.members.map(m => ({ ...m, trioName: t.trioName }))
        );
        return allMembers.sort((a, b) => b.admissions - a.admissions).slice(0, 5);
    }, [stats]);

    const sortedImages = useMemo(() => {
        return [...images].sort((a, b) => {
            const numA = parseInt(a.name?.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.name?.match(/\d+/)?.[0] || '0');
            return numA - numB;
        });
    }, [images]);

    return (
        <DashboardLayout
            title="Kaante Ki Takkar"
            subtitle="Trio Contest - Most Admissions Wins!"
            hideSearch={true}
        >
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Madness Image Gallery (Replacing Leaderboard) */}
                <div className="space-y-8">
                    {images.length > 0 ? (
                        <div className="flex flex-col gap-8 w-full">
                            {sortedImages.map((img, i) => (
                                <motion.div
                                    key={img.driveFileId || i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{
                                        scale: 1.015,
                                        filter: "brightness(1.05)",
                                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                                    }}
                                    className="group relative w-full h-[600px] rounded-2xl overflow-hidden glass-card border border-border/50 shadow-xl cursor-default bg-muted/10 transition-all duration-300"
                                >
                                    <img
                                        src={`${API_BASE_URL}/api/march-madness/images/${img._id}/raw`}
                                        alt={img.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Removing metadata overlay as requested */}
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[400px] glass-card border-none flex flex-col items-center justify-center text-muted-foreground italic">
                            <Activity className="w-12 h-12 opacity-10 mb-4" />
                            <p>{isLoading ? "loading..." : "No contest images found."}</p>
                            {!isLoading && <p className="text-xs">Upload images from the Manage Teams page.</p>}
                        </div>
                    )}
                </div>

            </div>

            {/* Add Trio Dialog */}
            <Dialog open={showAddTrio} onOpenChange={setShowAddTrio}>
                <DialogContent className="glass-card border-primary/20 sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create Contest Trio</DialogTitle>
                        <DialogDescription>
                            Assign three BDEs as a group for the March Madness contest.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="space-y-6">
                            <p className="text-xs font-black uppercase tracking-widest text-primary text-center">Select Trio Members</p>

                            <MemberSelector
                                label="Member 1"
                                value={member1}
                                onValueChange={setMember1}
                                open={open1}
                                setOpen={setOpen1}
                            />

                            <MemberSelector
                                label="Member 2"
                                value={member2}
                                onValueChange={setMember2}
                                open={open2}
                                setOpen={setOpen2}
                            />

                            <MemberSelector
                                label="Member 3"
                                value={member3}
                                onValueChange={setMember3}
                                open={open3}
                                setOpen={setOpen3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="ghost" onClick={() => setShowAddTrio(false)}>Cancel</Button>
                        <Button onClick={handleSaveTrio} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                            {isSaving ? 'Creating...' : 'Create Trio'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
