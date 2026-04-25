import { ReactNode } from "react";
import { useTheme } from "./ThemeContext";
import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  isMobileMenuOpen: boolean;
  onMobileMenuChange: (open: boolean) => void;
}

export function Layout({ children, sidebar, isMobileMenuOpen, onMobileMenuChange }: LayoutProps) {
  const { theme } = useTheme();

  return (
    <div className={`flex h-screen w-full overflow-hidden bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-white/90 transition-colors duration-300`}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[260px] h-full flex-shrink-0 bg-light-sidebar dark:bg-dark-sidebar border-r border-gray-200 dark:border-white/5">
        {sidebar}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onMobileMenuChange(false)}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-light-sidebar dark:bg-dark-sidebar md:hidden shadow-xl"
            >
              {sidebar}
              <button 
                onClick={() => onMobileMenuChange(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden"
              >
                <X size={20} />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/5 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-md z-20">
          <button onClick={() => onMobileMenuChange(true)}>
            <Menu size={24} />
          </button>
          <span className="font-bold tracking-tight text-accent">Synapse</span>
          <div className="w-8" /> {/* Spacer */}
        </header>

        {children}
      </main>
    </div>
  );
}
