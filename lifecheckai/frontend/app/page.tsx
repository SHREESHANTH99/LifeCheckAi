"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SearchBar } from "@/components/ui/SearchBar";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { Wind, ShieldAlert, Sparkles, Activity, Zap, BarChart3, CloudRain } from "lucide-react";

const popularCities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata"];

const MarqueeContent = () => (
  <div className="flex gap-16 font-mono text-sm tracking-widest text-text-muted px-8">
    <span>14 CITIES MONITORED</span>
    <span className="text-accent-cyan">•</span>
    <span>99.2% UPTIME</span>
    <span className="text-accent-violet">•</span>
    <span>3.2M CHECKS</span>
    <span className="text-safe">•</span>
  </div>
);

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
      <section className="relative min-h-[95vh] flex flex-col items-center justify-start pt-32 px-4 pb-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] rounded-full blur-[100px] sm:blur-[140px] bg-warning/20"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl w-full">
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
            Know if it's safe to <br />
            <span className="bg-gradient-to-r from-accent-cyan to-accent-violet bg-clip-text text-transparent">
              go outside, right now.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-text-secondary max-w-2xl mb-12"
          >
            Real-time air quality, weather anomalies, pollen levels, and localized safety scores for any Indian city.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl mb-16"
          >
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

          {/* Hero Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-5xl rounded-xl border border-white/10 glass overflow-hidden shadow-2xl relative"
          >
            <div className="bg-white/5 h-8 w-full border-b border-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-danger/80" />
              <div className="w-3 h-3 rounded-full bg-warning/80" />
              <div className="w-3 h-3 rounded-full bg-safe/80" />
            </div>
            <div className="relative w-full aspect-[16/9] bg-bg-primary/80">
              <Image 
                src="/dashboard-mockup.png" 
                alt="LifeCheck AI Dashboard Preview"
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Animated Ticker ─── */}
      <div className="w-full border-y border-border-default bg-white/5 backdrop-blur-sm py-3 overflow-hidden flex whitespace-nowrap group">
        <div className="flex animate-marquee group-hover:[animation-play-state:paused] will-change-transform w-max">
          <MarqueeContent />
          <MarqueeContent />
          <MarqueeContent />
          <MarqueeContent />
          {/* Duplicates for seamless loop, screen readers ignore */}
          <div className="flex" aria-hidden="true">
            <MarqueeContent />
            <MarqueeContent />
            <MarqueeContent />
            <MarqueeContent />
          </div>
        </div>
      </div>

      {/* ─── Features Below Fold ─── */}
      <section id="features" className="py-24 px-4 relative z-10 max-w-7xl mx-auto border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass p-8 border-t-2 border-t-accent-cyan flex flex-col h-full group hover:-translate-y-1 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 flex items-center justify-center mb-6 text-accent-cyan shadow-glow-cyan">
              <Wind size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Air Quality Matrix</h3>
            <p className="text-text-secondary leading-relaxed flex-1">
              Real-time AQI with full pollutant breakdown (PM2.5, PM10, CO, Ozone) and severity mapping.
            </p>
            <div className="mt-8 p-4 rounded-lg bg-bg-primary/50 border border-white/5 flex items-center justify-between">
              <span className="text-sm text-text-muted">Current AQI</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-accent-cyan">42</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-safe/20 text-safe">Good</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass p-8 border-t-2 border-t-accent-violet flex flex-col h-full group hover:-translate-y-1 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-violet/10 flex items-center justify-center mb-6 text-accent-violet shadow-glow-violet">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Risk Analysis</h3>
            <p className="text-text-secondary leading-relaxed flex-1">
              Multi-layered safety alerts combining heat waves, extreme UV index, and regional weather anomalies.
            </p>
            <div className="mt-8 p-4 rounded-lg bg-bg-primary/50 border border-white/5 flex items-center gap-4">
               <div className="w-10 h-10 rounded-full border-[3px] border-warning flex items-center justify-center">
                 <span className="text-xs font-bold text-warning">85</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-semibold text-white">Caution Advised</span>
                 <span className="text-[10px] text-text-muted uppercase">Heatwave Warning</span>
               </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass p-8 border-t-2 border-t-safe flex flex-col h-full group hover:-translate-y-1 transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-safe/10 flex items-center justify-center mb-6 text-safe shadow-glow-green">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Gemini Intelligence</h3>
            <p className="text-text-secondary leading-relaxed flex-1">
              Hyperlocal contextual advice powered by Google Gemini AI, tailored to your specific health profile.
            </p>
            <div className="mt-8 p-3 rounded-lg bg-bg-primary/50 border border-white/5 flex gap-3 items-start">
               <Sparkles size={16} className="text-safe mt-0.5 shrink-0" />
               <p className="text-xs text-text-secondary italic">
                 "Given the high pollen count today, wear an N95 mask if you have asthma before heading out."
               </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ─── Technology Stack ─── */}
      <section id="technology" className="py-24 px-4 relative z-10 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Powered by Advanced Technologies</h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            A precise, verifiable software architecture built for speed and accuracy.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="glass p-6 rounded-3xl border border-white/10 hover:border-[var(--color-accent-cyan)] transition-colors group">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-accent-cyan" />
                <div className="text-[10px] uppercase font-bold tracking-widest text-accent-cyan">Frontend</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Next.js 14 App Router</h3>
              <ul className="text-sm text-text-secondary space-y-2 group-hover:text-white/80 transition-colors">
                <li>• Server-side rendering (SSR)</li>
                <li>• Edge network caching</li>
                <li>• Sub-100ms LCP on Dashboard</li>
              </ul>
           </div>
           
           <div className="glass p-6 rounded-3xl border border-white/10 hover:border-[var(--color-accent-violet)] transition-colors group">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-accent-violet" />
                <div className="text-[10px] uppercase font-bold tracking-widest text-accent-violet">AI Engine</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Google Gemini 1.5 Pro</h3>
              <ul className="text-sm text-text-secondary space-y-2 group-hover:text-white/80 transition-colors">
                <li>• Real-time telemetry parsing</li>
                <li>• 1M+ token context window</li>
                <li>• Contextual health profiling</li>
              </ul>
           </div>

           <div className="glass p-6 rounded-3xl border border-white/10 hover:border-[var(--color-safe)] transition-colors group">
              <div className="flex items-center gap-2 mb-4">
                <CloudRain size={18} className="text-safe" />
                <div className="text-[10px] uppercase font-bold tracking-widest text-safe">Data Layer</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Aggregated APIs</h3>
              <ul className="text-sm text-text-secondary space-y-2 group-hover:text-white/80 transition-colors">
                <li>• OpenWeatherMap live feeds</li>
                <li>• WAQI sensor networks</li>
                <li>• 15-minute sync intervals</li>
              </ul>
           </div>
        </div>
      </section>
    </div>
  );
}
