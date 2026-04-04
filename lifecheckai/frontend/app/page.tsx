"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { Wind, ShieldAlert, Sparkles, Activity } from "lucide-react";

const popularCities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata"];

const features = [
  {
    icon: <Wind size={28} style={{ color: "var(--color-accent-cyan)", filter: "drop-shadow(0 0 8px var(--color-accent-cyan))" }} />,
    color: "text-accent-cyan",
    border: "border-l-accent-cyan",
    title: "Air Quality Matrix",
    description: "Real-time AQI with full pollutant breakdown and gradient mapping.",
  },
  {
    icon: <ShieldAlert size={28} style={{ color: "var(--color-accent-violet)", filter: "drop-shadow(0 0 8px var(--color-accent-violet))" }} />,
    color: "text-accent-violet",
    border: "border-l-accent-violet",
    title: "Risk Analysis",
    description: "Multi-layered real-time environmental safety alerts via vector logic.",
  },
  {
    icon: <Sparkles size={28} style={{ color: "var(--color-safe)", filter: "drop-shadow(0 0 8px var(--color-safe))" }} />,
    color: "text-safe",
    border: "border-l-[var(--color-safe)]",
    title: "Gemini Intelligence",
    description: "Hyperlocal contextual advice powered by Google Gemini AI.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { search, loading } = useSafetyData();

  const handleSearch = (city: string) => {
    search(city);
    router.push(`/dashboard?city=${encodeURIComponent(city)}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4">
        {/* Animated Background Orb (simulating Delhi's average AQI color - yellow/orange) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] rounded-full blur-[100px] sm:blur-[140px] bg-warning/20"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl w-full">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-1.5 rounded-full glass border border-accent-cyan/30 text-xs sm:text-sm font-medium tracking-wide flex items-center justify-center gap-2"
          >
            <Activity size={14} className="text-accent-cyan animate-pulse-slow" />
            ENVIRONMENTAL INTELLIGENCE PLATFORM
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl font-bold leading-tight mb-6 tracking-tight"
          >
            Omnipresent Safety. <br />
            <span className="bg-gradient-to-r from-accent-cyan to-accent-violet bg-clip-text text-transparent">
              Hyperlocal Analysis.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-text-secondary max-w-2xl mb-12"
          >
            Real-time air quality, safety scores, weather anomalies, and holistic risk evaluation powered by sophisticated AI.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl"
          >
            {/* The SearchBar has glass styles via its own component hopefully, if not we wrap it */}
            <div className="relative w-full shadow-glow-cyan rounded-2xl">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Check safety in your city..."
                isLoading={loading}
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              {popularCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleSearch(city)}
                  className="px-4 py-1.5 rounded-full glass hover:border-accent-cyan hover:text-white transition-all text-sm text-text-muted cursor-pointer"
                >
                  {city}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Animated Ticker ─── */}
      <div className="w-full border-y border-border-default bg-white/5 backdrop-blur-sm py-3 overflow-hidden flex whitespace-nowrap">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 15, repeat: Infinity }}
          className="flex items-center gap-16 px-8 flex-nowrap"
        >
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex gap-16 font-mono text-sm tracking-widest text-text-muted">
              <span>14 CITIES MONITORED</span>
              <span className="text-accent-cyan">•</span>
              <span>99.2% UPTIME</span>
              <span className="text-accent-violet">•</span>
              <span>3.2M CHECKS</span>
              <span className="text-safe">•</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ─── Features Below Fold ─── */}
      <section id="features" className="py-24 px-4 relative z-10 max-w-7xl mx-auto border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass p-8 border-l-2 ${feature.border} group`}
            >
              <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 ${feature.color} shadow-glow`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Technology Stack ─── */}
      <section id="technology" className="py-24 px-4 relative z-10 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Powered by Advanced Technologies</h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            A robust software architecture built for speed, accuracy, and absolute scale.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="glass p-6 rounded-3xl border border-white/10 hover:border-[var(--color-accent-cyan)] transition-colors group">
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#00D4FF] mb-2 drop-shadow-sm">Frontend Architecture</div>
              <h3 className="text-xl font-bold text-white mb-2">Next.js 14 App Router</h3>
              <p className="text-sm text-text-secondary leading-relaxed group-hover:text-white/80 transition-colors">Server-side rendering, heavily optimized edge networks, complex routing states for immediate dashboard load times.</p>
           </div>
           
           <div className="glass p-6 rounded-3xl border border-white/10 hover:border-[var(--color-accent-violet)] transition-colors group">
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#7C3AED] mb-2 drop-shadow-sm">Artificial Intelligence</div>
              <h3 className="text-xl font-bold text-white mb-2">Google Gemini Pro</h3>
              <p className="text-sm text-text-secondary leading-relaxed group-hover:text-white/80 transition-colors">Underpinning our core Chat interface allowing realtime, localized contextual advice that parses telemetry data natively.</p>
           </div>

           <div className="glass p-6 rounded-3xl border border-white/10 hover:border-[var(--color-safe)] transition-colors group">
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#10B981] mb-2 drop-shadow-sm">Predictive Systems</div>
              <h3 className="text-xl font-bold text-white mb-2">Python ML Integrations</h3>
              <p className="text-sm text-text-secondary leading-relaxed group-hover:text-white/80 transition-colors">Scikit-learn random forests calculating BIS IS 10500:2012 water drinkability probabilities over massive datasets.</p>
           </div>
        </div>
      </section>

    </div>
  );
}
