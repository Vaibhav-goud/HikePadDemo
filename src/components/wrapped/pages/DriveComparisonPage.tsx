import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";
import { AnimatedText } from "../components/AnimatedText";

import { StatBlock } from "../components/StatBlock";

interface DriveComparisonPageProps { onNext?: () => void; driveData: any[]; }

export default function DriveComparisonPage({ onNext, driveData }: DriveComparisonPageProps) {
  if (!driveData || driveData.length < 1) {
    return null;
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 py-20">
        <AnimatedText
          stagger
          delay={0}
          className="text-3xl md:text-4xl font-bold mb-16 text-center"
        >
          Drive Comparison
        </AnimatedText>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl w-full mb-12">
          {driveData.map((drive, index) => (
            <motion.div
              key={drive.driveName}
              initial={{ opacity: 0, x: index === 0 ? -100 : 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="bg-white/50 backdrop-blur-sm rounded-3xl p-8 md:p-10 shadow-lg border border-neutral-200/50"
            >
              <motion.h3
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.2 }}
                className="text-2xl md:text-3xl font-bold mb-8"
              >
                {drive.driveName}
              </motion.h3>

              <div className="grid grid-cols-2 gap-8 py-6 border-y border-neutral-100/50">
                <div className="space-y-4">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-black">Best Month</p>
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 + index * 0.2 }}
                    className="text-xl font-black text-neutral-900"
                  >
                    {drive.bestMonth}
                  </motion.p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-neutral-500 uppercase font-bold mb-1">Adm</p>
                      <p className="text-2xl font-black text-neutral-900 leading-none">{drive.highestClosedAdmissions}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-neutral-500 uppercase font-bold mb-1">Pts</p>
                      <p className="text-2xl font-black text-neutral-900 leading-none">{drive.highestClosedPoints}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pl-8 border-l border-neutral-100">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-black">Drive Total</p>
                  <p className="text-xl font-black text-neutral-900">Summary</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-neutral-500 uppercase font-bold mb-1">Adm</p>
                      <p className="text-2xl font-black text-neutral-900 leading-none">{drive.totalClosed}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-neutral-500 uppercase font-bold mb-1">Pts</p>
                      <p className="text-2xl font-black text-neutral-900 leading-none">{drive.totalPoints}</p>
                    </div>
                  </div>
                </div>
              </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.9 + index * 0.2 }}
                  className="pt-4 border-t border-neutral-200"
                >
                  <p className="text-xs text-neutral-600 uppercase tracking-wider mb-1">
                    Achievement
                  </p>
                  <p className="text-4xl font-bold text-green-600">
                    {drive.achievementPercent}%
                  </p>
                </motion.div>
            </motion.div>
          ))}
        </div>

        <NavigationButton onClick={onNext} delay={1.2} />
      </div>
    </PageTransition>
  );
}
