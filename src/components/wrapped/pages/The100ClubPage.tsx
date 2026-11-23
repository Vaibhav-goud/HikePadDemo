import { motion } from "framer-motion";
import { PageTransition } from "../components/PageTransition";
import { NavigationButton } from "../components/NavigationButton";


interface The100ClubPageProps { onNext?: () => void; club100Members: any[]; isActive?: boolean; }

export default function The100ClubPage({ onNext, club100Members, isActive }: The100ClubPageProps) {
  return (
    <PageTransition className="h-full w-full flex items-center justify-center overflow-y-auto no-scrollbar">
      <div className="min-h-full w-full relative flex flex-col items-center justify-center py-10 no-scrollbar">

        {/* Simplified and Centered Background Tickers */}
        <div className="absolute inset-y-0 left-0 w-[120px] md:w-[200px] overflow-hidden pointer-events-none z-0 select-none flex items-center justify-start opacity-[0.12]">
          <motion.div
            animate={{ y: ['-50%', '0%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex flex-col gap-16 py-4 items-center"
          >
            {[...Array(20)].map((_, i) => (
              <span key={i} className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-widest text-white leading-none whitespace-nowrap">
                WIN
              </span>
            ))}
          </motion.div>
        </div>

        <div className="absolute inset-y-0 right-0 w-[120px] md:w-[200px] overflow-hidden pointer-events-none z-0 select-none flex items-center justify-end opacity-[0.12]">
          <motion.div
            animate={{ y: ['0%', '-50%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex flex-col gap-16 py-4 items-center"
          >
            {[...Array(20)].map((_, i) => (
              <span key={i} className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-widest text-white leading-none whitespace-nowrap">
                WIN
              </span>
            ))}
          </motion.div>
        </div>

        {/* Spotlight effect */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.1, scale: 1.5 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-[800px] h-[800px] bg-yellow-400 rounded-full blur-[150px] opacity-20" />
        </motion.div>

        {/* Main Center-Anchored Content Container */}
        <div className="relative z-10 w-full h-full max-w-[1400px] px-4 md:px-20 lg:px-32 flex flex-col items-center justify-center py-6 md:py-8 lg:py-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
            transition={{ duration: 1 }}
            className="text-center w-full mb-16 md:mb-24"
          >
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-2 md:mb-4 uppercase tracking-tighter leading-tight w-full break-words max-w-[95vw]">
              The 100 Club
            </h2>
            <div className="h-1 w-24 bg-yellow-400 mx-auto mb-4 md:mb-6 rounded-full" />
            <p className="text-[10px] md:text-sm lg:text-base text-neutral-400 font-bold uppercase tracking-[0.4em] max-w-2xl mx-auto">
              Elite performers with 100 closed admissions or more
            </p>
          </motion.div>

          {/* Grid for Elite Members - Centered with max-w */}
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 w-full max-w-6xl mb-4 md:mb-6 py-2 px-2">
            {club100Members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.5 + index * 0.08,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={{ scale: 1.05, y: -10 }}
                className={`group relative flex-shrink-0 min-w-0 ${club100Members.length === 1 ? 'w-64 md:w-80 lg:w-96 xl:w-[400px]' : 'w-24 md:w-36 lg:w-44'}`}
              >
                <div className={`aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 group-hover:ring-yellow-400/50 transition-all duration-300`}>
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className={`absolute bottom-0 left-0 right-0 p-4 ${club100Members.length === 1 ? 'md:p-6 text-center' : 'md:p-4 text-left'} text-neutral-50`}>
                    <h3 className={`font-bold truncate mb-1 tracking-wide uppercase ${club100Members.length === 1 ? 'text-2xl md:text-3xl xl:text-4xl mb-1' : 'text-[10px] md:text-sm'}`}>{member.name}</h3>
                    <div className={`flex items-center gap-3 font-black text-yellow-500 tracking-wider ${club100Members.length === 1 ? 'text-sm md:text-lg xl:text-xl justify-center gap-3' : 'text-[8px] md:text-[11px]'}`}>
                      <span className="flex items-center gap-1">Admissions: {member.admissions}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0 }}
            transition={{ delay: 2 }}
            className="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-50 flex"
          >
            <NavigationButton onClick={onNext} delay={0} />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
