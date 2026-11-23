
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Database,
    Calendar,
    RefreshCw,
    AlertCircle,
    TrendingUp,
    PieChart as PieChartIcon,
    Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    Treemap
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DetailsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Collections
    const [availableCollections, setAvailableCollections] = useState<string[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string>('all');

    // Stats
    const [stats, setStats] = useState<{ pieData: any[], treemapData: any[] }>({ pieData: [], treemapData: [] });
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

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

    const fetchStats = async () => {
        try {
            setIsStatsLoading(true);
            const data = await api.getDetailStats(selectedCollection === 'all' ? undefined : selectedCollection);
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const isAdmin = user && ['Admin', 'Operations Leader', 'Vice President'].includes(user.role);

    useEffect(() => {
        fetchMonths();
    }, []);

    useEffect(() => {
        fetchStats();
    }, [selectedCollection]);

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            const result = await api.syncDetails();
            toast.success(`Sync successful: ${result.summary.inserted} inserted, ${result.summary.updated} updated`);
            await fetchMonths();
            if (isAdmin) fetchStats();
        } catch (error: any) {
            console.error('Sync failed:', error);
            toast.error(error.message || 'Manual sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <DashboardLayout
            title="Details Dashboard"
            subtitle="Performance Analytics & Statistics"
        >
            <div className="space-y-8">

                {/* Filters & Actions Bar */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between glass-card p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Range:</span>
                            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                                <SelectTrigger className="w-56">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Select Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Overall (All Months)</SelectItem>
                                    {availableCollections.map(col => (
                                        <SelectItem key={col} value={col}>
                                            {col.replace('_hyd', '').replace('_', ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* MORE DETAILS BUTTON (Navigates to Table Page) */}
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/details/list')}
                            className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                        >
                            <TableIcon className="w-4 h-4 mr-2" />
                            More Details
                        </Button>
                    </div>

                    {isAdmin && (
                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {isSyncing ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Database className="mr-2 h-4 w-4" />
                            )}
                            Sync Now
                        </Button>
                    )}
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Pie Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 flex flex-col h-[450px]"
                    >
                        <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                            <PieChartIcon className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-lg">Fee Type Distribution</h3>
                        </div>

                        {isStatsLoading ? (
                            <Skeleton className="flex-1 rounded-2xl" />
                        ) : (
                            <div className="flex-1 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                                        <Pie
                                            data={stats.pieData}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={true}
                                        >
                                            {stats.pieData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                borderRadius: '12px',
                                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
                                            }}
                                            itemStyle={{ color: '#ffffff' }}
                                            labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={56}
                                            wrapperStyle={{ paddingTop: '10px' }}
                                            formatter={(value) => <span style={{ color: '#fff', fontSize: '11px' }}>{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </motion.div>

                    {/* Treemap */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card p-8 flex flex-col h-[450px]"
                    >
                        <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-bold text-lg">University Performance (Revenue)</h3>
                        </div>

                        {isStatsLoading ? (
                            <Skeleton className="flex-1 rounded-2xl" />
                        ) : (
                            <div className="flex-1 w-full overflow-hidden rounded-xl">
                                <ResponsiveContainer width="100%" height="100%">
                                    <Treemap
                                        data={stats.treemapData}
                                        dataKey="size"
                                        stroke="#0f172a"
                                        fill="#6366f1"
                                        content={<CustomTreemapContent />}
                                    >
                                        <Tooltip
                                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                            contentStyle={{
                                                backgroundColor: '#111827',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '12px'
                                            }}
                                            itemStyle={{ color: '#ffffff' }}
                                            labelStyle={{ color: '#ffffff' }}
                                        />
                                    </Treemap>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}

const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, index, name, value, depth } = props;

    // Strict integer mathematics to align perfectly with the pixel grid
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(width);
    const rh = Math.round(height);

    if (rw < 45 || rh < 35) return null;

    return (
        <g>
            <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                fill={COLORS[index % COLORS.length]}
                stroke="#0f172a"
                strokeWidth={2}
                shapeRendering="crispEdges"
            />
            <text
                x={rx + rw / 2}
                y={ry + rh / 2 - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize={depth === 1 ? 14 : 11}
                fontWeight="900"
                style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.9))',
                    textRendering: 'geometricPrecision'
                }}
            >
                {name}
            </text>
            <text
                x={rx + rw / 2}
                y={ry + rh / 2 + 15}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                fontSize={depth === 1 ? 11 : 9}
                fontWeight="700"
                style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    textRendering: 'geometricPrecision'
                }}
            >
                ₹{(value / 1000).toFixed(1)}k
            </text>
        </g>
    );
};
