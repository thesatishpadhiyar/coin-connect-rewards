import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Coins, Gift, ShoppingBag, Shield } from "lucide-react";

const features = [
  {
    icon: Coins,
    title: "Earn Coins",
    desc: "Get coins on every purchase based on bill amount",
  },
  {
    icon: Gift,
    title: "Refer & Earn",
    desc: "Share your code, earn bonus coins when friends shop",
  },
  {
    icon: ShoppingBag,
    title: "Redeem Instantly",
    desc: "Use coins to save on your next purchase at any branch",
  },
  {
    icon: Shield,
    title: "Secure & Trusted",
    desc: "Your coins are safe with transparent tracking",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="gradient-gold relative overflow-hidden">
        <div className="absolute inset-0 coin-shimmer" />
        <div className="relative mx-auto max-w-lg px-6 pb-12 pt-16 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-card/20 p-3 backdrop-blur-sm">
              <Coins className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
            Welcome Reward
          </h1>
          <p className="mt-2 text-sm font-medium text-primary-foreground/80">
            Mobile Shop Loyalty Coins
          </p>
          <p className="mt-4 text-base text-primary-foreground/90">
            Shop at your favourite mobile store, earn coins, refer friends & save on every visit!
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto font-semibold shadow-elevated">
                Get Started
              </Button>
            </Link>
            <Link to="/branches">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                View Branches
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-lg px-6 py-12">
        <h2 className="mb-8 text-center font-display text-xl font-bold text-foreground">
          How It Works
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-elevated"
            >
              <div className="mb-3 inline-flex rounded-xl bg-accent p-2.5">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-6">
        <div className="mx-auto max-w-lg text-center">
          <Logo size="sm" />
          <p className="mt-2 text-xs text-muted-foreground">
            © 2026 Welcome Reward. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
