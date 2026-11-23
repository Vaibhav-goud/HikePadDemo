import { motion, MotionValue } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";
import { StatBlock } from "../components/StatBlock";
import { Sparkles } from "lucide-react";

interface YearSummaryPageProps {
  onNext?: () => void;
  currentUser: any;
  isActive?: boolean;
  mouseX?: MotionValue;
  mouseY?: MotionValue;
  rank?: number;
  totalUsers?: number;
  isOrganization?: boolean;
}

export default function YearSummaryPage({
  onNext,
  currentUser,
  isActive,
  mouseX,
  mouseY,
  rank = 0,
  totalUsers = 0,
  isOrganization = false
}: YearSummaryPageProps) {
  const topPercent = totalUsers > 0 ? ((rank / totalUsers) * 100).toFixed(1) : "0.0";
  return (
    <PageTransition>
      <div className="h-screen w-full flex items-center justify-center px-8 md:px-20 pt-12 md:pt-0 relative overflow-hidden">

        {/* Subtle Background Decoration */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px]" />
          </motion.div>
        )}

        <div className="max-w-[1400px] w-full grid md:grid-cols-2 gap-16 md:gap-32 items-center relative z-10">
          {/* Left: User Image - Larger and centered */}
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={isActive ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -50, scale: 0.9 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:block mx-auto w-full max-w-lg"
          >
            {isOrganization ? (
              <div className="w-full flex items-center justify-center p-8">
                <img
                  src={currentUser.image}
                  alt={currentUser.name}
                  className="w-full h-auto object-contain drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]"
                />
              </div>
            ) : (
              <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl relative p-1.5 bg-gradient-to-br from-white/20 to-transparent">
                <div className="w-full h-full rounded-[2.8rem] overflow-hidden bg-black/40">
                  <img
                    src={currentUser.image}
                    alt={currentUser.name}
                    className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition-all duration-700"
                  />
                </div>
              </div>
            )}

            {!isOrganization && (rank > 0 && totalUsers > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="mt-6 text-center"
              >
                <p className="text-yellow-400 font-bold uppercase tracking-[0.4em] text-sm md:text-base">
                  you were in the top <span className="text-white text-xl md:text-2xl">{topPercent}%</span> of people
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Right: Stats Section - Centered perfectly */}
          <div className="flex flex-col justify-center space-y-10 md:space-y-12">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                className="flex items-center gap-3 text-yellow-400 font-black uppercase tracking-[0.4em] text-xs"
              >
                <Sparkles className="w-4 h-4" />
                Year-End Report
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase tracking-tighter leading-none"
              >
                YOUR YEAR <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-white to-purple-400">SUMMARY</span>
              </motion.h2>
            </div>

            <div className="space-y-10 md:space-y-12">
              <StatBlock
                label="Total Admissions"
                value={currentUser.totalAdmissions}
                delay={0.4}
                isActive={isActive}
              />
              <StatBlock
                label="Total Points"
                value={currentUser.totalPoints}
                delay={0.6}
                isActive={isActive}
              />
              <StatBlock
                label="Target Achievement"
                value={currentUser.achievementPercent}
                suffix="%"
                delay={0.8}
                isActive={isActive}
              />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={isActive ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.8, delay: 2.5 }}
              className="pt-4"
            >
              <NavigationButton onClick={onNext} delay={0} />
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
