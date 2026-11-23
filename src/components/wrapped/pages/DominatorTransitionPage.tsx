import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    onNext?: () => void;
    isActive?: boolean;
    akashImage?: string;
}

export default function DominatorTransitionPage({ onNext, isActive = false, akashImage }: Props) {
    const [phase, setPhase] = useState(0);

    const sentence = "DOMINATOR & HUNTER";
    const words = sentence.split(" ");

    useEffect(() => {
        if (!isActive) {
            setPhase(0);
            return;
        }

        // SEQUENCE START (1.5s intervals for every step as requested)
        setPhase(1); // T=0: Dominator & Hunter (word by word)
        
        const t2 = setTimeout(() => setPhase(2), 1500); // T=1.5s: tagline appear
        const t3 = setTimeout(() => setPhase(3), 3000); // T=3.0s: OG appear (1.5s after tagline)
        const t4 = setTimeout(() => setPhase(4), 4500); // T=4.5s: Move text & Show Akash Image (1.5s after OG)

        return () => {
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [isActive]);

    return (
        <div 
            className="w-full h-full flex items-center justify-center overflow-hidden absolute inset-0 cursor-pointer bg-black"
            onClick={onNext}
        >
            <div className="relative flex items-center justify-center w-full h-full">
                {/* 1. BACKGROUND LAYER: OG */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <motion.div
                        className="text-[45vw] md:text-[40vw] font-black leading-none text-white select-none text-center"
                        style={{ fontFamily: '"Bodoni FLF", serif' }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                            opacity: phase >= 3 ? 0.15 : 0,
                            scale: phase >= 3 ? 1 : 0.8
                        }}
                        transition={{ duration: 1.5 }}
                    >
                        OG
                    </motion.div>
                </div>

                {/* 2. CENTER LAYER: AKASH IMAGE CARD */}
                <motion.div
                    className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ 
                        opacity: phase >= 4 ? 1 : 0, 
                        scale: phase >= 4 ? 1 : 0.7,
                    }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="relative p-6">
                        {/* Shimmering Aura */}
                        <motion.div 
                            className="absolute -inset-10 rounded-full bg-yellow-500/30 blur-3xl"
                            animate={{
                                opacity: [0.3, 0.6, 0.3],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                        />
                        
                        {/* Card Container */}
                        <motion.div 
                            className="relative w-[80vw] sm:w-[50vw] md:w-[320px] lg:w-[400px] aspect-[4/5] bg-neutral-900 rounded-[3rem] overflow-hidden border-[4px] border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.4)]"
                            style={{ zIndex: 41 }}
                        >
                            <img 
                                src={akashImage || "/api/placeholder/400/500"} 
                                alt="Akash Dubey" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as any).src = "https://placehold.co/400x500/000000/FFFFFF?text=Akash+Dubey";
                                }}
                            />
                            
                            {/* Scanning Shine Effect */}
                            <motion.div 
                                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"
                                animate={{ x: ['-200%', '200%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            />
                            
                            {/* Blinking Golden Border Overlay */}
                            <motion.div 
                                className="absolute inset-0 border-4 border-yellow-400/50 rounded-[3rem]"
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        </motion.div>
                    </div>
                </motion.div>

                {/* 3. FOREGROUND LAYER: TEXT */}
                <motion.div 
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none px-4"
                    animate={{ 
                        y: phase >= 4 ? "min(32vh, 320px)" : 0
                    }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="flex flex-wrap justify-center gap-x-4 md:gap-x-8 px-8">
                        {words.map((word, i) => (
                            <motion.span
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ 
                                    duration: 0.8, 
                                    delay: i * 0.5,
                                    ease: "easeOut"
                                }}
                                className="text-white text-3xl md:text-5xl lg:text-7xl font-bold uppercase tracking-widest drop-shadow-2xl"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                            >
                                {word}
                            </motion.span>
                        ))}
                    </div>

                    <motion.div
                        className="mt-4 md:mt-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: phase >= 2 ? 1 : 0 }}
                        transition={{ duration: 1 }}
                    >
                        <p 
                            className="text-[#EDEDED] text-sm md:text-xl lg:text-3xl font-light uppercase tracking-[0.6em] text-center drop-shadow-lg"
                            style={{ fontFamily: '"League Spartan", sans-serif' }}
                        >
                            Born to dominate and Hunt
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
