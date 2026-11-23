import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface StatBlockProps {
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
  isActive?: boolean;
}

export function StatBlock({ label, value, suffix = "", delay = 0, isActive }: StatBlockProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isActive) {
      count.set(0); // Reset to zero
      const controls = animate(count, value, {
        duration: 2,
        delay: delay + 0.5, // Added extra delay to wait for page transition
        ease: [0.16, 1, 0.3, 1], // Better elastic ease
      });
      return controls.stop;
    }
  }, [isActive, count, value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.8, delay }}
      className="text-center md:text-left flex flex-col items-center md:items-start"
    >
      <div className="text-6xl md:text-8xl font-black text-white mb-3 tracking-tighter tabular-nums">
        <motion.span>{rounded}</motion.span>
        {suffix && <span className="text-3xl md:text-5xl ml-1 text-white/40">{suffix}</span>}
      </div>
      <div className="text-xs md:text-sm text-white/30 uppercase tracking-[0.4em] font-bold">
        {label}
      </div>
    </motion.div>
  );
}
