import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";
import { GradientText, AnimatedText } from "../components/AnimatedText";


interface TargetAchievementPageProps { 
  onNext?: () => void; 
  achievedMonths: string[]; 
  hasAchievements: boolean; 
  isActive?: boolean;
  mouseX?: any;
  mouseY?: any;
}

import { Check } from "lucide-react";
import { useTransform } from "framer-motion";

export default function TargetAchievementPage({ onNext, achievedMonths, hasAchievements, isActive, mouseX, mouseY }: TargetAchievementPageProps) {
  const bgX = useTransform(mouseX || { get: () => 0 }, (val: number) => val * -1.5);
  const bgY = useTransform(mouseY || { get: () => 0 }, (val: number) => val * -1.5);
  const fgX = useTransform(mouseX || { get: () => 0 }, (val: number) => val * 0.8);
  const fgY = useTransform(mouseY || { get: () => 0 }, (val: number) => val * 0.8);

  if (!hasAchievements && isActive) {
    return (
      <PageTransition>
        <div className="h-screen flex flex-col items-center justify-center px-6 md:px-12 py-10 relative overflow-hidden">
          <motion.div 
            className="max-w-6xl text-center space-y-12 relative z-10"
            initial={false}
            animate={{ y: 0, opacity: 1 }}
            style={{ x: fgX, y: fgY }}
          >
            <GradientText delay={0} className="text-4xl md:text-7xl lg:text-8xl font-black leading-tight px-4 w-full">
              The journey is just beginning, every step counts toward greatness
            </GradientText>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.5 }}
              className="pt-8"
            >
              <NavigationButton onClick={onNext} delay={0.2} />
            </motion.div>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="h-screen flex flex-col items-center justify-center px-6 md:px-12 py-10 relative overflow-hidden">
        <motion.div 
          className="max-w-7xl text-center space-y-12 relative z-10"
          initial={false}
          animate={isActive ? { y: 0, opacity: 1 } : { y: -200, opacity: 0 }}
          style={{ x: fgX, y: fgY }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative overflow-visible"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={isActive ? { opacity: 0.1 } : { opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 blur-3xl"
            />
            <GradientText delay={0} className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] uppercase tracking-wider px-4 overflow-visible pr-8">
              YOU HAVE ACHIEVED YOUR COMMITMENT, EXPECTATIONS, AND TARGET{" "}
            </GradientText>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="pt-8"
          >
            <AnimatedText delay={0.5} className="text-lg md:text-xl text-neutral-400 mb-8 lowercase tracking-widest font-bold">
              Months achieved:
            </AnimatedText>
            <div className="flex flex-wrap justify-center gap-3">
              {achievedMonths.map((month, index) => (
                <motion.div
                  key={month}
                  initial={{ opacity: 0, scale: 0.8, rotateZ: -10 }}
                  animate={isActive ? { opacity: 1, scale: 1, rotateZ: 0 } : { opacity: 0, scale: 0.8, rotateZ: -10 }}
                  whileHover={{ scale: 1.1, rotateZ: 5 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 0.8 + index * 0.1,
                    type: "spring",
                    stiffness: 200
                  }}
                  className="px-8 py-4 bg-neutral-900 text-neutral-50 rounded-full text-base md:text-lg uppercase tracking-wider shadow-lg"
                >
                  {month}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="pt-8"
          >
            <NavigationButton onClick={onNext} delay={0.2} />
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
