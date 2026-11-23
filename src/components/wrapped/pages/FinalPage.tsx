import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { AnimatedText, ScaleText } from "../components/AnimatedText";
import { RotateCcw } from "lucide-react";

interface FinalPageProps { onNext?: () => void; }

export default function FinalPage({ onNext }: FinalPageProps) {

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 2.5, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden"
        >
          <ScaleText delay={0} className="text-[45vw] md:text-[35vw] font-black leading-none tracking-tighter text-white/[0.03] select-none text-center">
            2026
          </ScaleText>
        </motion.div>

        <div className="relative z-10 max-w-5xl text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5 }}
          >
            <AnimatedText
              stagger
              delay={0}
              className="text-4xl md:text-6xl lg:text-7xl font-oxygen font-bold text-white leading-tight mb-8 px-4"
            >
              We made it through this year.
            </AnimatedText>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, delay: 1 }}
              className="h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto max-w-md mb-8"
            />
          </motion.div>

          <AnimatedText
            stagger
            delay={1.5}
            className="text-xl md:text-2xl font-oxygen text-white/70 px-4"
          >
            Here's to all the hurdles we have overcome — and new the feats to achieve.
          </AnimatedText>



          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 3 }}
            onClick={onNext}
            className="group flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full hover:bg-neutral-200 transition-colors mx-auto font-bold"
          >
            <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-sm uppercase tracking-wider">
              Experience Again
            </span>
          </motion.button>
        </div>

        {/* Credits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 4 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 text-white/35 text-sm md:text-base font-black uppercase tracking-[0.3em] italic whitespace-nowrap"
        >
          Designed by Vaibhav
        </motion.div>
      </div>
    </PageTransition>
  );
}
