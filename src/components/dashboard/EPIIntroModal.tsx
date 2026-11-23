import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    ShieldCheck,
    Target,
    Activity,
    TrendingUp,
    X,
    ChevronRight,
    ChevronLeft,
    Zap,
    BarChart3,
    Star,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    ArrowRight,
} from 'lucide-react';

interface EPIIntroModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PILLAR_ITEMS = [
    {
        icon: CheckCircle2,
        label: 'Success Rate',
        weight: '40%',
        desc: 'Closed / All Attempts',
        color: '#6366f1',
        glow: 'rgba(99, 102, 241, 0.3)',
    },
    {
        icon: Target,
        label: 'Achievement',
        weight: '30%',
        desc: 'Closed Points vs Target',
        color: '#8b5cf6',
        glow: 'rgba(139, 92, 246, 0.3)',
    },
    {
        icon: Activity,
        label: 'Consistency',
        weight: '20%',
        desc: 'Low Deviation = High Score',
        color: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.3)',
    },
    {
        icon: TrendingUp,
        label: 'Trend',
        weight: '10%',
        desc: 'Upward Momentum',
        color: '#10b981',
        glow: 'rgba(16, 185, 129, 0.3)',
    },
];

const TIER_ITEMS = [
    {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        label: 'Elite Tier',
        range: 'EPI > 85%',
        desc: 'Your consistent stars. Reward and retain.',
    },
    {
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        label: 'Core Tier',
        range: 'EPI 50 – 85%',
        desc: 'Stable contributors. Growth potential exists.',
    },
    {
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.3)',
        label: 'Coaching Tier',
        range: 'EPI < 50%',
        desc: 'Needs targeted coaching or re-evaluation.',
    },
];

// Floating particle component
const Particle = ({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) => (
    <motion.div
        style={{
            position: 'absolute',
            left: x,
            top: y,
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.6), rgba(139,92,246,0.2))',
            pointerEvents: 'none',
        }}
        animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
        }}
        transition={{
            duration: 3 + Math.random() * 2,
            delay,
            repeat: Infinity,
            ease: 'easeInOut' as const,
        }}
    />
);

const containerVariants: Variants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 180,
            damping: 18
        }
    },
};

const slideVariants: Variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80 }),
    center: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.38,
            ease: [0.22, 1, 0.36, 1]
        }
    },
    exit: (dir: number) => ({
        opacity: 0,
        x: dir > 0 ? -80 : 80,
        transition: { duration: 0.28 }
    }),
};

export function EPIIntroModal({ isOpen, onClose }: EPIIntroModalProps) {
    const [slide, setSlide] = useState(0);
    const [direction, setDirection] = useState(1);
    const totalSlides = 5;

    // Reset to slide 0 when modal opens
    useEffect(() => {
        if (isOpen) setSlide(0);
    }, [isOpen]);

    const goNext = () => {
        if (slide < totalSlides - 1) {
            setDirection(1);
            setSlide((s) => s + 1);
        } else {
            onClose();
        }
    };

    const goPrev = () => {
        if (slide > 0) {
            setDirection(-1);
            setSlide((s) => s - 1);
        }
    };

    const goToSlide = (i: number) => {
        setDirection(i > slide ? 1 : -1);
        setSlide(i);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(12px)',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ scale: 0.88, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                        style={{
                            position: 'relative',
                            width: '95%',
                            maxWidth: '820px',
                            minHeight: '480px',
                            maxHeight: 'min(90vh, 720px)',
                            borderRadius: '28px',
                            overflow: 'hidden',
                            background: 'linear-gradient(145deg, #0f0f1a 0%, #12121f 60%, #0d0d18 100%)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            boxShadow: '0 0 0 1px rgba(99,102,241,0.08), 0 32px 80px rgba(0,0,0,0.6), 0 0 120px rgba(99,102,241,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Ambient background glow */}
                        <div style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '28px'
                        }}>
                            <div style={{
                                position: 'absolute', top: '-40%', left: '20%',
                                width: '400px', height: '400px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                            }} />
                            <div style={{
                                position: 'absolute', bottom: '-20%', right: '10%',
                                width: '300px', height: '300px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
                            }} />
                        </div>

                        {/* Floating particles */}
                        {[
                            { delay: 0, x: '8%', y: '15%', size: 6 },
                            { delay: 0.8, x: '88%', y: '25%', size: 4 },
                            { delay: 1.5, x: '15%', y: '75%', size: 5 },
                            { delay: 0.4, x: '80%', y: '70%', size: 7 },
                            { delay: 1.2, x: '50%', y: '10%', size: 4 },
                        ].map((p, i) => <Particle key={i} {...p} />)}

                        {/* Progress bar */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0,
                            height: '3px', background: 'rgba(255,255,255,0.05)', zIndex: 10
                        }}>
                            <motion.div
                                style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
                                animate={{ width: `${((slide + 1) / totalSlides) * 100}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 20,
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'rgba(255,255,255,0.4)', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}
                        >
                            <X size={16} />
                        </button>

                        {/* Slide content */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            position: 'relative',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            scrollbarWidth: 'none', // Hide scrollbar for clean look
                            msOverflowStyle: 'none'
                        }}>
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={slide}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    style={{
                                        padding: '3.5rem 2.5rem 6.5rem', // Added bottom padding for nav room
                                        width: '100%',
                                        margin: '0 auto',
                                        maxWidth: '760px'
                                    }}
                                >
                                    {slide === 0 && <Slide0 />}
                                    {slide === 1 && <Slide1 />}
                                    {slide === 2 && <Slide2 />}
                                    {slide === 3 && <Slide3 />}
                                    {slide === 4 && <Slide4 />}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Navigation */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: '1.25rem 2.5rem',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(12,12,25,0.85)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            backdropFilter: 'blur(12px)',
                            zIndex: 30
                        }}>
                            {/* Dot indicators */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {Array.from({ length: totalSlides }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goToSlide(i)}
                                        style={{
                                            width: i === slide ? '20px' : '6px',
                                            height: '6px',
                                            borderRadius: '3px',
                                            background: i === slide
                                                ? 'linear-gradient(90deg, #6366f1, #a855f7)'
                                                : 'rgba(255,255,255,0.2)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            padding: 0,
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Nav buttons */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {slide > 0 && (
                                    <button
                                        onClick={goPrev}
                                        style={{
                                            height: '40px', padding: '0 18px', borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                            fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                    >
                                        <ChevronLeft size={14} /> Back
                                    </button>
                                )}
                                <button
                                    onClick={goNext}
                                    style={{
                                        height: '40px', padding: '0 24px', borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                        border: 'none', color: 'white', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em',
                                        boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(99,102,241,0.65)')}
                                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.4)')}
                                >
                                    {slide === totalSlides - 1 ? 'Enter Dashboard' : 'Continue'}
                                    {slide === totalSlides - 1 ? <ArrowRight size={14} /> : <ChevronRight size={14} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ─────────────────────────────────────────────
   SLIDE 0 — The Problem
───────────────────────────────────────────── */
function Slide0() {
    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ maxWidth: '560px' }}>
            <motion.div variants={itemVariants} style={{ marginBottom: '1.5rem' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 14px', borderRadius: '100px',
                    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
                    color: '#f43f5e', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'
                }}>
                    <AlertCircle size={11} /> The Problem
                </span>
            </motion.div>

            <motion.h2 variants={itemVariants} style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800,
                color: 'white', lineHeight: 1.15, marginBottom: '1.25rem',
            }}>
                Achievement % is not<br />
                <span style={{ color: '#f43f5e' }}>the full picture.</span>
            </motion.h2>

            <motion.p variants={itemVariants} style={{
                fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: '2rem',
            }}>
                A single lucky deal can spike a BDE's achievement to 200%, making them appear elite. But what if they're inconsistent? What if they're trending down? Traditional tables hide the truth.
            </motion.p>

            {/* Before vs After block */}
            <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{
                    padding: '18px', borderRadius: '16px',
                    background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)',
                }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#f43f5e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Old Way</p>
                    <p style={{ fontSize: '26px', fontWeight: 900, color: 'white', fontFamily: 'monospace', marginBottom: '4px' }}>127%</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Achievement % only.</p>
                    <p style={{ fontSize: '11px', color: 'rgba(244,63,94,0.7)', marginTop: '8px' }}>Misses: Consistency, Trend, Success Rate.</p>
                </div>
                <div style={{
                    padding: '18px', borderRadius: '16px',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>EPI Way</p>
                    <p style={{ fontSize: '26px', fontWeight: 900, color: 'white', fontFamily: 'monospace', marginBottom: '4px' }}>80.4%</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Holistic power score.</p>
                    <p style={{ fontSize: '11px', color: 'rgba(99,102,241,0.7)', marginTop: '8px' }}>Reflects real, sustainable performance.</p>
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   SLIDE 1 — Grand Introduction
───────────────────────────────────────────── */
function Slide1() {
    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show"
            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>

            {/* EPI Icon — Glowing Orb */}
            <motion.div variants={itemVariants}>
                <motion.div
                    animate={{ boxShadow: ['0 0 40px rgba(99,102,241,0.4)', '0 0 80px rgba(139,92,246,0.6)', '0 0 40px rgba(99,102,241,0.4)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const }}
                    style={{
                        width: '100px', height: '100px', borderRadius: '28px', margin: '0 auto',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                    }}
                >
                    <ShieldCheck size={48} color="white" />
                    {/* orbiting sparkle */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' as const }}
                        style={{ position: 'absolute', inset: '-10px' }}
                    >
                        <Sparkles size={18} color="#a78bfa" style={{ position: 'absolute', top: 0, right: 0 }} />
                    </motion.div>
                </motion.div>
            </motion.div>

            <motion.span variants={itemVariants} style={{
                padding: '5px 16px', borderRadius: '100px',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase'
            }}>
                Introducing
            </motion.span>

            <motion.h2 variants={itemVariants} style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: 'white', lineHeight: 1.1,
            }}>
                Elite Performer<br />
                <motion.span
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{
                        backgroundImage: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899, #6366f1)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    } as any}
                >
                    Index
                </motion.span>
            </motion.h2>

            <motion.p variants={itemVariants} style={{
                fontSize: '16px', color: 'rgba(255,255,255,0.5)', maxWidth: '420px', lineHeight: 1.7,
            }}>
                A single, intelligent power score that identifies your organisation's <strong style={{ color: 'rgba(255,255,255,0.8)' }}>true top-tier talent</strong> — not just the ones who got lucky.
            </motion.p>

            <motion.div variants={itemVariants} style={{
                display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap'
            }}>
                {['Fair & Transparent', 'Data-Driven', 'Predictive'].map((tag) => (
                    <div key={tag} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600,
                    }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }} />
                        {tag}
                    </div>
                ))}
            </motion.div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   SLIDE 2 — The 4 Pillars
───────────────────────────────────────────── */
function Slide2() {
    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants} style={{ marginBottom: '1rem' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 14px', borderRadius: '100px',
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
                    color: '#a78bfa', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'
                }}>
                    <Sparkles size={11} /> The Formula
                </span>
            </motion.div>

            <motion.h2 variants={itemVariants} style={{
                fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, color: 'white', marginBottom: '0.5rem',
            }}>
                Built on <span style={{ color: '#a78bfa' }}>4 pillars</span> of performance.
            </motion.h2>
            <motion.p variants={itemVariants} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '1.75rem' }}>
                Each dimension is weighted by its impact on long-term, sustainable success.
            </motion.p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {PILLAR_ITEMS.map((p, i) => (
                    <motion.div
                        key={p.label}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.12 + 0.2, type: 'spring' as const, stiffness: 200, damping: 18 }}
                        style={{
                            padding: '18px', borderRadius: '18px',
                            background: `rgba(${hexToRgb(p.color)}, 0.07)`,
                            border: `1px solid rgba(${hexToRgb(p.color)}, 0.2)`,
                            display: 'flex', gap: '14px', alignItems: 'flex-start',
                        }}
                    >
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                            background: `rgba(${hexToRgb(p.color)}, 0.15)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 16px ${p.glow}`,
                        }}>
                            <p.icon size={20} color={p.color} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{p.label}</p>
                                <span style={{
                                    fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '100px',
                                    background: `rgba(${hexToRgb(p.color)}, 0.2)`, color: p.color,
                                }}>{p.weight}</span>
                            </div>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{p.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Formula line */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{
                    marginTop: '1.25rem', padding: '12px 18px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    textAlign: 'center'
                }}
            >
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    <span style={{ color: '#6366f1' }}>EPI</span> = (SuccessRate × 0.4) + (Achievement × 0.3) + (Consistency × 0.2) + (Trend)
                </p>
            </motion.div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   SLIDE 3 — Performance Tiers
───────────────────────────────────────────── */
function Slide3() {
    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show">
            <motion.div variants={itemVariants} style={{ marginBottom: '1rem' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 14px', borderRadius: '100px',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                    color: '#34d399', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'
                }}>
                    <BarChart3 size={11} /> Performance Tiers
                </span>
            </motion.div>

            <motion.h2 variants={itemVariants} style={{
                fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, color: 'white', marginBottom: '0.5rem',
            }}>
                Three tiers. <span style={{ color: '#34d399' }}>Zero ambiguity.</span>
            </motion.h2>
            <motion.p variants={itemVariants} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '1.75rem' }}>
                Every individual is instantly classified. Every manager knows exactly who needs what.
            </motion.p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {TIER_ITEMS.map((t, i) => (
                    <motion.div
                        key={t.label}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 + 0.2, type: 'spring' as const, stiffness: 180, damping: 18 }}
                        style={{
                            padding: '18px 20px', borderRadius: '18px',
                            background: t.bg, border: `1px solid ${t.border}`,
                            display: 'flex', alignItems: 'center', gap: '16px',
                        }}
                    >
                        {/* Color swatch */}
                        <motion.div
                            animate={{ boxShadow: [`0 0 12px ${t.border}`, `0 0 24px ${t.border}`, `0 0 12px ${t.border}`] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                            style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.color, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{t.label}</p>
                                <span style={{
                                    fontSize: '10px', fontWeight: 700, padding: '2px 10px', borderRadius: '100px',
                                    background: `rgba(${hexToRgb(t.color)}, 0.15)`, color: t.color, fontFamily: 'monospace',
                                }}>{t.range}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{t.desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   SLIDE 4 — Final CTA
───────────────────────────────────────────── */
function Slide4() {
    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show"
            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', paddingTop: '1rem' }}>

            <motion.div variants={itemVariants}>
                <motion.div
                    animate={{
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.08, 1],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
                    style={{
                        width: '90px', height: '90px', borderRadius: '26px', margin: '0 auto',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 50px rgba(16,185,129,0.4)',
                    }}
                >
                    <Star size={44} color="white" fill="white" />
                </motion.div>
            </motion.div>

            <motion.span variants={itemVariants} style={{
                padding: '5px 16px', borderRadius: '100px',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#34d399', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase'
            }}>
                You're all set
            </motion.span>

            <motion.h2 variants={itemVariants} style={{
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, color: 'white', lineHeight: 1.15,
            }}>
                Your analytics just got<br />
                <motion.span
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{
                        backgroundImage: 'linear-gradient(90deg, #10b981, #06b6d4, #6366f1, #10b981)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    } as any}
                >
                    superpowered.
                </motion.span>
            </motion.h2>

            <motion.p variants={itemVariants} style={{
                fontSize: '15px', color: 'rgba(255,255,255,0.45)', maxWidth: '380px', lineHeight: 1.75,
            }}>
                The EPI dashboard is live. Explore the <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Stability</strong>, <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Efficiency</strong>, and <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Source Conversion</strong> views to get the full picture.
            </motion.p>

            {/* Feature recap pills */}
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                {['EPI Score', 'Tier Classification', 'Trend Analysis', 'Conversion Ratio', 'Source Leaders'].map(f => (
                    <span key={f} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.5)',
                    }}>
                        <CheckCircle2 size={10} style={{ color: '#10b981' }} /> {f}
                    </span>
                ))}
            </motion.div>
        </motion.div>
    );
}

/* Helper: hex to r,g,b string for rgba() */
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '99,102,241';
}
