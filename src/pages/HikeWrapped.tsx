import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useInView, MotionValue, useMotionValue } from 'framer-motion';
import {
    X,
    ChevronDown,
    Trophy,
    Target,
    TrendingUp,
    Activity,
    Crown,
    Zap,
    Medal,
    Users,
    ArrowRight,
    Share2,
    Download,
    Star,
    Sparkles,
    Flame,
    Rocket,
    Heart,
    Award
} from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import IntroPage from "../components/wrapped/pages/IntroPage";
import UserIdentityPage from "../components/wrapped/pages/UserIdentityPage";
import TargetAchievementPage from "../components/wrapped/pages/TargetAchievementPage";
import YearSummaryPage from "../components/wrapped/pages/YearSummaryPage";
import Top5Page from "../components/wrapped/pages/Top5Page";
import The100ClubPage from "../components/wrapped/pages/The100ClubPage";
import HustlersPage from "../components/wrapped/pages/HustlersPage";
import StatementPage from "../components/wrapped/pages/StatementPage";
import DominatorTransitionPage from "../components/wrapped/pages/DominatorTransitionPage";
import SupportTeamPage from "../components/wrapped/pages/SupportTeamPage";
import HRTeamPage from "../components/wrapped/pages/HRTeamPage";
import CreditsPage from "../components/wrapped/pages/CreditsPage";
import FinalPage from "../components/wrapped/pages/FinalPage";
import { GrainOverlay } from "../components/wrapped/components/GrainOverlay";
import BackgroundEngine from "../components/wrapped/components/BackgroundEngine";

// --- Motion Variants from Spotify Wrapped ---
const fadeInUp = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as any } }
};

const scaleUp = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as any } }
};

const slideRight = {
    hidden: { opacity: 0, x: -100 },
    visible: { opacity: 1, x: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as any } }
};

const fullScreenFade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 1.5, ease: "easeInOut" as any } }
};

// --- Types ---
interface WrappedData {
    name: string;
    totalClosed: number;
    totalPoints: number;
    successRate: number;
    consistency: number;
    trend: number;
    bestMonth: { month: string; closed: number };
    bestMonthPoints: { month: string; points: number };
    bestGrowthMonth: { month: string; growth: number };
    rank: number;
    percentile: number;
    isOrganization?: boolean;
    branch: string;
}

interface BranchData {
    name: string;
    achievement: number;
    topPerformer: string;
    consistentCloser: string;
    bestMonth: string;
    members: { name: string; points: number; admissions: number }[];
}

const COLORS = [
    '#F2F1E3', // Page 1: Cream
    '#E7E6D1', // Page 2: Muted Mossish Beige
    '#F2F1E3', // Page 3: Back to Cream
    '#E5E7EB', // Page 4: Soft Gray
    '#D1D5DB', // Page 5: Cool Gray
    '#fef3c7', // Page 6: Amber Glow
    '#ecfdf5', // Page 7: Emerald Breeze
    '#f5f3ff', // Page 8: Lavender Mist
    '#fff7ed', // Page 9: Orange Bloom
    '#F2F1E3', // Page 10: Final
    '#000000'
];

const TEXT_COLORS = [
    'text-stone-900',
    'text-stone-800',
    'text-stone-900',
    'text-stone-800',
    'text-stone-800',
    'text-stone-900',
    'text-stone-900',
    'text-stone-900',
    'text-stone-900',
    'text-stone-900'
];

// --- Enhanced Helper Components ---

const Particles = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(30)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    initial={{
                        x: Math.random() * 100 + "%",
                        y: Math.random() * 100 + "%",
                        opacity: Math.random() * 0.3,
                        scale: Math.random() * 0.5 + 0.5,
                    }}
                    animate={{
                        y: [null, Math.random() * -200 - 100 + "px"],
                        opacity: [0, 0.4, 0],
                    }}
                    transition={{
                        duration: Math.random() * 8 + 7,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 5,
                    }}
                />
            ))}
        </div>
    );
};

const FloatingShapes = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <motion.div
                animate={{
                    rotate: 360,
                    x: [0, 150, 0],
                    y: [0, 80, 0],
                }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px]"
            />
            <motion.div
                animate={{
                    rotate: -360,
                    x: [0, -120, 0],
                    y: [0, -100, 0],
                }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[150px]"
            />
        </div>
    );
};

const Counter = ({ value, duration = 2.5, delay = 0 }: { value: number, duration?: number, delay?: number }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (isInView) {
            let start = 0;
            const end = value;
            if (start === end) {
                setCount(end);
                return;
            }

            const totalIntervals = 60;
            const increment = end / totalIntervals;
            const intervalTime = (duration * 1000) / totalIntervals;

            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setCount(end);
                    clearInterval(timer);
                } else {
                    setCount(Math.floor(start));
                }
            }, intervalTime);

            return () => clearInterval(timer);
        }
    }, [isInView, value, duration]);

    return <span ref={ref}>{count.toLocaleString()}</span>;
};

const Typewriter = ({ text, keyTrigger }: { text: string, keyTrigger: any }) => {
    const characters = text.split("");
    return (
        <div className="flex justify-center overflow-hidden">
            {characters.map((char, i) => (
                <motion.span
                    key={`${keyTrigger}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                        duration: 0.1,
                        delay: i * 0.05,
                        ease: "easeOut"
                    }}
                >
                    {char === " " ? "\u00A0" : char}
                </motion.span>
            ))}
        </div>
    );
};

const StaggerContainer = ({ children, delay = 0, className }: { children: React.ReactNode, delay?: number, className?: string }) => {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        delayChildren: delay,
                        staggerChildren: 0.15
                    }
                }
            }}
            className={cn("w-full h-full flex flex-col items-center justify-center p-8 text-center relative z-10", className)}
        >
            {children}
        </motion.div>
    );
};

const StaggerItem = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <motion.div
            variants={{
                hidden: { y: 30, opacity: 0, scale: 0.9 },
                visible: { y: 0, opacity: 1, scale: 1 }
            }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

const Confetti = ({ active }: { active: boolean }) => {
    if (!active) return null;
    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(60)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-sm"
                    initial={{
                        top: "-5%",
                        left: Math.random() * 100 + "%",
                        backgroundColor: ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa"][Math.floor(Math.random() * 5)],
                        rotate: 0,
                    }}
                    animate={{
                        top: "105%",
                        rotate: 900,
                        x: (Math.random() - 0.5) * 300 + "px",
                    }}
                    transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 4,
                    }}
                />
            ))}
        </div>
    );
};

const Noise = ({ isLight }: { isLight?: boolean }) => (
    <div className={cn("absolute inset-0 pointer-events-none mix-blend-overlay", isLight ? "opacity-[0.08]" : "opacity-[0.04]")}
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            filter: isLight ? 'invert(1)' : 'none'
        }}
    />
);

const BackgroundLines = ({ isLight }: { isLight?: boolean }) => {
    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", isLight ? "opacity-10" : "opacity-20")}>
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className={cn(
                        "absolute h-[1px] w-[200%] bg-gradient-to-r from-transparent to-transparent",
                        isLight ? "via-stone-900/40" : "via-white/20"
                    )}
                    style={{
                        top: `${20 * i}%`,
                        left: '-50%',
                        rotate: i % 2 === 0 ? 12 : -12,
                    }}
                    animate={{
                        x: ['-10%', '10%'],
                        opacity: [0.1, 0.3, 0.1],
                    }}
                    transition={{
                        duration: 12 + i * 3,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            ))}
        </div>
    );
};



const MiniBarGraph = ({ data }: { data: { month: string, closed: number }[] }) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.closed), 1);
    const monthOrder = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'];
    const sortedData = [...data].sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    return (
        <div className="flex items-end gap-1.5 h-32 w-full max-w-sm">
            {sortedData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
                    <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${(d.closed / max) * 100}%` }}
                        transition={{ duration: 1, delay: i * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                        className={cn(
                            "w-full rounded-t-lg transition-all duration-500",
                            d.closed === max ? "bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.5)]" : "bg-white/20 group-hover:bg-white/40"
                        )}
                    />
                    <span className="text-[8px] font-black text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-widest">{d.month.slice(0, 1)}</span>
                </div>
            ))}
        </div>
    );
};

const SmokyBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute bg-white/5 rounded-full blur-[120px]"
                style={{
                    width: 400 + Math.random() * 400,
                    height: 400 + Math.random() * 400,
                    left: `${Math.random() * 80}%`,
                    top: `${Math.random() * 80}%`,
                }}
                animate={{
                    x: [0, Math.random() * 200 - 100, 0],
                    y: [0, Math.random() * 200 - 100, 0],
                    scale: [1, 1.2, 1],
                    opacity: [0.03, 0.08, 0.03]
                }}
                transition={{
                    duration: 15 + Math.random() * 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        ))}
    </div>
);

const HustlersSection = ({ hustlers, imageMap }: { hustlers: any[], imageMap: Record<string, string> }) => {
    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden">
            <SmokyBackground />
            <StaggerContainer className="relative z-10">
                <StaggerItem className="mb-12">
                    <h2 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter mb-4 drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                        THE HUSTLERS 💀🔥
                    </h2>
                    <p className="text-red-500 uppercase tracking-[0.5em] text-sm font-black">
                        Those who never quit
                    </p>
                </StaggerItem>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full max-w-7xl relative z-10 overflow-y-auto max-h-[60vh] no-scrollbar px-4">
                    {hustlers.map((h, i) => (
                        <StaggerItem key={h.name}>
                            <Card className="bg-white/5 border-white/10 p-6 rounded-[2.5rem] overflow-hidden hover:scale-110 transition-all duration-500 group relative backdrop-blur-3xl border-b-red-500/20">
                                <div className="absolute inset-0 bg-gradient-to-tr from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                {imageMap[h.name?.toLowerCase()?.trim()] && (
                                    <div className={cn("w-32 h-32 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center relative group backdrop-blur-md mx-auto mb-6 border-red-500/20 group-hover:border-red-500/50 shadow-2xl")}>
                                        <img src={imageMap[h.name.toLowerCase().trim()]} alt={h.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                )}
                                <h3 className="font-black text-lg text-white truncate mb-1">{h.name}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-red-500 font-black text-xs uppercase tracking-widest">{h.totalClosed} Yearly</span>
                                    <Activity className="w-3 h-3 text-red-500 animate-pulse" />
                                </div>
                            </Card>
                        </StaggerItem>
                    ))}
                </div>
            </StaggerContainer>
        </div>
    );
};

const TeamTransitionSection = () => (
    <StaggerContainer>
        <SmokyBackground />
        <StaggerItem>
            <motion.div
                initial={{ scale: 1.2, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
            >
                <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white/90 leading-tight">
                    You made your <span className="text-blue-400 italic">mark.</span>
                </h2>
                <div className="h-[2px] w-48 bg-gradient-to-r from-blue-500 to-transparent mx-auto rounded-full" />
                <p className="text-2xl md:text-4xl font-light text-white/40 max-w-2xl mx-auto leading-relaxed">
                    Now see how the <span className="text-white font-black uppercase tracking-widest">Team</span> dominated the year.
                </p>
            </motion.div>
        </StaggerItem>
    </StaggerContainer>
);

const HundredClubSection = ({ finalists }: { finalists: WrappedData[] }) => {
    const [showIntro, setShowIntro] = useState(true);
    const hundredAdmissions = finalists.filter(f => !f.isOrganization && (f.totalClosed || 0) >= 100).sort((a, b) => (b.totalClosed || 0) - (a.totalClosed || 0));
    const hundredPoints = finalists.filter(f => !f.isOrganization && (f.totalPoints || 0) >= 100).sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowIntro(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden">
            <Noise isLight={true} />
            <AnimatePresence mode="wait">
                {showIntro ? (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
                        transition={{ duration: 0.8 }}
                        className="flex flex-col items-center justify-center h-full w-full z-10"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[100px]"
                        />
                        <h2 className="text-7xl md:text-9xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-white to-yellow-600 animate-pulse relative z-10">
                            THE 100 CLUB
                        </h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-white/40 uppercase tracking-[1em] text-sm mt-8 relative z-10"
                        >
                            Excellence Standard
                        </motion.p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="tables"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{
                            hidden: { opacity: 0, y: 30 },
                            visible: {
                                opacity: 1,
                                y: 0,
                                transition: {
                                    staggerChildren: 0.1,
                                    duration: 0.8
                                }
                            }
                        }}
                        className="w-full max-h-screen flex flex-col items-center justify-center p-4 md:p-12 relative z-10"
                    >
                        <StaggerItem className="text-center mb-10">
                            <h2 className="text-5xl md:text-8xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-white to-yellow-600">
                                The 100 Club
                            </h2>
                            <p className="text-yellow-500 uppercase tracking-[0.5em] text-xs font-black">
                                THE ULTIMATE BENCHMARK OF PERFORMANCE
                            </p>
                        </StaggerItem>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl px-4 overflow-hidden">
                            <StaggerItem>
                                <Card className="bg-white/5 border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-3xl hover:border-blue-500/30 transition-all duration-500 shadow-2xl relative group">
                                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="p-8 bg-blue-500/10 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="font-black flex items-center gap-3 text-blue-400 uppercase text-xs tracking-widest italic">
                                            <Target className="w-5 h-5" />
                                            100 Closed Admissions
                                        </h3>
                                        <Badge className="bg-blue-500/20 text-blue-400 border-none font-black text-[10px]">LEGENDS</Badge>
                                    </div>
                                    <div className="p-4 space-y-2 max-h-[45vh] overflow-y-auto no-scrollbar">
                                        {hundredAdmissions.length > 0 ? hundredAdmissions.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between p-5 hover:bg-white/5 rounded-3xl transition-all group/item border border-transparent hover:border-white/10">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-blue-400 font-black text-sm font-mono">#{String(i + 1).padStart(2, '0')}</span>
                                                    <span className="font-bold text-xl text-white/80 group-hover/item:text-white transition-colors">{p.name}</span>
                                                </div>
                                                <span className="text-blue-400 font-black text-2xl font-mono">{p.totalClosed}</span>
                                            </div>
                                        )) : (
                                            <div className="p-20 text-center text-white/10 italic font-black uppercase tracking-[0.3em] text-sm">
                                                Hunting for the first member...
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </StaggerItem>

                            <StaggerItem>
                                <Card className="bg-white/5 border-white/10 rounded-[3rem] overflow-hidden backdrop-blur-3xl shadow-2xl border-yellow-500/20 group relative hover:border-yellow-500/40 transition-all duration-500">
                                    <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="p-8 bg-yellow-500/10 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="font-black flex items-center gap-3 text-yellow-500 uppercase text-xs tracking-widest italic">
                                            <Trophy className="w-5 h-5" />
                                            100 Closed Points
                                        </h3>
                                        <Badge className="bg-yellow-500 text-black border-none font-black text-[10px]">ELITE</Badge>
                                    </div>
                                    <div className="p-4 space-y-2 max-h-[45vh] overflow-y-auto no-scrollbar">
                                        {hundredPoints.length > 0 ? hundredPoints.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between p-5 hover:bg-white/5 rounded-3xl transition-all group/item border border-transparent hover:border-white/10">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-yellow-500 font-black text-sm font-mono">#{String(i + 1).padStart(2, '0')}</span>
                                                    <span className="font-bold text-xl text-white/80 group-hover/item:text-white transition-colors">{p.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-yellow-500 font-black text-2xl font-mono">{p.totalPoints}</span>
                                                    <Zap className="w-4 h-4 text-yellow-500" />
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-20 text-center text-white/10 italic font-black uppercase tracking-[0.3em] text-sm">
                                                Almost there...
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </StaggerItem>
                        </div>
                    </motion.div>

                )}
            </AnimatePresence>
        </div>
    );
};

export default function HikeWrapped() {
    const { user, isLoading: authLoading } = useAuth();

    if (authLoading) return null;
    if (!user) return <Navigate to="/login" replace />;

    const [activeSection, setActiveSection] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [typewriterKey, setTypewriterKey] = useState(0);
    const [hustlersReady, setHustlersReady] = useState(false);

    // Handle body overflow
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalStyle;
            document.documentElement.style.overflow = originalStyle;
        };
    }, []);

    // Typewriter repeat effect
    useEffect(() => {
        const interval = setInterval(() => {
            setTypewriterKey(prev => prev + 1);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Queries
    const { data: salesRecords, isLoading: salesLoading } = useQuery({
        queryKey: ['masterData'],
        queryFn: () => api.getMasterData(),
        enabled: !!user
    });

    const { data: allUsers, isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.getUsers(),
        enabled: !!user
    });

    const { data: userImagesData } = useQuery({
        queryKey: ['userImages'],
        queryFn: () => api.getUserImages(),
        enabled: !!user
    });

    const { data: drivesMetadata } = useQuery({
        queryKey: ['drivesMetadata'],
        queryFn: () => api.getDrives(),
        enabled: !!user
    });

    const userImageMap = useMemo(() => {
        const map: Record<string, string> = {};
        userImagesData?.forEach((img: any) => {
            if (img.name) {
                const version = new Date(img.updatedAt || img.uploadedAt || 0).getTime();
                map[img.name.toLowerCase().trim()] = `/api/user-images/${img._id}/raw?v=${version}`;
            }
        });
        return map;
    }, [userImagesData]);

    const processedData = useMemo(() => {
        if (!salesRecords || !allUsers) return null;

        const filteredRecords = salesRecords.filter(r => !r.inactive);

        const bdeMap: Record<string, {
            monthlyMetrics: { month: string, year: string, target: number, closed: number, points: number, rate: number, admissions: number, failed: number, drive?: string }[],
            totalClosed: number,
            totalPoints: number,
            totalAdm: number,
            totalFailed: number,
            totalTarget: number,
            branch: string
        }> = {};

        const teamMap: Record<string, {
            name: string,
            totalClosed: number,
            totalPoints: number,
            totalAdm: number,
            totalFailed: number,
            totalTarget: number,
            members: Record<string, number>
        }> = {};

        const companyMetrics: Record<string, { closed: number, points: number, rateSum: number, count: number }> = {};
        let companyTotalClosed = 0;
        let companyTotalPoints = 0;
        let companyTotalAdm = 0;
        let companyTotalFailed = 0;
        let companyTarget = 0;

        filteredRecords.forEach(r => {
            const name = r.bdeName;
            const branch = r.branch;
            const teamKey = r.teamName || r.teamLeader || 'Unassigned';
            if (!name) return;

            if (!bdeMap[name]) {
                bdeMap[name] = {
                    monthlyMetrics: [],
                    totalClosed: 0,
                    totalPoints: 0,
                    totalAdm: 0,
                    totalFailed: 0,
                    totalTarget: 0,
                    branch: branch || 'N/A'
                };
            }

            if (teamKey) {
                if (!teamMap[teamKey]) {
                    teamMap[teamKey] = {
                        name: teamKey,
                        totalClosed: 0,
                        totalPoints: 0,
                        totalAdm: 0,
                        totalFailed: 0,
                        totalTarget: 0,
                        members: {}
                    };
                }
                const tStats = teamMap[teamKey];
                tStats.totalClosed += (r.closedAdm || 0);
                tStats.totalPoints += (r.closedPoints || 0);
                tStats.totalAdm += (r.admissions || 0);
                tStats.totalFailed += (r.cancellation || 0) + (r.incomplete || 0);
                tStats.totalTarget += (r.target || 0);
                tStats.members[name] = (tStats.members[name] || 0) + (r.closedPoints || 0);
            }

            const stats = bdeMap[name];
            stats.totalClosed += (r.closedAdm || 0);
            stats.totalPoints += (r.closedPoints || 0);
            stats.totalAdm += (r.admissions || 0);
            stats.totalFailed += (r.cancellation || 0) + (r.incomplete || 0);
            stats.totalTarget += (r.target || 0);

            companyTotalClosed += (r.closedAdm || 0);
            companyTotalPoints += (r.closedPoints || 0);
            companyTotalAdm += (r.admissions || 0);
            companyTotalFailed += (r.cancellation || 0) + (r.incomplete || 0);
            companyTarget += (r.target || 0);

            const denom = (r.admissions || 0) + (r.cancellation || 0) + (r.incomplete || 0);
            const rate = denom === 0 ? 0 : (r.closedAdm || 0) / denom;

            stats.monthlyMetrics.push({
                month: (r.month || '').toUpperCase(),
                year: r.fy || '2025',
                target: Number(r.target) || 0,
                closed: Number(r.closedAdm) || 0,
                points: Number(r.closedPoints) || 0,
                rate,
                admissions: Number(r.admissions) || 0,
                failed: Number(r.cancellation || 0) + Number(r.incomplete || 0),
                drive: r.drive
            });

            const monthKey = (r.month || '').toUpperCase();
            if (!companyMetrics[monthKey]) companyMetrics[monthKey] = { closed: 0, points: 0, rateSum: 0, count: 0 };
            companyMetrics[monthKey].closed += (r.closedAdm || 0);
            companyMetrics[monthKey].points += (r.closedPoints || 0);
            companyMetrics[monthKey].rateSum += rate;
            companyMetrics[monthKey].count += 1;
        });

        const monthOrder = ['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'];

        const finalists = Object.entries(bdeMap).map(([name, stats]) => {
            const denominator = stats.totalAdm + stats.totalFailed;
            const closingRatio = denominator === 0 ? 0 : (stats.totalClosed / denominator) * 100;
            const successRate = stats.totalTarget === 0 ? 0 : (stats.totalPoints / stats.totalTarget) * 100;

            const rates = stats.monthlyMetrics.map(m => m.rate);
            const mean = rates.reduce((a, b) => a + b, 0) / (rates.length || 1);
            const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (rates.length || 1);
            const stdDev = Math.sqrt(variance);
            const consistency = Math.max(0, 100 - (stdDev * 150));

            const sortedMetrics = [...stats.monthlyMetrics].sort((a, b) =>
                monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
            );

            let trend = 0;
            if (sortedMetrics.length >= 2) {
                const recent = sortedMetrics[sortedMetrics.length - 1].rate;
                const prev = sortedMetrics[sortedMetrics.length - 2].rate;
                trend = (recent - prev) * 50;
            }

            const bestMonth = [...stats.monthlyMetrics].sort((a, b) => b.closed - a.closed)[0];
            const bestMonthPoints = [...stats.monthlyMetrics].sort((a, b) => b.points - a.points)[0];

            return {
                name,
                totalClosed: stats.totalClosed,
                totalPoints: stats.totalPoints,
                closingRatio: parseFloat(closingRatio.toFixed(1)),
                successRate: parseFloat(successRate.toFixed(1)),
                consistency: parseFloat(consistency.toFixed(1)),
                trend: parseFloat(trend.toFixed(1)),
                bestMonth: { month: bestMonth?.month || 'N/A', closed: bestMonth?.closed || 0 },
                bestMonthPoints: { month: bestMonthPoints?.month || 'N/A', points: bestMonthPoints?.points || 0 },
                bestGrowthMonth: { month: bestMonth?.month || 'N/A', growth: bestMonth?.closed || 0 },
                totalTarget: stats.totalTarget,
                branch: stats.branch,
                // isHustler filter removed as per user request
                rank: 0,
                percentile: 0,
                monthlyMetrics: sortedMetrics,
                drives: (drivesMetadata || []).map((dm: any) => {
                    // Find records belonging to this drive
                    const driveRecords = stats.monthlyMetrics.filter(m => {
                        const recordMonthNum = (monthOrder.indexOf(m.month) + 4) % 12 || 12;
                        // Wait, dashboard uses a static map. Let's use that.
                        const monthToNumber: Record<string, number> = {
                            'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
                            'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
                        };
                        const mNum = monthToNumber[m.month];
                        const start = dm.startMonth;
                        const end = dm.endMonth;

                        if (start <= end) {
                            return mNum >= start && mNum <= end;
                        } else {
                            return mNum >= start || mNum <= end;
                        }
                    });

                    const dClosed = driveRecords.reduce((a, b) => a + b.closed, 0);
                    const dPoints = driveRecords.reduce((a, b) => a + b.points, 0);
                    const dTarget = driveRecords.reduce((a, b) => a + b.target, 0);
                    const dBestM = [...driveRecords].sort((a, b) => b.closed - a.closed)[0];
                    const dBestMP = [...driveRecords].sort((a, b) => b.points - a.points)[0];

                    return {
                        driveName: dm.name,
                        bestMonth: dBestM?.month || 'N/A',
                        highestClosedAdmissions: dBestM?.closed || 0,
                        highestClosedPoints: dBestMP?.points || 0,
                        totalClosed: dClosed,
                        totalPoints: dPoints,
                        achievementPercent: dTarget === 0 ? 0 : Math.round((dPoints / dTarget) * 100)
                    };
                })
            } as any;
        }).sort((a, b) => b.successRate - a.successRate);


        const bdeToTeamMap: Record<string, string> = {};
        filteredRecords.forEach(r => {
            if (r.bdeName) {
                bdeToTeamMap[r.bdeName] = r.teamName || r.teamLeader || 'Unassigned';
            }
        });

        const branches: BranchData[] = Object.values(teamMap).map(b => {
            const teamMembers = finalists.filter(f => bdeToTeamMap[f.name] === b.name);
            const topPerf = [...teamMembers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))[0];
            const consCloser = [...teamMembers].sort((a, b) => (b.consistency || 0) - (a.consistency || 0))[0];

            return {
                name: b.name,
                achievement: 0,
                topPerformer: topPerf?.name || 'N/A',
                consistentCloser: consCloser?.name || 'N/A',
                bestMonth: teamMembers.length > 0 ? [...teamMembers].sort((a, b) => (b.bestMonth?.closed || 0) - (a.bestMonth?.closed || 0))[0]?.bestMonth?.month || 'N/A' : 'N/A',
                members: teamMembers.map(m => ({
                    name: m.name || 'Unknown',
                    points: m.totalPoints || 0,
                    admissions: m.totalClosed || 0
                })).sort((a, b) => b.points - a.points)
            };
        }).sort((a, b) => b.name.localeCompare(a.name));

        const companyBestMonthKey = Object.entries(companyMetrics).sort((a, b) => b[1].closed - a[1].closed)[0]?.[0] || 'N/A';
        const companyBestMonthData = companyMetrics[companyBestMonthKey];

        const organizationEntry: WrappedData = {
            name: 'Hike Education Overall',
            totalClosed: companyTotalClosed,
            totalPoints: companyTotalPoints,
            successRate: parseFloat(((companyTotalPoints / (companyTarget || 1)) * 100).toFixed(1)),
            consistency: parseFloat((finalists.reduce((a, b) => a + b.consistency, 0) / (finalists.length || 1)).toFixed(1)),
            trend: parseFloat((finalists.reduce((a, b) => a + b.trend, 0) / (finalists.length || 1)).toFixed(1)),
            bestMonth: { month: companyBestMonthKey, closed: companyBestMonthData?.closed || 0 },
            bestMonthPoints: { month: companyBestMonthKey, points: companyBestMonthData?.points || 0 },
            bestGrowthMonth: { month: companyBestMonthKey, growth: companyBestMonthData?.closed || 0 },
            branch: 'ALL',
            isOrganization: true,
            rank: 0,
            percentile: 100
        };

        return { finalists: [organizationEntry, ...finalists], branches };
    }, [salesRecords, allUsers]);

    const finalists = useMemo(() => processedData?.finalists || [], [processedData]);
    const branches = useMemo(() => processedData?.branches || [], [processedData]);

    const top5Achievements = useMemo(() => [...finalists].filter(d => !d.isOrganization).sort((a, b) => b.successRate - a.successRate).slice(0, 5), [finalists]);

    useEffect(() => {
        if (!selectedUser && finalists.length > 0) {
            const isManagerialRole = ['Admin', 'Super Admin', 'HR', 'Operations Executive', 'Operations Leader', 'Vice President'].includes(user?.role || '');
            if (isManagerialRole) {
                setSelectedUser('Hike Education Overall');
            } else {
                const me = finalists.find(d => d.name.toLowerCase() === user?.name?.toLowerCase());
                setSelectedUser(me?.name || finalists[0].name);
            }
        }
    }, [finalists, selectedUser, user]);

    const userStats: any | null = useMemo(() => {
        if (!selectedUser || !finalists) return null;
        const index = finalists.findIndex(d => d.name === selectedUser);
        if (index === -1) return null;

        return {
            ...finalists[index],
            rank: index + 1,
            percentile: Math.round((1 - index / finalists.length) * 100)
        };
    }, [selectedUser, finalists]);

    const performanceCategory = useMemo(() => {
        if (!userStats) return 'medium';
        if (userStats.isOrganization) return 'high';
        if (userStats.rank && userStats.rank <= 15) return 'high';
        if (userStats.totalClosed < 10) return 'low';
        return 'medium';
    }, [userStats]);

    const pronoun = userStats?.isOrganization ? "we" : "you";
    const introHeadline1 = "This year was exciting, full of ups and downs, but";
    const introHeadline2 = `${pronoun} made it..`;

    const hustlers = useMemo(() => {
        const hustlerNames = [
            { name: "Pratik T", tag: "OG" },
            { name: "Abhishek B", tag: "OG" },
            { name: "Shashank T", tag: "OG" },
            { name: "Lakhan P", tag: "OG" },
            { name: "Mahesh", tag: "OG" },
            { name: "Atharv", tag: "OG" },
            { name: "Vishal G", tag: "OG" },
            { name: "Harsh G", tag: "OG" },
            { name: "Ishtiyaque", tag: "new" },
            { name: "Shruti", tag: "new" },
            { name: "Parshvi", tag: "new" },
            { name: "Shubham Kashyap", tag: "new" },
            { name: "Prajakta", tag: "new" },
            { name: "Reva", tag: "new" },
            { name: "yashpreet", tag: "new" },
            { name: "Siddhesh", tag: "new" }
        ];

        return hustlerNames.map(hn => {
            const foundStats = finalists.find(f => f.name.toLowerCase().includes(hn.name.toLowerCase()));
            return {
                name: hn.name,
                tag: hn.tag,
                totalClosed: foundStats?.totalClosed || 0,
            };
        });
    }, [finalists]);






    const lastScrollTime = useRef(0);

    const handleNextSection = () => {
        if (activeSection < sections.length - 1) {
            setActiveSection(prev => prev + 1);
        } else {
            window.location.href = '/dashboard';
        }
    };

    const handleWheel = (e: any) => {
        const now = Date.now();
        if (now - lastScrollTime.current < 1000) return;

        if (Math.abs(e.deltaY) < 30) return;

        if (e.deltaY > 0 && activeSection < sections.length - 1) {
            setActiveSection(prev => prev + 1);
            lastScrollTime.current = now;
        } else if (e.deltaY < 0 && activeSection > 0) {
            setActiveSection(prev => prev - 1);
            lastScrollTime.current = now;
        }
    };


    const userAchievedMonths = userStats?.monthlyMetrics?.filter((m: any) => m.closed >= 8).map((m: any) => m.month) || [];
    const hasAchievements = userAchievedMonths.length > 0;

    const isHROps = ['HR', 'Operations Executive', 'Operations Leader', 'Vice President'].includes(user?.role || '');

    const sections = [
        {
            key: 'intro',
            variant: fadeInUp,
            render: (isActive: boolean, x: MotionValue, y: MotionValue) => <IntroPage onNext={handleNextSection} isActive={isActive} mouseX={x} mouseY={y} />
        },
        {
            key: 'userIdentity',
            variant: scaleUp,
            render: (isActive: boolean, x: MotionValue, y: MotionValue) => (
                <UserIdentityPage
                    currentUser={{
                        name: userStats?.name || user?.name || "Member",
                        image: userStats?.isOrganization
                            ? "/logo-transparent.png"
                            : (userImageMap[userStats?.name?.toLowerCase()?.trim()] || userImageMap[user?.name?.toLowerCase()?.trim()]),
                        role: userStats?.isOrganization ? "Overall Performance" : (allUsers?.find(u => u.name === userStats?.name)?.role || "Team Member"),
                        location: userStats?.branch || user?.branch || "Hike Education",
                        isActive: true
                    }}
                    driveData={userStats?.drives || []}
                    onNext={handleNextSection}
                    isActive={isActive}
                    mouseX={x}
                    mouseY={y}
                    disableReveal={isHROps}
                />
            )
        },
        // Only show TargetAchievementPage if user has achievements and not HR/Ops
        ...((hasAchievements && !isHROps) ? [{
            key: 'targetAchievement',
            variant: slideRight,
            render: (isActive: boolean, x: MotionValue, y: MotionValue) => (
                <TargetAchievementPage
                    onNext={handleNextSection}
                    achievedMonths={userAchievedMonths}
                    hasAchievements={hasAchievements}
                    isActive={isActive}
                    mouseX={x}
                    mouseY={y}
                />
            )
        }] : []),
        ...(!isHROps ? [{
            key: 'yearSummary',
            variant: scaleUp,
            render: (isActive: boolean, x: MotionValue, y: MotionValue) => {
                const calculationPopulation = finalists.filter(f => !f.isOrganization && (f.totalTarget || 0) > 20);
                const userIndex = calculationPopulation.findIndex(f => f.name === (userStats?.name || user?.name));
                const showPercentile = !userStats?.isOrganization && (userStats?.totalTarget || 0) > 20 && userIndex !== -1;

                return (
                    <YearSummaryPage
                        currentUser={{
                            name: userStats?.name || user?.name,
                            image: userStats?.isOrganization
                                ? "/logo-transparent.png"
                                : (userImageMap[userStats?.name?.toLowerCase()?.trim()] || userImageMap[user?.name?.toLowerCase()?.trim()]),
                            totalAdmissions: userStats?.totalClosed || 0,
                            totalPoints: userStats?.totalPoints || 0,
                            achievementPercent: userStats?.successRate || 0,
                            totalTarget: userStats?.totalTarget || 0
                        }}
                        rank={userIndex + 1}
                        totalUsers={calculationPopulation.length}
                        isOrganization={!!userStats?.isOrganization}
                        onNext={handleNextSection}
                        isActive={isActive}
                        mouseX={x}
                        mouseY={y}
                    />
                );
            }
        }] : []),
        {
            key: 'top5',
            variant: fadeInUp,
            render: (isActive: boolean) => {
                const top5Names = ["Siddhesh", "Prajakta", "Harsh G", "Parshvi", "Shashank T"];
                const formattedTop5 = top5Names.map((name, i) => {
                    const u = finalists.find(f => f.name.toLowerCase().includes(name.toLowerCase())) || {} as any;
                    return {
                        id: i,
                        name: name,
                        image: userImageMap[name.toLowerCase().trim()],
                        branch: u.branch || "N/A",
                        admissions: u.totalClosed || 0,
                        points: u.totalPoints || 0,
                        achievement: u.successRate || 0
                    };
                });
                return <Top5Page top5Users={formattedTop5} onNext={handleNextSection} isActive={isActive} />;
            }
        },
        {
            key: 'the100Club',
            variant: scaleUp,
            render: (isActive: boolean) => {
                const harshStats = finalists.find(f => f.name.toLowerCase().includes("harsh g")) || {} as any;
                const onlyHarsh = [{
                    id: 0,
                    name: "Harsh G",
                    image: userImageMap["harsh2"] || userImageMap["harsh g"] || userImageMap["harsh"],
                    admissions: harshStats.totalClosed || 0,
                    points: harshStats.totalPoints || 0
                }];
                return <The100ClubPage club100Members={onlyHarsh} onNext={handleNextSection} isActive={isActive} />;
            }
        },
        {
            key: 'hustlers',
            name: 'Hustlers',
            variant: slideRight,
            render: (isActive: boolean) => {
                const formattedHustlers = hustlers.map((u, i) => ({
                    id: i,
                    name: u.name,
                    tag: u.tag,
                    image: userImageMap[u.name?.toLowerCase()?.trim()],
                    admissions: u.totalClosed
                }));
                return <HustlersPage hustlers={formattedHustlers} onNext={handleNextSection} isActive={isActive} onReady={() => setHustlersReady(true)} />;
            }
        },
        {
            key: 'statement',
            variant: fadeInUp,
            render: (isActive: boolean) => <StatementPage onNext={handleNextSection} isActive={isActive} userImageMap={userImageMap} />
        },
        {
            key: 'dominatorTransition',
            name: 'DominatorTransition',
            variant: fullScreenFade,
            render: (isActive: boolean) => <DominatorTransitionPage onNext={handleNextSection} isActive={isActive} akashImage={userImageMap['akash dubey'] || userImageMap['akash d'] || userImageMap['akash'] || "/api/placeholder/400/400"} />
        },
        {
            key: 'supportTeam',
            variant: scaleUp,
            render: (isActive: boolean) => (
                <SupportTeamPage
                    isActive={isActive}
                    supportTeam={[
                        { id: 4, name: "Yashvi Jain", role: "Core Support Team", designation: "Sr. Executive", image: userImageMap["yashvi jain"] || "/api/placeholder/150/150" },
                        { id: 5, name: "Preetika", role: "Core Support Team", designation: "COE", image: userImageMap["preetika"] || "/api/placeholder/150/150" },
                        { id: 3, name: "Tejashree", role: "Core Support Team", designation: "Executive", image: userImageMap["tejashree"] || "/api/placeholder/150/150" },
                        { id: 1, name: "Kiran Sindal", role: "Core Support Team", designation: "Asst. Team Leader", image: userImageMap["kiran sindal"] || "/api/placeholder/150/150" },
                        { id: 2, name: "Susmita", role: "Core Support Team", designation: "Sr. Executive", image: userImageMap["susmita"] || "/api/placeholder/150/150" },
                        { id: 6, name: "Kashaf", role: "Core Support Team", designation: "COE", image: userImageMap["kashaf"] || "/api/placeholder/150/150" },
                        { id: 7, name: "Deepti", role: "Core Support Team", designation: "COE", image: userImageMap["deepti"] || "/api/placeholder/150/150" },
                        { id: 8, name: "Diyansh", role: "Core Support Team", designation: "Intern", image: userImageMap["diyansh"] || "/api/placeholder/150/150" }
                    ]}
                    onNext={handleNextSection}
                />
            )
        },
        {
            key: 'hrTeam',
            variant: scaleUp,
            render: (isActive: boolean) => (
                <HRTeamPage
                    isActive={isActive}
                    hrTeam={[
                        { id: 1, name: "Manisha", role: "HR Team", designation: "Sr. Executive", image: userImageMap["manisha"] || "/api/placeholder/150/150" },
                        { id: 2, name: "Rizwan", role: "HR Team", designation: "Sr. T.A Specialist", image: userImageMap["rizwan"] || "/api/placeholder/150/150" },
                        { id: 3, name: "Meher", role: "HR Team", designation: "Sr. Executive", image: userImageMap["meher"] || "/api/placeholder/150/150" }
                    ]}
                    onNext={handleNextSection}
                />
            )
        },
        {
            key: 'credits',
            name: 'Credits',
            variant: scaleUp,
            render: (isActive: boolean) => (
                <CreditsPage
                    credits={[
                        { id: 1, name: "Vaibhav", role: "Creator", image: userImageMap["vaibhav"] || "/api/placeholder/150/150" },
                        { id: 2, name: "Aditya", role: "Collaborator", image: userImageMap["aditya"] || "/api/placeholder/150/150" }
                    ]}
                    onNext={handleNextSection}
                    isActive={isActive}
                />
            )
        },
        {
            key: 'final',
            variant: scaleUp,
            render: () => <FinalPage onNext={() => setActiveSection(0)} />
        }
    ];

    // Reset readiness when section changes
    useEffect(() => {
        if ((sections[activeSection] as any)?.name !== 'Hustlers') {
            setHustlersReady(false);
        }
    }, [activeSection, sections]);



    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 150 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    const scrollYProgress = useMotionValue(0);

    useEffect(() => {
        const progress = activeSection / (sections.length - 1);
        scrollYProgress.set(progress);
    }, [activeSection, sections.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                handleNextSection();
            } else if (e.key === 'ArrowUp') {
                if (activeSection > 0) {
                    setActiveSection(prev => prev - 1);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeSection, sections.length]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth - 0.5) * 20;
        const y = (clientY / window.innerHeight - 0.5) * 20;
        mouseX.set(x);
        mouseY.set(y);
    };

    const isDarkBg = true;

    return (
        <motion.div
            className={cn(
                "relative h-screen w-full overflow-hidden font-sans select-none transition-colors duration-700 bg-black text-white no-scrollbar"
            )}
            onWheel={handleWheel}
            onMouseMove={handleMouseMove}
        >
            <BackgroundEngine scrollYProgress={scrollYProgress} isHustlersPage={hustlersReady || ['DominatorTransition', 'Credits'].includes((sections[activeSection] as any)?.name)} />
            <GrainOverlay />

            {/* Exit Button */}
            <div className="fixed top-8 right-8 z-[150]">
                <Button
                    onClick={() => {
                        const hrOpsRoles = ['HR', 'Operations Executive', 'Operations Leader'];
                        const isHROps = hrOpsRoles.includes(user?.role || '');
                        window.location.href = isHROps ? '/march-madness' : '/dashboard';
                    }}
                    variant="ghost"
                    className="text-white/40 hover:text-white hover:bg-white/10 rounded-full px-6 py-2 border border-white/10 flex items-center gap-2 group transition-all"
                >
                    <span className="text-xs font-black uppercase tracking-widest">Exit</span>
                    <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                </Button>
            </div>

            <motion.div
                className="h-full w-full relative z-[20]"
                animate={{ y: `-${activeSection * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
            >
                {sections.map((section, index) => {
                    const isActive = index === activeSection;
                    return (
                        <div key={(section as any).key || index} className="h-full w-full max-w-[100vw] overflow-x-hidden relative flex-shrink-0">
                            <motion.div
                                variants={section.variant}
                                initial="hidden"
                                animate={isActive ? "visible" : "hidden"}
                                className="h-full w-full"
                            >
                                {section.render(isActive, springX, springY)}
                            </motion.div>
                        </div>
                    );
                })}
            </motion.div>

            {/* Side Navigation Indicators */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-3">
                {sections.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveSection(i)}
                        className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all duration-500",
                            activeSection === i
                                ? "bg-stone-900 h-8"
                                : "bg-stone-300 hover:bg-stone-400"
                        )}
                        aria-label={`Go to section ${i + 1}`}
                    />
                ))}
            </div>

            {/* Admin Controls (Floating) */}
            {['Admin', 'Super Admin'].includes(user?.role || '') && (
                <div className="fixed bottom-8 left-8 z-[150] w-72 bg-white/5 backdrop-blur-3xl p-5 rounded-[2rem] shadow-[0_30px_70px_rgba(0,0,0,0.6)] border border-white/10 group hover:border-white/20 transition-all duration-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[2rem] pointer-events-none" />
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-white to-purple-400 mb-3 block px-1 relative z-10">
                        Admin Controller
                    </label>
                    <div className="relative z-10">
                        <select
                            value={selectedUser || ''}
                            onChange={(e) => {
                                setSelectedUser(e.target.value);
                                setActiveSection(0);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 outline-none text-[11px] font-black text-white cursor-pointer appearance-none hover:bg-white/10 transition-all focus:ring-1 focus:ring-white/20"
                        >
                            {finalists.map(d => (
                                <option key={d.name} value={d.name} className="bg-[#020617] text-white py-4 font-black">
                                    {d.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 group-hover:text-white/60 transition-colors">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            )}

        </motion.div>
    );
}
