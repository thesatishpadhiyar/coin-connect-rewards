import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Wallet, Gift, Tag, Settings } from "lucide-react";

const navItems = [
  { to: "/app", icon: Home, label: "Home" },
  { to: "/app/wallet", icon: Wallet, label: "Wallet" },
  { to: "/app/referral", icon: Gift, label: "Refer" },
  { to: "/app/offers", icon: Tag, label: "Offers" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="safe-area-top bg-card" />

      {/* Native-style header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl gradient-gold flex items-center justify-center shadow-sm">
            <Home className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-bold text-foreground">Welcome Reward</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-24 pt-4 hide-scrollbar">
        {children}
      </main>

      {/* iOS/Android style bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[56px]"
              >
                <div className={`rounded-2xl px-4 py-1 transition-all duration-200 ${isActive ? "bg-primary/15" : ""}`}>
                  <Icon
                    className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}