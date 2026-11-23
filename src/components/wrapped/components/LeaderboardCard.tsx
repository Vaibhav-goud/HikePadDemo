import { motion } from "framer-motion";
import { Trophy, Star, TrendingUp, MapPin, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardCardProps {
  leader: {
    id: number | string;
    name: string;
    image: string;
    branch?: string;
    admissions?: number;
    points?: number;
    achievement?: number;
  };
  index: number;
  variant?: "top5" | "top10";
}

export function LeaderboardCard({ leader, index, variant = "top5" }: LeaderboardCardProps) {
  const isRank1 = index === 0;
  const isRank2 = index === 1;
  const isRank3 = index === 2;

  const rankColor = isRank1 
    ? "bg-yellow-500 text-black shadow-yellow-500/50" 
    : isRank2 
    ? "bg-slate-300 text-black shadow-slate-300/50" 
    : isRank3 
    ? "bg-amber-600 text-white shadow-amber-600/50"
    : "bg-white text-black shadow-white/50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.21, 1.11, 0.81, 0.99] }}
      whileHover={{ y: -10, transition: { duration: 0.3 } }}
      className={cn(
        "relative group w-full flex flex-col cursor-pointer transition-all duration-500 min-w-0",
        isRank1 ? "h-[500px] md:h-[550px]" : "h-[400px] md:h-[450px]"
      )}
    >
      {/* Outer Glow */}
      <div className={cn(
        "absolute -inset-2 rounded-[24px] blur-3xl transition duration-700 -z-10",
        isRank1 ? "bg-yellow-500/40 opacity-70 group-hover:opacity-100" : 
        isRank2 ? "bg-slate-400/30 opacity-40 group-hover:opacity-70" : 
        isRank3 ? "bg-amber-600/30 opacity-40 group-hover:opacity-70" : 
        "bg-white/5 opacity-10 group-hover:opacity-30"
      )} />
 
      <div className={cn(
        "relative flex-1 rounded-[24px] overflow-hidden transition-all duration-700",
        "bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/10",
        isRank1 && "shadow-[0_8px_32px_rgba(234,179,8,0.25)] border-yellow-500/40"
      )}>
        
        {/* The Image - Edge-to-edge bleed */}
        <div className="absolute inset-0 overflow-hidden z-0">
            <img 
                src={leader.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.name}`} 
                alt={leader.name}
                className="w-full h-full object-cover transition duration-1000 group-hover:scale-105"
            />
            {/* Gradient Overlays for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />
            
            {/* Large semi-transparent background number */}
            <div className="absolute top-4 right-2 text-[180px] font-black italic text-white/5 leading-none select-none pointer-events-none drop-shadow-2xl">
              {index + 1}
            </div>
        </div>
 
        {/* Top UI Elements Layer */}
        <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-10 pointer-events-none">
            {/* Rank Badge - Floating Medal Style */}
            <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-xl border border-white/20",
                isRank1 ? "bg-gradient-to-br from-yellow-300 to-yellow-600 text-black border-yellow-200" : 
                isRank2 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-black border-slate-100" : 
                isRank3 ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400" : 
                "bg-black/40 text-white border-white/10"
            )}>
                #{index + 1}
            </div>
 
            {isRank1 && (
                <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="flex flex-col items-end shrink-0"
                >
                    <div className="bg-yellow-500/20 backdrop-blur-xl px-3 py-1.5 rounded-full border border-yellow-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                        <Trophy className="w-4 h-4 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest whitespace-nowrap">Champion</span>
                    </div>
                </motion.div>
            )}
        </div>
 
        {/* Bottom UI Elements Layer */}
        <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col space-y-4 justify-end text-left">
            
            {/* Name & Branch */}
            <div className="space-y-1">
                <motion.h3 
                    className="text-2xl md:text-3xl font-black text-white leading-none tracking-tight drop-shadow-lg truncate max-w-full"
                >
                    {leader.name}
                </motion.h3>
                <div className="flex items-center gap-1.5 text-white/70 text-[11px] uppercase font-bold tracking-[0.15em] truncate max-w-full">
                    <MapPin className="w-3 h-3 text-white/50 flex-shrink-0" />
                    <span className="truncate">{leader.branch || "Head Office"}</span>
                </div>
            </div>
 
            {/* Stats - Minimal Stat Chips */}
            <div className="flex gap-2.5">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 shadow-lg">
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Achv</span>
                    <span className="text-sm font-black text-white">{leader.achievement || 0}%</span>
                </div>
            </div>
        </div>
 
        {/* Rank #1 Star Decoration removed */}
      </div>
    </motion.div>
  );
}
