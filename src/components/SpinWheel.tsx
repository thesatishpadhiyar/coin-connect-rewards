import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const SEGMENTS = [
  { label: "10", coins: 10, color: "bg-amber-400" },
  { label: "25", coins: 25, color: "bg-emerald-400" },
  { label: "5", coins: 5, color: "bg-sky-400" },
  { label: "50", coins: 50, color: "bg-purple-400" },
  { label: "0", coins: 0, color: "bg-slate-300" },
  { label: "15", coins: 15, color: "bg-rose-400" },
  { label: "100", coins: 100, color: "bg-yellow-400" },
  { label: "0", coins: 0, color: "bg-slate-300" },
];

interface SpinWheelProps {
  onResult: (coins: number) => void;
  disabled?: boolean;
}

export default function SpinWheel({ onResult, disabled }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const spin = () => {
    if (spinning || disabled) return;
    setSpinning(true);
    setResult(null);

    const segmentAngle = 360 / SEGMENTS.length;
    const winIndex = Math.floor(Math.random() * SEGMENTS.length);
    const targetAngle = 360 * 5 + (360 - winIndex * segmentAngle - segmentAngle / 2);
    
    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      const won = SEGMENTS[winIndex].coins;
      setResult(won);
      onResult(won);
    }, 4000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pointer */}
      <div className="text-2xl">▼</div>
      
      {/* Wheel */}
      <div className="relative w-64 h-64">
        <div
          className="w-full h-full rounded-full border-4 border-border overflow-hidden transition-transform ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? "4s" : "0s",
            transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.12, 0.99)",
          }}
        >
          {SEGMENTS.map((seg, i) => {
            const angle = (360 / SEGMENTS.length) * i;
            return (
              <div
                key={i}
                className={`absolute w-full h-full`}
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-32 ${seg.color} flex items-start justify-center pt-4 text-xs font-bold text-white`}
                  style={{
                    clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                    transformOrigin: "bottom center",
                  }}
                >
                  {seg.label}
                </div>
              </div>
            );
          })}
        </div>
        {/* Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={spin}
            disabled={spinning || disabled}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-lg disabled:opacity-50 z-10"
          >
            {spinning ? "..." : "SPIN"}
          </button>
        </div>
      </div>

      {result !== null && (
        <div className="text-center animate-fade-in">
          {result > 0 ? (
            <p className="text-lg font-bold text-foreground">🎉 You won {result} coins!</p>
          ) : (
            <p className="text-sm text-muted-foreground">Better luck next time! Try again tomorrow.</p>
          )}
        </div>
      )}
    </div>
  );
}
