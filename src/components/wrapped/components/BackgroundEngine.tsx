import React from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';

interface RibbonStrandsProps {
  count: number;
  strokeWidth: number;
  startY: number;
  strokeUrl: string;
  duration: number;
  flip?: boolean;
}

const RibbonStrands: React.FC<RibbonStrandsProps> = ({ count, strokeWidth, startY, strokeUrl, duration, flip = false }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        // Tighter overlay prevents rendering gaps
        const offset = i * (strokeWidth - 2); 
        
        const d1 = flip 
          ? `M -200 ${startY + offset} C 200 ${startY + 1500 + offset}, 800 ${startY - 800 + offset}, 1400 ${startY + offset}`
          : `M -200 ${startY + offset} C 400 ${startY - 1200 + offset}, 700 ${startY + 1200 + offset}, 1400 ${startY + offset}`;
        
        const d2 = flip 
          ? `M -200 ${startY + offset + 200} C 300 ${startY + 800 + offset}, 900 ${startY - 200 + offset}, 1400 ${startY + offset + 200}`
          : `M -200 ${startY + offset - 200} C 500 ${startY - 600 + offset}, 600 ${startY + 600 + offset}, 1400 ${startY + offset - 200}`;

        return (
          <React.Fragment key={i}>
            {/* Cheap Shadow Layer (Runs 100x faster than SVG drop-shadow filters) */}
            <motion.path
              animate={{ d: [d1, d2, d1] }}
              transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={strokeWidth}
              strokeLinecap="square"
              style={{ transform: "translate(-8px, 15px)" }} 
            />
            {/* Super Fast Main Color Layer */}
            <motion.path
              animate={{ d: [d1, d2, d1] }}
              transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
              fill="none"
              stroke={strokeUrl}
              strokeWidth={strokeWidth}
              strokeLinecap="square"
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

interface BackgroundEngineProps {
  scrollYProgress: any;
  isHustlersPage?: boolean;
}

export default function BackgroundEngine({ scrollYProgress, isHustlersPage }: BackgroundEngineProps) {
  // A performant static dark background color mapping
  const bgMain = useTransform(scrollYProgress, [0, 0.5, 1], ['#05020a', '#080512', '#020005']);

  return (
    <motion.div 
      className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center"
      style={{ backgroundColor: bgMain }}
    >
      {/* 
        High Performance Texture
        Instead of using expensive 'mix-blend-dodge', we use standard alpha blending 'opacity-[0.06]'.
        This completely eliminates the massive frame-by-frame recoloring lag, while preserving the 'crystal' look.
      */}
      <div 
        className="absolute inset-0 z-20 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(60deg, transparent, transparent 30px, #ffffff 30px, #ffffff 60px),
            repeating-linear-gradient(-60deg, transparent, transparent 30px, #ffffff 30px, #ffffff 60px)
          `
        }}
      />
      
      <div className="absolute inset-0 z-10 opacity-[0.08] pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')] bg-repeat" />

      {/* 
        Optimized SVG
        Removed 'rotate: 360' from the <svg> element itself. Rotating a 250vw SVG repaints drastically.
        Just letting the 'd' paths undulate is incredibly fluid and lightweight.
      */}
      <svg className="absolute w-[200vw] h-[200vh] min-w-[1300px]" viewBox="0 0 1200 1200" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="cyanMagenta" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4cc9f0" />    
            <stop offset="40%" stopColor="#f72585" />   
            <stop offset="70%" stopColor="#7b2cbf" />   
            <stop offset="100%" stopColor="#0a0514" />  
          </linearGradient>

          <linearGradient id="crimsonBlue" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff0040" />    
            <stop offset="35%" stopColor="#9d4edd" />   
            <stop offset="65%" stopColor="#00b4d8" />   
            <stop offset="100%" stopColor="#000428" />  
          </linearGradient>

          <linearGradient id="pinkNavy" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#03045e" />    
            <stop offset="40%" stopColor="#ff0a54" />   
            <stop offset="75%" stopColor="#c77dff" />   
            <stop offset="100%" stopColor="#000000" />  
          </linearGradient>

          <linearGradient id="blackShades" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0a0a" />    
            <stop offset="25%" stopColor="#1a1a1a" />   
            <stop offset="50%" stopColor="#000000" />   
            <stop offset="75%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#050505" />  
          </linearGradient>
        </defs>

        {/* --- Lightweight Ribbon Clusters --- */}
        
        {/* Colorful Set - Fades out when Hustlers is ready */}
        <motion.g 
          animate={{ opacity: isHustlersPage ? 0 : 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <g style={{ transform: "translate(-5%, -5%)" }}>
            <RibbonStrands count={12} strokeWidth={60} startY={250} strokeUrl="url(#crimsonBlue)" duration={30} />
          </g>
          <g style={{ transform: "translate(5%, 5%)" }}>
            <RibbonStrands count={10} strokeWidth={75} startY={700} strokeUrl="url(#cyanMagenta)" duration={35} flip={true} />
          </g>
          <g style={{ transform: "translate(0%, 0%)" }}>
            <RibbonStrands count={8} strokeWidth={90} startY={450} strokeUrl="url(#pinkNavy)" duration={28} />
          </g>
        </motion.g>

        {/* Black Set - Fades in when Hustlers is ready */}
        <motion.g 
          initial={{ opacity: 0 }}
          animate={{ opacity: isHustlersPage ? 1 : 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <g style={{ transform: "translate(-5%, -5%)" }}>
            <RibbonStrands count={12} strokeWidth={60} startY={250} strokeUrl="url(#blackShades)" duration={30} />
          </g>
          <g style={{ transform: "translate(5%, 5%)" }}>
            <RibbonStrands count={10} strokeWidth={75} startY={700} strokeUrl="url(#blackShades)" duration={35} flip={true} />
          </g>
          <g style={{ transform: "translate(0%, 0%)" }}>
            <RibbonStrands count={8} strokeWidth={90} startY={450} strokeUrl="url(#blackShades)" duration={28} />
          </g>
        </motion.g>

      </svg>
    </motion.div>
  );
}
