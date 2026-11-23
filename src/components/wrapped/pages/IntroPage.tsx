import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";
import { AnimatedText, GlowText } from "../components/AnimatedText";
import { useEffect, useState } from "react";

interface IntroPageProps { onNext?: () => void; isActive?: boolean; mouseX?: any; mouseY?: any; }

import { useTransform } from "framer-motion";

export default function IntroPage({ onNext, isActive, mouseX, mouseY }: IntroPageProps) {
  const [showTypewriter, setShowTypewriter] = useState(false);

  // Parallax offsets
  const bgX = useTransform(mouseX || { get: () => 0 }, (val: number) => val * -1.5);
  const bgY = useTransform(mouseY || { get: () => 0 }, (val: number) => val * -1.5);
  const fgX = useTransform(mouseX || { get: () => 0 }, (val: number) => val * 0.8);
  const fgY = useTransform(mouseY || { get: () => 0 }, (val: number) => val * 0.8);

  useEffect(() => {
    const timer = setTimeout(() => setShowTypewriter(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PageTransition>
      <div className="relative h-screen flex flex-col items-center justify-center px-6 md:px-12 overflow-hidden">
        {/* Background 2026 watermark */}
        {isActive && (
          <motion.div
            layoutId="year-2026"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 0.4, y: 0 }}
            style={{ x: bgX, y: bgY }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute right-0 bottom-0 pointer-events-none z-0"
          >
            <div className="text-[45vw] md:text-[35vw] font-black leading-none tracking-tighter text-black select-none text-right">
              2026
            </div>
          </motion.div>
        )}

        {/* Top-center branding */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
          {isActive && (
            <motion.div
              layoutId="navy-bg"
              initial={{ scaleX: 0, transformOrigin: "center" }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="bg-[#0a192f] px-6 py-3"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl md:text-3xl font-oxygen font-black uppercase tracking-[0.3em] text-white whitespace-nowrap"
              >
                Dominators | Hunters
              </motion.p>
            </motion.div>
          )}
        </div>

        {/* Main content */}
        <motion.div
          style={{ x: fgX, y: fgY }}
          className="relative z-10 max-w-4xl text-center space-y-8"
        >
          <AnimatedText
            stagger
            delay={0.3}
            className="text-3xl md:text-5xl lg:text-6xl leading-tight text-white px-4 font-oxygen font-bold"
          >
            This year was full of ups and downs, and full of surprises and here we are...
          </AnimatedText>

          {showTypewriter && (
            <GlowText delay={0} className="text-xl md:text-2xl text-blue-200 font-oxygen font-black tracking-tight">
              <TypewriterText text="Your year here, quantified in numbers" />
            </GlowText>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 2.5 }}
            className="pt-8"
          >
            <NavigationButton onClick={onNext} label="Begin Journey" delay={0.2} />
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayText}</span>;
}
