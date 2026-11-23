import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";


interface HRTeamPageProps {
  onNext?: () => void;
  hrTeam: any[];
  isActive?: boolean;
}

export default function HRTeamPage({ onNext, hrTeam, isActive }: HRTeamPageProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, x: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" as const }
    }
  };

  return (
    <PageTransition>
      <div className="h-screen flex flex-col items-center justify-start px-2 md:px-4 pt-12 pb-5 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24 max-w-4xl"
        >
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6 italic tracking-tighter drop-shadow-2xl">
            HR
          </h2>
          <p className="text-xl md:text-2xl font-bold uppercase tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-600 font-black italic">
            Empowering the People Who Power Hike
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap md:flex-nowrap items-center justify-center gap-8 md:gap-16 w-full max-w-6xl px-4"
          variants={containerVariants}
          initial="hidden"
          animate={isActive ? "visible" : "hidden"}
        >
          {hrTeam.map((member, index) => (
            <motion.div
              key={member.id}
              variants={itemVariants}
              whileHover={{ scale: 1.08, y: -12 }}
              className="text-center flex-1 max-w-[240px] md:max-w-[320px] lg:max-w-[380px] min-w-0"
            >
              <div className="w-full aspect-[2/3] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 relative group mb-6">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <h3 className="font-black text-lg md:text-2xl text-white uppercase tracking-tight mt-4 mb-1 truncate px-1">
                {member.name}
              </h3>
              {member.designation && (
                <p className="text-xs md:text-sm text-white/50 font-semibold uppercase tracking-widest">
                  {member.designation}
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12">
          <NavigationButton onClick={onNext} delay={1.5} />
        </div>
      </div>
    </PageTransition>
  );
}
