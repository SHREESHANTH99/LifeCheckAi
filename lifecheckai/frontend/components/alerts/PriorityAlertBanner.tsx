import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface PriorityAlertBannerProps {
  title: string;
  location: string;
  issuedMinutesAgo: number;
  onClose?: () => void;
  onViewDetails?: () => void;
}

export const PriorityAlertBanner: React.FC<PriorityAlertBannerProps> = ({
  title,
  location,
  issuedMinutesAgo,
  onClose,
  onViewDetails,
}) => {
  useEffect(() => {
    // Play brief notification sound
    const playSound = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.frequency.value = 880;
        oscillator.type = 'sine';

        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch {
        // Audio context not available
      }
    };

    playSound();
  }, []);

  return (
    <div className="fixed top-20 left-0 right-0 z-50 px-4">
      <div className="max-w-5xl mx-auto bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-4 shadow-2xl border border-red-500/50 animate-slide-down">
        {/* Pulsing border animation */}
        <style>{`
          @keyframes pulse-border {
            0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.5); }
            50% { box-shadow: 0 0 30px rgba(239,68,68,0.8); }
          }
          .alert-banner { animation: pulse-border 2s ease-in-out infinite; }
        `}</style>

        <div className="flex items-start justify-between gap-4 alert-banner">
          <div className="flex items-start gap-3 flex-1">
            {/* Animated alert icon */}
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">🚨 {title}</h3>
              <p className="text-red-100 text-sm">
                <strong>{location}</strong> • Issued {issuedMinutesAgo} minute{issuedMinutesAgo !== 1 ? 's' : ''} ago
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-sm transition-colors"
              >
                View Details
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
