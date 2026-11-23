
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Database,
    Calendar,
    Mail,
    IndianRupee,
    GraduationCap,
    Tag,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function RecordDetailPage() {
    const { collection, id } = useParams();
    const navigate = useNavigate();
    const [record, setRecord] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecord = async () => {
            if (!id || !collection) return;
            try {
                setIsLoading(true);
                const data = await api.getRecordDetail(id, collection);
                setRecord(data);
            } catch (error: any) {
                console.error('Failed to fetch record:', error);
                toast.error('Could not find record details');
                navigate('/details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecord();
    }, [id, collection, navigate]);

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'active':
            case 'admission approved':
                return <CheckCircle2 className="w-5 h-5 text-success" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Record Details" subtitle="Loading...">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-[400px] w-full rounded-2xl" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Record Details"
            subtitle={`Detailed view of record ${id}`}
        >
            <div className="max-w-4xl mx-auto space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="group hover:bg-white/5"
                >
                    <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to List
                </Button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card overflow-hidden"
                >
                    {/* Header Strip */}
                    <div className="h-2 bg-primary w-full" />

                    <div className="p-8 space-y-8">
                        {/* Main Title Section */}
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium uppercase tracking-wider">
                                    <Database className="w-4 h-4" />
                                    Record ID: {record.recordId}
                                </div>
                                <h1 className="text-3xl font-bold text-white break-all">
                                    {record.name}
                                </h1>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="w-4 h-4" />
                                    <span>{record.name}</span>
                                </div>
                            </div>

                            <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-3">
                                {getStatusIcon(record.status)}
                                <span className="font-bold text-primary capitalize">{record.status}</span>
                            </div>
                        </div>

                        {/* Grid Content */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-6 border-t border-white/5">
                            <DetailItem
                                icon={<IndianRupee className="text-success" />}
                                label="Revenue Amount"
                                value={`₹${record.target?.toLocaleString()}`}
                                subtext="Calculated Target"
                            />
                            <DetailItem
                                icon={<Calendar className="text-blue-400" />}
                                label="Update Date"
                                value={new Date(record.date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                                subtext="Last Modified"
                            />
                            <DetailItem
                                icon={<GraduationCap className="text-purple-400" />}
                                label="University"
                                value={record.university || 'Not Specified'}
                            />
                            <DetailItem
                                icon={<Tag className="text-indigo-400" />}
                                label="Fee Structure"
                                value={record.feeType || 'General'}
                                subtext="Payment Category"
                            />
                            <DetailItem
                                icon={<Clock className="text-orange-400" />}
                                label="Batch Period"
                                value={record.monthYear || 'N/A'}
                                subtext="Academic Cycle"
                            />
                            <DetailItem
                                icon={<Database className="text-gray-400" />}
                                label="Data Source"
                                value={record.source || 'Firebase'}
                                subtext="System Log"
                            />
                        </div>

                        {/* Footer Info */}
                        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between text-xs text-muted-foreground gap-4">
                            <div>System Entry Created: {new Date(record.createdAt || record.date).toLocaleString()}</div>
                            <div>Last Sync Update: {new Date(record.updatedAt || record.date).toLocaleString()}</div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}

function DetailItem({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext?: string }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-tight">
                {icon}
                {label}
            </div>
            <div className="space-y-1">
                <div className="text-xl font-bold text-white">{value}</div>
                {subtext && <div className="text-xs text-muted-foreground/60">{subtext}</div>}
            </div>
        </div>
    );
}
