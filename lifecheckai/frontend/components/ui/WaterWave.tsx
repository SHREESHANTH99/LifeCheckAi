import React from "react";
import { motion } from "framer-motion";

interface WaterWaveProps {
  percentage: number;
  isDrinkable: boolean;
  size?: number;
}

export const WaterWave: React.FC<WaterWaveProps> = ({ percentage, isDrinkable, size = 160 }) => {
  // Clamp percentage between 0 and 100
  const fillLevel = Math.max(0, Math.min(100, percentage));
  
  // Calculate top margin to simulate fill level
  // 0% -> top: 100%
  // 100% -> top: 0%
  const topPosition = 100 - fillLevel;

  const waterColor = isDrinkable 
    ? "bg-gradient-to-t from-safe via-safe/80 to-safe/50" 
    : "bg-gradient-to-t from-unsafe via-unsafe/80 to-unsafe/50";
  
  const glassBorder = isDrinkable ? "border-safe/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "border-danger/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]";

  return (
    <div 
      className={`relative rounded-full overflow-hidden border-4 ${glassBorder} mx-auto glass`} 
      style={{ width: size, height: size }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-white/5" />

      {/* Water Fill Layer */}
      <motion.div
        initial={{ top: "100%" }}
        animate={{ top: `${topPosition}%` }}
        transition={{ duration: 1.5, type: "spring", stiffness: 40 }}
        className="absolute left-[-50%] right-[-50%] bottom-0"
        style={{ height: "200%" }}
      >
        {/* Wave 1 */}
        <motion.div
          animate={{ x: ["0%", "-25%"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className={`absolute inset-0 opacity-40 rounded-[40%] ${waterColor}`}
          style={{ transformOrigin: "50% 50%" }}
        />
        {/* Wave 2 */}
        <motion.div
          animate={{ x: ["-25%", "0%"] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className={`absolute inset-0 opacity-60 rounded-[45%] ${waterColor}`}
          style={{ transformOrigin: "50% 50%", transform: "scale(1.05)" }}
        />
        {/* Fill Body */}
        <div className={`absolute top-4 inset-x-0 bottom-0 ${waterColor} opacity-90`} />
      </motion.div>

      {/* Foreground Value Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none mix-blend-difference pb-2">
        <span className="text-3xl font-bold font-mono text-white tracking-widest">{Math.round(percentage)}%</span>
        <span className="text-[10px] uppercase font-bold text-white/80 tracking-widest leading-none mt-1">Drinkable</span>
      </div>
    </div>
  );
};
