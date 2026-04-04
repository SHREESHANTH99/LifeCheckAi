"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import {
  Wind,
  CloudLightning,
  Flower2,
  Sparkles,
  MapPin,
  BarChart3,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const popularCities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata"];

const features = [
  {
    icon: <Wind size={24} />,
    color: "text-accent-cyan",
    bg: "bg-accent-cyan/10",
    title: "Air Quality",
    description: "Real-time AQI from Google Air Quality API with pollutant breakdown",
  },
  {
    icon: <CloudLightning size={24} />,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    title: "Weather Safety",
    description: "Heat, storm, UV risk detection and condition monitoring",
  },
  {
    icon: <Flower2 size={24} />,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    title: "Pollen Levels",
    description: "Allergy risk by pollen type — tree, grass, and weed tracking",
  },
  {
    icon: <Sparkles size={24} />,
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
    title: "AI Assistant",
    description: "Ask safety questions in plain English, powered by Gemini",
  },
];

const steps = [
  { num: 1, icon: <MapPin size={24} />, title: "Enter Your City", desc: "Type any city name to get started" },
  { num: 2, icon: <BarChart3 size={24} />, title: "We Analyze Conditions", desc: "Real-time data from multiple sources" },
  { num: 3, icon: <ShieldCheck size={24} />, title: "Get Safety Advice", desc: "AI-powered recommendations for you" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function HomePage() {
  const router = useRouter();
  const { search, loading } = useSafetyData();
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, idx) => ({
        id: idx,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.floor(Math.random() * 3) + 1,
        delay: Math.random() * 6,
        duration: 6 + Math.random() * 8,
      })),
    []
  );

  const handleSearch = (city: string) => {
    search(city);
    router.push(`/dashboard`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.12), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(6,182,212,0.06), transparent)",
          }}
        />

        <div className="absolute inset-0 hidden lg:block pointer-events-none">
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background:
                  particle.id % 3 === 0
                    ? "#06b6d4"
                    : particle.id % 3 === 1
                    ? "#3b82f6"
                    : "#10b981",
                opacity: 0.45,
                animation: `float-particle ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Floating cards (desktop) */}
        <motion.div
          className="absolute top-32 left-16 hidden xl:block"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="card px-4 py-3 opacity-30 rotate-[-8deg] scale-75">
            <div className="text-xs text-text-muted mb-1">AQI</div>
            <div className="text-lg font-bold font-[family-name:var(--font-family-mono)] text-safe">42</div>
          </div>
        </motion.div>
        <motion.div
          className="absolute top-48 right-20 hidden xl:block"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className="card px-4 py-3 opacity-25 rotate-[6deg] scale-75">
            <div className="text-xs text-text-muted mb-1">Temperature</div>
            <div className="text-lg font-bold font-[family-name:var(--font-family-mono)] text-caution">34°C</div>
          </div>
        </motion.div>
        <motion.div
          className="absolute bottom-40 left-32 hidden xl:block"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          <div className="card px-4 py-3 opacity-20 rotate-[3deg] scale-75">
            <div className="text-xs text-text-muted mb-1">Status</div>
            <div className="text-sm font-bold text-safe">✓ Safe</div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className="relative z-10 flex flex-col items-center text-center max-w-3xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Top badge */}
          <div className="mb-6 px-4 py-2 rounded-full glass border border-accent-blue/20 text-sm text-text-secondary">
            🛡️ Real-time Safety Intelligence
          </div>

          {/* Heading */}
          <h1 className="font-[family-name:var(--font-family-grotesk)] text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="text-text-primary">Know Before</span>
            <br />
            <span className="bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent">
              You Go
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-text-secondary max-w-md mb-10 leading-relaxed">
            Real-time air quality, weather safety, and health alerts for any city — powered by AI.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <button
              onClick={() => {
                const el = document.getElementById("quick-search");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan text-white font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:shadow-glow-blue flex items-center gap-2 cursor-pointer"
            >
              Check My City
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push("/map")}
              className="px-8 py-4 rounded-full border border-border-default text-text-secondary font-semibold text-sm transition-all duration-200 hover:border-border-light hover:text-text-primary cursor-pointer"
            >
              View Live Map
            </button>
          </div>

          {/* Trust line */}
          <p className="text-text-muted text-xs flex items-center gap-2">
            Trusted data from Google APIs
            <span className="w-1 h-1 rounded-full bg-text-muted" />
            Updated every 5 minutes
          </p>
        </motion.div>
      </section>

      {/* Quick Search Section */}
      <section id="quick-search" className="py-12 sm:py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <h2 className="font-[family-name:var(--font-family-grotesk)] text-2xl sm:text-3xl font-bold text-text-primary mb-3">
              Check Safety For Any City
            </h2>
          </motion.div>

          <SearchBar
            onSearch={handleSearch}
            placeholder="Enter a city name..."
            isLoading={loading}
          />

          {/* Popular cities */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {popularCities.map((city) => (
              <button
                key={city}
                onClick={() => handleSearch(city)}
                className="px-4 py-2 rounded-full border border-border-default text-sm text-text-secondary transition-all duration-200 hover:border-accent-blue hover:text-text-primary cursor-pointer"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="card group cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="font-[family-name:var(--font-family-grotesk)] text-lg font-semibold text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-[family-name:var(--font-family-grotesk)] text-2xl sm:text-3xl font-bold text-text-primary text-center mb-16"
          >
            How It Works
          </motion.h2>

          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="absolute top-12 left-[15%] right-[15%] h-px border-t-2 border-dashed border-border-default hidden lg:block" />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12"
            >
              {steps.map((step) => (
                <motion.div key={step.num} variants={itemVariants} className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-12 h-12 rounded-full bg-accent-blue/15 border-2 border-accent-blue/40 flex items-center justify-center text-accent-blue font-bold font-[family-name:var(--font-family-grotesk)]">
                      {step.num}
                    </div>
                  </div>
                  <div className="text-text-secondary mb-3">{step.icon}</div>
                  <h3 className="font-[family-name:var(--font-family-grotesk)] text-lg font-semibold text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-secondary">{step.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
