import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";
import { LeaderboardCard } from "../components/LeaderboardCard";
import { Trophy, Star, TrendingUp, Sparkles } from "lucide-react";

interface Top5PageProps {
  onNext?: () => void;
  top5Users: any[];
  isActive?: boolean;
}

export default function Top5Page({ onNext, top5Users: leaders, isActive }: Top5PageProps) {
  return (
    <PageTransition>
      <div className="h-screen flex flex-col items-center justify-center px-4 md:px-12 py-10 relative overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Floating Background Decorations */}
        <motion.div 
          animate={{ x: [-50, 50, -50], y: [-20, 30, -20] }} 
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-10 w-[30rem] h-[30rem] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" 
        />
        <motion.div 
          animate={{ x: [50, -50, 50], y: [30, -30, 30] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-10 right-10 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" 
        />
        <motion.div 
          animate={{ rotate: [45, 60, 45], scale: [1, 1.1, 1] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" 
        />
        {/* Title Section */}
        <div className="relative z-10 mb-16 md:mb-24 text-center shrink-0">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-3 mb-1"
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-500 font-black uppercase tracking-[0.3em] text-[8px] md:text-xs">
              Elite Performance 2025-26
            </span>
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isActive ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl md:text-4xl lg:text-[3.5rem] font-black text-white uppercase tracking-tighter leading-none"
          >
            THE <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-white to-yellow-600">TOP FIVE</span>
          </motion.h2>
        </div>
 
        {/* Main Content Area - Locked Baseline, Flowing from Top */}
        <div className="flex-1 w-full flex flex-col items-center justify-center z-10 pb-16 min-h-0">
          {/* Desktop View - Horizontal Podium with Curved Perspective */}
          <div className="hidden lg:flex flex-col items-center w-full max-w-full overflow-x-auto no-scrollbar py-10" style={{ perspective: "2000px" }}>
            <div className="flex items-center justify-center gap-6 xl:gap-10 w-full px-4 min-w-[1200px]" style={{ transformStyle: "preserve-3d" }}>
              {/* Rank #4 */}
              {leaders[3] && (
                <motion.div 
                  initial={{ rotateY: 15, z: -100, x: -20, y: 20 }}
                  animate={{ y: [20, 10, 20] }}
                  transition={{ y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
                  whileHover={{ scale: 1.02, z: -80, x: -20, transition: { duration: 0.3 } }}
                  className="w-full max-w-[240px] xl:max-w-[256px] min-w-0 origin-right transition-all duration-500"
                >
                  <LeaderboardCard leader={leaders[3]} index={3} variant="top5" />
                </motion.div>
              )}
 
              {/* Rank #2 */}
              {leaders[1] && (
                <motion.div 
                  initial={{ rotateY: 8, z: -40, x: -10, y: 10 }}
                  animate={{ y: [10, 0, 10] }}
                  transition={{ y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 } }}
                  whileHover={{ scale: 1.05, z: -20, x: -10, transition: { duration: 0.3 } }}
                  className="w-full max-w-[256px] xl:max-w-[288px] min-w-0 origin-right relative z-10 transition-all duration-500"
                >
                  <LeaderboardCard leader={leaders[1]} index={1} variant="top5" />
                </motion.div>
              )}
 
              {/* Rank #1 - Center */}
              {leaders[0] && (
                <motion.div 
                  initial={{ z: 50, scale: 1.15 }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 } }}
                  whileHover={{ scale: 1.2, z: 80, transition: { duration: 0.4 } }}
                  className="w-full max-w-[288px] xl:max-w-[320px] relative z-20 min-w-0 mx-2"
                >
                  <LeaderboardCard leader={leaders[0]} index={0} variant="top5" />
                </motion.div>
              )}
 
              {/* Rank #3 */}
              {leaders[2] && (
                <motion.div 
                  initial={{ rotateY: -8, z: -40, x: 10, y: 10 }}
                  animate={{ y: [10, 0, 10] }}
                  transition={{ y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 } }}
                  whileHover={{ scale: 1.05, z: -20, x: 10, transition: { duration: 0.3 } }}
                  className="w-full max-w-[256px] xl:max-w-[288px] min-w-0 origin-left relative z-10 transition-all duration-500"
                >
                  <LeaderboardCard leader={leaders[2]} index={2} variant="top5" />
                </motion.div>
              )}
 
              {/* Rank #5 */}
              {leaders[4] && (
                <motion.div 
                  initial={{ rotateY: -15, z: -100, x: 20, y: 20 }}
                  animate={{ y: [20, 10, 20] }}
                  transition={{ y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 } }}
                  whileHover={{ scale: 1.02, z: -80, x: 20, transition: { duration: 0.3 } }}
                  className="w-full max-w-[240px] xl:max-w-[256px] min-w-0 origin-left transition-all duration-500"
                >
                  <LeaderboardCard leader={leaders[4]} index={4} variant="top5" />
                </motion.div>
              )}
            </div>
 
            {/* Centered Navigation Button anchored absolutely below */}
            {/* NavigationButton removed for Top 5 page */}
          </div>
 
          {/* Tablet View */}
          <div className="hidden md:block lg:hidden w-full max-w-4xl mx-auto z-10 px-8 py-4 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 gap-6 mb-6">
              {leaders.slice(0, 2).map((leader, index) => (
                <div key={leader.id} className="h-[380px] min-w-0">
                  <LeaderboardCard leader={leader} index={index} variant="top5" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {leaders.slice(2, 5).map((leader, index) => (
                <div key={leader.id} className="h-[340px] min-w-0">
                  <LeaderboardCard leader={leader} index={index + 2} variant="top5" />
                </div>
              ))}
            </div>
            {/* NavigationButton removed for Top 5 page */}
          </div>
 
          {/* Mobile View */}
          <div className="md:hidden w-full z-10 px-6">
            <div className="overflow-x-auto pb-4 -mx-4 px-6 no-scrollbar flex gap-4 snap-x snap-mandatory h-[500px]">
              {leaders.map((leader, index) => (
                <div key={leader.id} className="min-w-[280px] w-[280px] snap-center h-full min-w-0">
                  <LeaderboardCard leader={leader} index={index} variant="top5" />
                </div>
              ))}
            </div>
            {/* NavigationButton removed for Top 5 page */}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
