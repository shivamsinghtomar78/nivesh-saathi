"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type RevealDirection = "up" | "down" | "left" | "right";

const easeOut = [0.22, 1, 0.36, 1] as const;

export function MotionReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 22,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  distance?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      data-motion-direction={direction}
      data-motion-distance={distance}
      initial={false}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.28, margin: "0px 0px -80px" }}
      transition={{ duration: 0.58, ease: easeOut, delay }}
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={{ once: true, amount: 0.28 }}
      variants={{
        hidden: {},
        show: {
          transition: {
            delayChildren: delay,
            staggerChildren: 0.08,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 1, y: 0 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: easeOut },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionHover({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}

export function MotionFloat({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
      transition={
        reduceMotion
          ? undefined
          : {
              opacity: { duration: 0.55, ease: easeOut },
              scale: { duration: 0.55, ease: easeOut },
              y: {
                duration: 5.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.6,
              },
            }
      }
    >
      {children}
    </motion.div>
  );
}
