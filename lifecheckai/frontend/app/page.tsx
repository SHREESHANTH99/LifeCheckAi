"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { Wind, ShieldAlert, Sparkles, Activity, Zap, BarChart3, CloudRain } from "lucide-react";

const popularCities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata"];

const MarqueeContent = () => (
  <div className="flex gap-16 font-mono text-sm tracking-widest text-text-muted px-8">
    <span>14 CITIES MONITORED</span>
    <span className="text-text-muted">•</span>
    <span>99.2% UPTIME</span>
    <span className="text-text-muted">•</span>
    <span>3.2M CHECKS</span>
    <span className="text-text-muted">•</span>
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
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center pt-32 px-4 pb-20">
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-4 py-1.5 rounded-full border border-border-light bg-bg-card/50 text-xs sm:text-sm font-medium tracking-wide flex items-center justify-center gap-2"
          >
            <Activity size={14} className="text-accent-cyan" />
            ENVIRONMENTAL INTELLIGENCE PLATFORM
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl font-extrabold text-slate-100 leading-tight mb-6 tracking-tight"
          >
            Know if it's safe to <br />
            go outside, <span className="text-accent-cyan">right now.</span>
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
            <div className="relative w-full rounded-2xl">
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
                  className="px-4 py-1.5 rounded-full border border-slate-700/80 hover:border-accent-cyan text-sm text-text-muted cursor-pointer interactive-base"
                >
                  {city}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Animated Ticker ─── */}
      <div className="w-full border-y border-border-default bg-bg-card/30 py-3 overflow-hidden flex whitespace-nowrap group">
        <div className="flex animate-marquee group-hover:[animation-play-state:paused] will-change-transform w-max">
          <MarqueeContent />
          <MarqueeContent />
          <MarqueeContent />
          <MarqueeContent />
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
            className="glass p-8 flex flex-col h-full interactive-base"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 flex items-center justify-center mb-6 text-white border border-accent-cyan/20">
              <Wind size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Air Quality Matrix</h3>
            <p className="text-text-secondary leading-relaxed flex-1">
              Real-time AQI with full pollutant breakdown (PM2.5, PM10, CO, Ozone) and severity mapping.
            </p>
            <div className="mt-8 p-4 rounded-lg bg-bg-primary/50 border border-border-light flex items-center justify-between">
              <span className="text-sm text-text-muted">Current AQI</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-accent-cyan">42</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 text-text-primary">Good</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass p-8 flex flex-col h-full interactive-base"
          >
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-6 text-white border border-warning/20">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Risk Analysis</h3>
            <p className="text-text-secondary leading-relaxed flex-1">
              Multi-layered safety alerts combining heat waves, extreme UV index, and regional weather anomalies.
            </p>
            <div className="mt-8 p-4 rounded-lg bg-bg-primary/50 border border-border-light flex items-center gap-4">
               <div className="w-10 h-10 rounded-full border-[3px] border-text-muted flex items-center justify-center">
                 <span className="text-xs font-bold text-text-primary">85</span>
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
            className="glass p-8 flex flex-col h-full interactive-base"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center mb-6 text-white border border-purple-500/20">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Gemini Intelligence</h3>
            <p className="text-text-secondary leading-relaxed flex-1">
              Hyperlocal contextual advice powered by Google Gemini AI, tailored to your specific health profile.
            </p>
            <div className="mt-8 p-3 rounded-lg bg-bg-primary/50 border border-border-light flex gap-3 items-start">
               <Sparkles size={16} className="text-text-muted mt-0.5 shrink-0" />
               <p className="text-xs text-text-secondary italic">
                 "Given the high pollen count today, wear an N95 mask if you have asthma before heading out."
               </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ─── Technology Stack ─── */}
      <section id="technology" className="py-24 px-4 relative z-10 max-w-7xl mx-auto border-t border-border-default">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">Powered by Advanced Technologies</h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            A precise, verifiable software architecture built for speed and accuracy.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="glass p-6 border border-border-default hover:border-accent-cyan interactive-base">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-text-muted" />
                <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Frontend</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Next.js 14 App Router</h3>
              <ul className="text-sm text-text-secondary space-y-2">
                <li>• Server-side rendering (SSR)</li>
                <li>• Edge network caching</li>
                <li>• Sub-100ms LCP on Dashboard</li>
              </ul>
           </div>
           
           <div className="glass p-6 border border-border-default hover:border-accent-cyan interactive-base">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-text-muted" />
                <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted">AI Engine</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Google Gemini 1.5 Pro</h3>
              <ul className="text-sm text-text-secondary space-y-2">
                <li>• Real-time telemetry parsing</li>
                <li>• 1M+ token context window</li>
                <li>• Contextual health profiling</li>
              </ul>
           </div>

           <div className="glass p-6 border border-border-default hover:border-accent-cyan interactive-base">
              <div className="flex items-center gap-2 mb-4">
                <CloudRain size={18} className="text-text-muted" />
                <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Data Layer</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Aggregated APIs</h3>
              <ul className="text-sm text-text-secondary space-y-2">
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
