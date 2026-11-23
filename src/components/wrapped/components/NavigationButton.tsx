import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface NavigationButtonProps {
  onClick?: () => void;
  label?: string;
  delay?: number;
}

export function NavigationButton({
  onClick,
  label = "Continue",
  delay = 0,
}: NavigationButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      onClick={onClick}
      className="group flex flex-col items-center gap-2 transition-all duration-300"
    >
      <span className="text-[10px] md:text-sm uppercase tracking-[0.5em] font-black text-white/40 group-hover:text-white/80 transition-colors">
        {label}
      </span>
      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="p-3 bg-white/5 rounded-full border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all"
      >
        <ChevronDown className="w-5 h-5 text-white" />
      </motion.div>
    </motion.button>
  );
}
