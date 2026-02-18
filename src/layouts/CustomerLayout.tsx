import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Wallet, Gift, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/Logo";

const navItems = [
  { to: "/app", icon: Home, label: "Home" },
  { to: "/app/wallet", icon: Wallet, label: "Wallet" },
  { to: "/app/referral", icon: Gift, label: "Refer" },
  { to: "/app/purchases", icon: ShoppingBag, label: "Purchases" },
  { to: "/app/profile", icon: User, label: "Profile" },
];

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg px-4 py-3">
        <Logo size="sm" />
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-24 pt-4">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
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
