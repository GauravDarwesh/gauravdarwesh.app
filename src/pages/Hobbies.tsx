"use client";

import React, { useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { motion, AnimatePresence } from "framer-motion";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-white/5 transition-colors"
      >
        <h2 className="text-xl sm:text-2xl font-semibold">{title}</h2>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.3 }}
          className="ml-2 text-lg"
        >
          ▶
        </motion.span>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="px-6 pb-6 text-sm sm:text-base leading-relaxed space-y-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Portfolio = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden text-white">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Main Content */}
      <div className="relative z-10 max-w-3xl w-full px-4 sm:px-6 md:px-8 space-y-8 pt-20 sm:pt-28">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold">
            Gaurav Darwesh
          </h1>
          <div className="flex flex-wrap gap-4 justify-center text-white/80">
            <a href="mailto:gauravdarwesh155@gmail.com">mail/</a>
            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank">
              in/
            </a>
            <a href="https://twitter.com/gaurav11darwesh" target="_blank">
              twitter/
            </a>
            <a href="https://instagram.com/allaboutgaurav" target="_blank">
              instagram/
            </a>
          </div>
        </div>

        {/* About Section */}
        <p className="text-base sm:text-lg leading-relaxed text-white/90 bg-black/40 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/10">
          I am a Cambridge University graduate in Strategic Business and
          Management, with a Bachelor of Engineering in Computer Science (AIML)
          from the University of Mumbai. Currently working at Nasdaq, with prior
          experience at notable MNC like Jio. Proficient in Jira, Salesforce,
          ServiceNow, Planhat, Power BI, and Excel, I specialize in developing
          innovative solutions that drive business growth and operational
          efficiency.
        </p>

        {/* Floating Expandable Sections */}
        <Section title="Education">
          {/* Your Education content here */}
        </Section>

        <Section title="Experience">
          {/* Your Experience content here */}
        </Section>

        <Section title="Recommendations">
          {/* Your Recommendations content here */}
        </Section>

        <Section title="Languages / Skills / Awards / Extracurriculars">
          {/* Your Skills content here */}
        </Section>
      </div>
    </div>
  );
};

export default Portfolio;
