import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";
import { useState, useEffect } from "react";

interface HustlersPageProps { onNext?: () => void; hustlers: any[]; isActive?: boolean; onReady?: () => void; }

export default function HustlersPage({ onNext, hustlers, isActive, onReady }: HustlersPageProps) {
  const [stage, setStage] = useState<'intro' | 'revealing' | 'ready'>('intro');
  const marqueeText = "CREATE • EXPLORE • EXPAND • CONQUER • ";

  useEffect(() => {
    if (isActive) {
      setStage('intro');
      const timer1 = setTimeout(() => setStage('revealing'), 2000);
      const timer2 = setTimeout(() => {
        setStage('ready');
        onReady?.();
      }, 3500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setStage('intro');
    }
  }, [isActive]);

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden font-sans w-full h-full m-0 p-0 no-scrollbar">
      <motion.div
        animate={
          stage === 'intro'
            ? { y: "-50%", scale: 1, opacity: 1 }
            : { y: "-50%", scale: 0.6, opacity: 1 }
        }
        style={{
          top: stage === 'intro' ? '50%' : '15%'
        }}
        transition={{
          duration: 1.5,
          ease: [0.16, 1, 0.3, 1]
        }}
        className="absolute inset-x-0 z-[110] text-center pointer-events-none flex flex-col items-center justify-center w-full"
      >
        <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-[0.15em] italic drop-shadow-2xl">
          Now presenting <span className="block mt-4 text-white">— Hustlers</span>
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={stage === 'ready' ? { opacity: 0.5 } : { opacity: 0 }}
        transition={{ duration: 1.5 }}
        className="absolute top-6 inset-x-0 overflow-hidden pointer-events-none z-[100] select-none"
        style={{ height: '40px' }}
      >
        <motion.div
          animate={{ x: ["0%", "-10%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="whitespace-nowrap flex items-center w-max max-w-none"
        >
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-xl md:text-3xl font-black uppercase tracking-[0.3em] text-white leading-none px-4">
              {marqueeText}
            </span>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={stage === 'ready' ? { opacity: 0.5 } : { opacity: 0 }}
        transition={{ duration: 1.5 }}
        className="absolute bottom-6 inset-x-0 overflow-hidden pointer-events-none z-[100] select-none"
        style={{ height: '40px' }}
      >
        <motion.div
          animate={{ x: ["-10%", "0%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="whitespace-nowrap flex items-center w-max max-w-none"
        >
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-xl md:text-3xl font-black uppercase tracking-[0.3em] text-white leading-none px-4">
              {marqueeText}
            </span>
          ))}
        </motion.div>
      </motion.div>

      <div className="relative z-10 w-full flex flex-col items-center px-4 md:px-8 pt-44 md:pt-64 pb-20 md:pb-32">
        <div 
          onWheel={(e) => e.stopPropagation()}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4 w-full max-w-7xl mx-auto mb-10 max-h-[72vh] overflow-y-auto py-6 px-4 place-items-center scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
          {hustlers.map((hustler, index) => (
            <motion.div
              key={hustler.id}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={
                stage !== 'intro'
                  ? { opacity: 1, scale: 1, y: 0 }
                  : { opacity: 0 }
              }
              transition={{
                duration: 1,
                // Reveal NEW first (indices 8+), then OG (indices 0-7)
                delay: 0.8 + (hustler.tag === 'new' ? (index - 8) * 0.1 : 1.5 + index * 0.1),
                ease: "easeOut"
              }}
              whileHover={{ scale: 1.05 }}
              className="relative group cursor-pointer w-full min-w-0"
            >
              <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border border-yellow-500/40 ring-1 ring-yellow-400/20 group-hover:ring-yellow-400/60 group-hover:border-yellow-400 transition-all duration-500 relative bg-neutral-900">
                <img
                  src={hustler.image}
                  alt={hustler.name}
                  className="w-full h-full object-cover transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent" />
                
                {hustler.tag && (
                  <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[6px] md:text-[8px] font-black uppercase tracking-wider backdrop-blur-md border shadow-lg z-20 ${
                    hustler.tag === 'OG' 
                      ? 'bg-amber-500/20 border-amber-400/30 text-amber-500 shadow-amber-500/20' 
                      : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400 shadow-emerald-500/20'
                  }`}>
                    {hustler.tag}
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 text-center">
                  <h3 className="font-bold text-[8px] md:text-[10px] text-white uppercase tracking-wider truncate mb-0">{hustler.name}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* NavigationButton removed as per user request */}
      </div>
    </div>
  );
}
