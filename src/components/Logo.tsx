import { Coins } from "lucide-react";

export function CoinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <Coins className={className + " text-coin"} />;
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };
  const iconSizes = { sm: "h-5 w-5", md: "h-6 w-6", lg: "h-8 w-8" };
  return (
    <div className="flex items-center gap-2">
      <div className="gradient-gold rounded-xl p-2 shadow-gold">
        <Coins className={iconSizes[size] + " text-primary-foreground"} />
      </div>
      <div>
        <h1 className={`${sizes[size]} font-display font-bold text-foreground leading-tight`}>
          Welcome Reward
        </h1>
        {size !== "sm" && (
          <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
            Mobile Shop Loyalty Coins
          </p>
        )}
      </div>
    </div>
  );
}
