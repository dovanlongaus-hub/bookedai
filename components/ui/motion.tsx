"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
} & HTMLMotionProps<"div">;

export function FadeIn({
  children,
  className,
  delay = 0,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute left-[-12rem] top-[-14rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.28),transparent_62%)] blur-3xl"
        animate={{ x: [0, 70, -20, 0], y: [0, 40, 10, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10rem] top-[10rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.18),transparent_60%)] blur-3xl"
        animate={{ x: [0, -60, 10, 0], y: [0, -35, 20, 0], scale: [1, 0.92, 1.04, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-12rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18),transparent_62%)] blur-3xl"
        animate={{ x: [0, 40, -35, 0], y: [0, -20, -60, 0], scale: [1, 1.05, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,16,32,0.92)_0%,rgba(11,16,32,0.98)_100%)]" />
    </div>
  );
}
