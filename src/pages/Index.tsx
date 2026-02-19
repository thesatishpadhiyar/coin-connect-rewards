import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, Gift, ShoppingBag, Shield, ChevronRight } from "lucide-react";

const features = [
  { icon: Coins, title: "Earn Coins", desc: "Get coins on every purchase based on bill amount" },
  { icon: Gift, title: "Refer & Earn", desc: "Share your code, earn bonus coins when friends shop" },
  { icon: ShoppingBag, title: "Redeem Instantly", desc: "Use coins to save on your next purchase" },
  { icon: Shield, title: "Secure & Trusted", desc: "Your coins are safe with transparent tracking" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Status bar spacer */}
      <div className="safe-area-top bg-foreground" />

      {/* Hero — full-screen app style */}
      <div className="gradient-dark relative flex-shrink-0 overflow-hidden">
        <div className="absolute inset-0 coin-shimmer opacity-30" />
        <div className="relative mx-auto max-w-lg px-6 pb-10 pt-14 text-center">
          {/* App icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[22px] gradient-gold shadow-gold">
            <Coins className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-primary-foreground">
            Welcome Reward
          </h1>
          <p className="mt-1 text-xs font-medium text-primary-foreground/60 uppercase tracking-widest">
            Mobile Shop Loyalty Coins
          </p>
          <p className="mt-4 text-sm text-primary-foreground/80 leading-relaxed max-w-[280px] mx-auto">
            Shop at your favourite mobile store, earn coins, refer friends & save on every visit!
          </p>
        </div>
      </div>

      {/* Content — rounded overlap */}
      <div className="relative -mt-4 flex-1 rounded-t-3xl bg-background z-10">
        <div className="mx-auto max-w-lg px-5 pt-6 pb-8">
          {/* CTA Buttons */}
          <div className="space-y-3 mb-8">
            <Link to="/login" className="block">
              <Button size="lg" className="w-full rounded-2xl h-14 text-base font-semibold shadow-gold gap-2">
                Get Started <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/branches" className="block">
              <Button size="lg" variant="outline" className="w-full rounded-2xl h-12 text-sm font-medium">
                View Our Branches
              </Button>
            </Link>
          </div>

          {/* Features */}
          <h2 className="mb-4 font-display text-base font-bold text-foreground">
            How It Works
          </h2>
          <div className="space-y-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-card animate-slide-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
              >
                <div className="flex-shrink-0 rounded-xl gradient-gold-soft p-3">
                  <f.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Minimal footer */}
          <p className="mt-8 text-center text-[10px] text-muted-foreground">
            © 2026 Welcome Reward. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}