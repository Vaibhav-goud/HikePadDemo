import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";


interface CreditsPageProps { 
  onNext?: () => void; 
  credits: any[]; 
  isActive?: boolean;
}

export default function CreditsPage({ onNext, credits, isActive }: CreditsPageProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = (index: number) => ({
    hidden: { 
      opacity: 0, 
      scale: 0.6, 
      x: index === 0 ? -250 : 250,
      rotate: index === 0 ? -15 : 15
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      x: 0,
      rotate: 0,
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 100
      }
    }
  });

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 md:px-8 py-20 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24 max-w-4xl"
        >
          <h2 className="text-5xl md:text-7xl font-doto font-black text-white mb-6 italic tracking-tighter drop-shadow-2xl">
            CREDITS
          </h2>
          <p className="text-xl md:text-2xl font-bold uppercase tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-purple-500">
            The minds behind the magic.
          </p>
        </motion.div>

        <motion.div 
          className="flex flex-wrap items-center justify-center gap-8 md:gap-16 w-full max-w-6xl px-4"
          variants={containerVariants}
          initial="hidden"
          animate={isActive ? "visible" : "hidden"}
        >
          {credits.map((member, index) => (
            <motion.div
              key={member.id}
              variants={itemVariants(index)}
              whileHover={{ 
                scale: 1.05, 
                y: -10,
                rotate: index === 0 ? -2 : 2,
                transition: { duration: 0.3 }
              }}
              className="text-center flex-1 max-w-[240px] md:max-w-[320px] lg:max-w-[400px] min-w-0"
            >
              <div className="w-full aspect-[4/5] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 relative group mb-6">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <h3 className="font-black text-lg md:text-2xl text-white uppercase tracking-tight mt-4 mb-1.5 truncate px-1">
                {member.name}
              </h3>
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
