import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";
import { GlowText, AnimatedText } from "../components/AnimatedText";
import { useEffect, useRef } from "react";

interface StatementPageProps { onNext?: () => void; isActive?: boolean; userImageMap?: Record<string, string>; }

const MemoryFrame = ({ name, index, isActive, style, src }: { name: string, index: number, isActive: boolean, style?: any, src?: string }) => {
  const rotation = index % 2 === 0 ? (index + 1) * 3 : -(index + 1) * 3;

  const handleOpenImage = () => {
    if (src) window.open(src, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: 0, y: 100 }}
      animate={isActive ? {
        opacity: 1,
        scale: 1,
        rotate: rotation,
        y: 0,
        transition: {
          duration: 1.2,
          delay: 0.2 + index * 0.15,
          ease: [0.16, 1, 0.3, 1]
        }
      } : { opacity: 0, scale: 0.8, rotate: 0, y: 100 }}
      whileHover={{
        scale: 1.05,
        rotate: rotation / 2,
        zIndex: 50,
        transition: { duration: 0.4 }
      }}
      onClick={handleOpenImage}
      className={`absolute bg-white p-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 backdrop-blur-md group overflow-hidden ${src ? 'cursor-pointer' : 'cursor-default'}`}
      style={{
        width: 'min(520px, 40vw)',
        aspectRatio: '520 / 380',
        ...style
      }}
    >
      <div className="w-full h-full bg-stone-100 overflow-hidden relative group-hover:filter group-hover:brightness-110 transition-all">
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stone-300 font-black text-xs uppercase tracking-tighter">
            EMPTY FRAME
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {src && <span className="text-white font-black text-xs uppercase tracking-[0.2em] bg-black/40 px-4 py-2 rounded-full backdrop-blur-md scale-0 group-hover:scale-100 transition-transform">View Full Picture</span>}
        </div>
      </div>
      <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all" />
    </motion.div>
  );
};

export default function StatementPage({ onNext, isActive = false, userImageMap = {} }: StatementPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setSize();
    window.addEventListener('resize', setSize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
      });
    }

    let animationId: number;

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fill();

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', setSize);
    };
  }, []);

  const hydImages = [
    { name: "hyd1", style: { left: '2%', top: '5%', rotate: '-3deg' } },
    { name: "hyd2", style: { left: '16%', top: '15%', rotate: '2deg' } },
    { name: "hyd3", style: { left: '2%', bottom: '5%', rotate: '4deg' } },
    { name: "hyd4", style: { left: '16%', bottom: '15%', rotate: '-5deg' } },
  ];
  const mumImages = [
    { name: "mum1", style: { right: '2%', top: '5%', rotate: '3deg' } },
    { name: "mum2", style: { right: '16%', top: '15%', rotate: '-2deg' } },
    { name: "mum3", style: { right: '2%', bottom: '5%', rotate: '-4deg' } },
    { name: "mum4", style: { right: '16%', bottom: '15%', rotate: '5deg' } },
  ];

  return (
    <PageTransition>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
      />

      <div className="relative z-10 h-screen flex items-center justify-center overflow-hidden w-full py-10">
        {/* HYD Collage */}
        {hydImages.map((img, i) => (
          <div key={img.name} className="hidden lg:block overflow-visible">
            <MemoryFrame
              name={img.name}
              index={i}
              isActive={isActive}
              style={img.style}
              src={userImageMap[img.name.toLowerCase().trim()]}
            />
          </div>
        ))}

        {/* MUM Collage */}
        {mumImages.map((img, i) => (
          <div key={img.name} className="hidden lg:block overflow-visible">
            <MemoryFrame
              name={img.name}
              index={i}
              isActive={isActive}
              style={img.style}
              src={userImageMap[img.name.toLowerCase().trim()]}
            />
          </div>
        ))}

        {/* Mobile Collage (Simpler/Smaller) */}
        <div className="absolute inset-0 flex lg:hidden items-center justify-center opacity-20 pointer-events-none">
          <div className="relative w-full h-full overflow-visible">
            <MemoryFrame
              name="hyd1"
              index={0}
              isActive={isActive}
              style={{ left: '10%', top: '20%', scale: 0.6 }}
              src={userImageMap["hyd1"]}
            />
            <MemoryFrame
              name="mum1"
              index={1}
              isActive={isActive}
              style={{ right: '10%', bottom: '20%', scale: 0.6 }}
              src={userImageMap["mum1"]}
            />
          </div>
        </div>

        <div className="relative z-30 text-center max-w-3xl px-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5 }}
            className="select-none"
          >
            <AnimatedText
              stagger
              delay={0.5}
              className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-[0.85] mb-8 italic tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              Together we Dominate and Hunt
            </AnimatedText>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, delay: 1.5 }}
              className="h-[3px] bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto max-w-md mb-12 shadow-[0_0_20px_rgba(96,165,250,0.6)]"
            />

            <div className="bg-black/20 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/10 inline-block">
              <GlowText delay={2} className="text-base md:text-xl text-white uppercase tracking-[0.4em] font-black italic">
                United in purpose, relentless in pursuit
              </GlowText>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 3 }}
            className="mt-20 pointer-events-auto"
          >
            <NavigationButton onClick={onNext} delay={0.2} />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
