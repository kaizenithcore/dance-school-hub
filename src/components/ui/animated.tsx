import { motion } from "framer-motion";

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
  animateOnMount?: boolean;
}

export function AnimatedPage({ children, className, animateOnMount = true }: AnimatedPageProps) {
  return (
    <motion.div
      initial={animateOnMount ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedPageProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
