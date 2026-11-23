import { motion } from "framer-motion";

interface UserCardProps {
  image: string;
  name?: string;
  delay?: number;
  className?: string;
  showShadow?: boolean;
}

export function UserCard({
  image,
  name,
  delay = 0,
  className = "",
  showShadow = true,
}: UserCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50, rotateY: -10 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      whileHover={{ scale: 1.05, rotateY: 5 }}
      className={`relative ${className}`}
      style={{ perspective: 1000 }}
    >
      <div
        className={`aspect-[2/3] rounded-lg overflow-hidden ${
          showShadow ? "shadow-2xl" : ""
        }`}
      >
        <img
          src={image}
          alt={name || "User"}
          className="w-full h-full object-cover"
        />
      </div>
      {name && (
        <p className="mt-3 text-center font-medium text-neutral-800">{name}</p>
      )}
    </motion.div>
  );
}
