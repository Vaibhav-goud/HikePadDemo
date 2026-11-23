import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedTextProps {
  children: string;
  className?: string;
  delay?: number;
  stagger?: boolean;
}

export function AnimatedText({
  children,
  className = "",
  delay = 0,
  stagger = false,
}: AnimatedTextProps) {
  if (!stagger) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  const words = children.split(" ");

  return (
    <div className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.05,
            ease: "easeOut",
          }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function GradientText({
  children,
  className = "",
  delay = 0,
}: GradientTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay, ease: "easeOut" }}
      className={`bg-gradient-to-r from-white via-yellow-500 to-white bg-clip-text text-transparent ${className}`}
      style={{
        backgroundSize: "200% 100%",
      }}
    >
      <motion.div
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundImage: "linear-gradient(90deg, #ffffff, #eab308, #ffffff)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

interface ScaleTextProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScaleText({
  children,
  className = "",
  delay = 0,
}: ScaleTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotateX: -20 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{
        duration: 1,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface GlowTextProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function GlowText({
  children,
  className = "",
  delay = 0,
}: GlowTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      className={`relative ${className}`}
    >
      <motion.div
        animate={{
          textShadow: [
            "0 0 20px rgba(234, 179, 8, 0.3)",
            "0 0 40px rgba(234, 179, 8, 0.6)",
            "0 0 20px rgba(234, 179, 8, 0.3)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
