
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Database,
    Search,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    Eye,
    ArrowRight,
    LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { toast } from 'sonner';

interface DetailRecord {
    recordId: string;
    name: string;
    date: string;
    target: number;
    status: string;
    university?: string;
    feeType?: string;
}

export default function DetailsListPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<DetailRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // Collections
    const [availableCollections, setAvailableCollections] = useState<string[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string>('all');
    const [currentCollection, setCurrentCollection] = useState<string>('');

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const limit = 20;

    const fetchMonths = async () => {
        try {
            const { collections } = await api.getDetailMonths();
            setAvailableCollections(collections);
            if (collections.length > 0 && selectedCollection === '') {
                setSelectedCollection('all');
            }
        } catch (error) {
            console.error('Failed to fetch months:', error);
        }
    };

    const fetchDetails = async () => {
        try {
            setIsLoading(true);
            const response = await api.getDetails({
                page,
                limit,
                status: statusFilter === 'all' ? undefined : statusFilter,
                collection: selectedCollection === 'all' ? undefined : selectedCollection
            });

            setData(response.data);
            setTotal(response.total);
            setTotalPages(response.totalPages);
            setCurrentCollection(response.currentCollection);
        } catch (error: any) {
            console.error('Failed to fetch details:', error);
            toast.error(error.message || 'Failed to load details');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMonths();
    }, []);

    useEffect(() => {
        fetchDetails();
    }, [page, statusFilter, selectedCollection]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchDetails();
    };

    const filteredData = data.filter(item =>
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.recordId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.university || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'active':
            case 'admission approved':
                return <CheckCircle2 className="w-4 h-4 text-success" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <DashboardLayout
            title="Performance Records"
            subtitle="Detailed record management and inspection"
            searchQuery={searchQuery}
            onSearchChange={(val) => {
                setSearchQuery(val);
                setPage(1);
            }}
            searchPlaceholder="Search by name, ID or university..."
            liveRecords={data.map(r => ({ bdeName: r.name, inactive: false }))}
        >
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/details')}
                    className="group hover:bg-white/5"
                >
                    <PieChartIcon className="mr-2 h-4 w-4" />
                    Detailed Stats
                </Button>


                {/* Filters Bar */}
                <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Range:</span>
                        <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                            <SelectTrigger className="w-48">
                                <Calendar className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Overall</SelectItem>
                                {availableCollections.map(col => (
                                    <SelectItem key={col} value={col}>
                                        {col.replace('_hyd', '').replace('_', ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>



                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Admission Approved">Approved</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">No records found</h3>
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>ID</th>
                                        <th>Email</th>
                                        <th className="text-center">Amount</th>
                                        <th className="text-center">Status</th>
                                        <th>University</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((record, index) => (
                                        <motion.tr
                                            key={record.recordId}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.01 }}
                                        >
                                            <td className="text-xs">{new Date(record.date).toLocaleDateString('en-GB')}</td>
                                            <td className="text-[10px] font-mono text-muted-foreground">{record.recordId}</td>
                                            <td className="font-medium text-sm">{record.name}</td>
                                            <td className="text-center font-bold text-primary">₹{record.target?.toLocaleString()}</td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {getStatusIcon(record.status)}
                                                    <span className="text-[10px]">{record.status}</span>
                                                </div>
                                            </td>
                                            <td className="text-xs">{record.university}</td>
                                            <td className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate(`/details/${currentCollection || selectedCollection}/${record.recordId}`)}
                                                    className="h-7 text-[10px] gap-1 px-3 hover:bg-primary hover:text-white"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    View
                                                </Button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between glass-card p-4">
                        <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
                            <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</Button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
}
