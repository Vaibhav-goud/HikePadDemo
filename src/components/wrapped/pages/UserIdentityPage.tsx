import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { useState, useEffect } from "react";
import { ChevronDown, Trophy, Target, Zap, ArrowUp } from "lucide-react";

interface UserIdentityPageProps {
  onNext?: () => void;
  currentUser: any;
  driveData: any[];
  isActive?: boolean;
  mouseX?: any;
  mouseY?: any;
  disableReveal?: boolean;
}

import { useTransform } from "framer-motion";

export default function UserIdentityPage({ currentUser, isActive, onNext, driveData, mouseX, mouseY, disableReveal }: UserIdentityPageProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const name = currentUser?.name || "Member";
  const role = currentUser?.role || "Team Member";
  const location = currentUser?.location || "Hike Education";
  const isLogoVersion = currentUser?.image === "/logo-transparent.png";

  useEffect(() => {
    // Reset revealed state when user changes
    setIsRevealed(false);
  }, [currentUser?.name, currentUser?.image]);

  useEffect(() => {
    if (isActive && isLogoVersion && !isRevealed) {
      const timer = setTimeout(() => {
        setIsRevealed(true);
      }, 500); // Small delay to let the page entry animation finish
      return () => clearTimeout(timer);
    }
  }, [isActive, isLogoVersion, isRevealed]);

  const bgX = useTransform(mouseX || { get: () => 0 }, (val: number) => val * -1.2);
  const bgY = useTransform(mouseY || { get: () => 0 }, (val: number) => val * -1.2);
  const fgX = useTransform(mouseX || { get: () => 0 }, (val: number) => val * 0.6);
  const fgY = useTransform(mouseY || { get: () => 0 }, (val: number) => val * 0.6);

  const handleImageClick = () => {
    if (disableReveal) {
        onNext?.();
        return;
    }
    setIsRevealed(true);
  };


  return (
    <PageTransition className="h-full w-full">
      <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden relative font-sans">
        {/* Background 2026 watermark */}
        {isActive && (
          <motion.div
            layoutId="year-2026"
            className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            style={{ x: bgX, y: bgY }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <div className="text-[30vw] md:text-[20vw] font-black text-black leading-none">
              2026
            </div>
          </motion.div>
        )}
        {/* Left Side: User Image (40-50%) */}
        <motion.div 
          className="w-full md:w-[45%] h-[50vh] md:h-full relative overflow-hidden cursor-pointer group"
          onClick={handleImageClick}
          initial={false}
          animate={isActive ? { x: 0, scale: 1, opacity: 1 } : { x: "-100vw", scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full h-full relative"
          >
            {/* Blurred Background Layer to fill space */}
            <motion.img
              src={currentUser?.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20"
            />
            
            
            {/* Main Contained Image for perfect fit */}
            <motion.img
              src={currentUser?.image}
              alt={name}
              className="relative w-full h-full object-contain z-10 p-4 md:p-8"
              animate={{
                filter: isRevealed ? "grayscale(0%)" : "grayscale(100%)",
                scale: isRevealed ? 1.05 : 1,
              }}
              transition={{ 
                filter: { delay: 0.6, duration: 0 },
                scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
              }}
              whileHover={{ scale: isRevealed ? 1.05 : 1.02 }}
            />

            {/* Picture Block Reveal Overlay */}
            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  initial={{ top: "0%", bottom: "100%" }}
                  animate={{ top: ["0%", "0%", "100%"], bottom: ["100%", "0%", "0%"] }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.76, 0, 0.24, 1], times: [0, 0.4, 1] }}
                  className="absolute inset-0 bg-white z-40 pointer-events-none"
                />
              )}
            </AnimatePresence>
          </motion.div>


          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#0a192f] opacity-80 pointer-events-none z-0" />
        </motion.div>

        {/* Right Side: User Details (50-60%) */}
        <motion.div 
          className="w-full md:w-[55%] h-[50vh] md:h-full flex flex-col justify-center px-8 md:px-20 relative z-10 overflow-y-auto no-scrollbar"
          initial={false}
          animate={isActive ? { x: 0, scale: 1, opacity: 1 } : { x: "-100vw", scale: 0.8, opacity: 0 }}
          style={{ x: fgX, y: fgY }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.05 }}
        >
          {isActive && (
            <motion.div
              layoutId="navy-bg"
              className="absolute inset-0 -z-10 bg-transparent"
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          )}

          <div className="max-w-3xl w-full">
            <div className="space-y-4 md:space-y-6 mb-8 md:mb-12">
              {/* Name - Multi Line Flexible */}
              <div className="min-h-[60px] md:min-h-[140px] lg:min-h-[220px] flex items-center py-2">
                <motion.h2
                  initial={{ opacity: 0, x: 50 }}
                  animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                  transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                  className="text-3xl md:text-5xl lg:text-[clamp(4.5rem,7vw,6.5rem)] font-black text-white leading-[0.85] tracking-tighter max-w-[95%] break-words uppercase"
                  title={name}
                >
                  {name}
                </motion.h2>
              </div>

              {/* Designation & Branch */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                className="space-y-2 border-l-2 border-white/20 pl-6"
              >
                <p className="text-lg md:text-2xl font-light text-white/80 tracking-wide uppercase leading-tight truncate">
                  {role}
                </p>
                <p className="text-sm md:text-base font-medium text-white/30 tracking-[0.2em] uppercase italic truncate">
                  {location}
                </p>
              </motion.div>
            </div>

            {/* Revealing Data */}
            <AnimatePresence>
              {isRevealed && (
                <motion.div className="relative">
                  {/* Block Motion Reveal for Data */}
                  <motion.div
                    initial={{ left: "0%", right: "100%" }}
                    animate={{ left: ["0%", "0%", "100%"], right: ["100%", "0%", "0%"] }}
                    transition={{ duration: 1, delay: 0.4, ease: [0.76, 0, 0.24, 1], times: [0, 0.4, 1] }}
                    className="absolute inset-0 bg-white z-20 pointer-events-none rounded-2xl"
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-8 md:space-y-12"
                  >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {driveData?.slice(0, 2).map((drive, idx) => (
                      <motion.div 
                        key={drive.driveName}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md"
                      >
                        <h3 className="text-xs text-white/40 uppercase tracking-[0.3em] font-black mb-6">{drive.driveName}</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-blue-400">
                              <Target className="w-3 h-3" />
                              <span className="text-[10px] uppercase font-bold tracking-widest">Adm</span>
                            </div>
                            <p className="text-3xl font-black text-white">{drive.totalClosed}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-yellow-500">
                              <Zap className="w-3 h-3" />
                              <span className="text-[10px] uppercase font-bold tracking-widest">Pts</span>
                            </div>
                            <p className="text-3xl font-black text-white">{drive.totalPoints}</p>
                          </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                           <span className="text-[10px] text-white/30 uppercase tracking-widest">Achievement</span>
                           <span className="text-xl font-bold text-white tracking-tighter">{drive.achievementPercent}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    onClick={onNext}
                    className="flex flex-col items-center gap-4 text-white hover:text-blue-400 transition-all group mx-auto"
                  >
                    <span className="text-[10px] uppercase font-black tracking-[0.5em] text-white/40 group-hover:text-blue-400/80 transition-colors">Continue Journey</span>
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                      <ChevronDown className="w-5 h-5 text-white group-hover:text-blue-400 transition-colors" />
                    </motion.div>
                  </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hint Text */}
          <div className="absolute bottom-12 left-[45%] -translate-x-1/2 z-20">
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isActive && !isRevealed 
                ? { opacity: 0.8, scale: 1, y: [0, 5, 0] } 
                : { opacity: 0, scale: 0.9 }
              }
              transition={isActive && !isRevealed 
                ? { 
                    opacity: { duration: 0.5 },
                    scale: { duration: 0.5 },
                    y: { repeat: Infinity, duration: 2, ease: "easeInOut" } 
                  }
                : { duration: 0.3 }
              }
              className="text-sm md:text-xl text-white/50 uppercase tracking-[0.6em] font-black whitespace-nowrap text-center italic"
            >
              Click on the picture
            </motion.p>
          </div>

          {/* Minimal Bottom Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 0.2 } : { opacity: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="absolute bottom-12 right-12 hidden md:block"
          >
            <p className="text-[8px] font-mono tracking-[0.8em] uppercase vertical-rl text-white">
              S-2026 // IDENTITY
            </p>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
