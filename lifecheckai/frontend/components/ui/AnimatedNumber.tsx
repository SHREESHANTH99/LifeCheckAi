"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  toFixed?: number;
}

export function AnimatedNumber({ value, className = "", toFixed = 0 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10px" });
  const springValue = useSpring(0, {
    stiffness: 60,
    damping: 20,
    mass: 1,
  });

  const display = useTransform(springValue, (current) => 
    toFixed > 0 ? current.toFixed(toFixed) : Math.round(current).toString()
  );

  useEffect(() => {
    if (isInView) {
      springValue.set(value);
    }
  }, [isInView, value, springValue]);

  return <motion.span ref={ref} className={className}>{display}</motion.span>;
}
