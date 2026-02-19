import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingBag, FileText, Wallet, LogOut, PlusCircle, Tag, RotateCcw, BarChart3, UserCog, MapPinCheck, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const sideNavItems = [
  { to: "/branch", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/branch/customers", icon: Users, label: "Customers" },
  { to: "/branch/purchase/new", icon: ShoppingBag, label: "New Purchase" },
  { to: "/branch/purchases", icon: FileText, label: "Purchases" },
  { to: "/branch/wallet", icon: Wallet, label: "Wallet" },
  { to: "/branch/offers", icon: Tag, label: "Offers" },
  { to: "/branch/returns", icon: RotateCcw, label: "Returns" },
  { to: "/branch/checkin", icon: MapPinCheck, label: "Check-in" },
  { to: "/branch/performance", icon: BarChart3, label: "Performance" },
  { to: "/branch/staff", icon: UserCog, label: "Staff" },
  { to: "/branch/settings", icon: Settings, label: "Settings" },
];

const bottomNavItems = [
  { to: "/branch", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/branch/offers", icon: Tag, label: "Offers" },
  { to: "/branch/purchase/new", icon: PlusCircle, label: "Add Sale", isCenter: true },
  { to: "/branch/performance", icon: BarChart3, label: "Stats" },
  { to: "/branch/settings", icon: Settings, label: "Settings" },
];

export default function BranchLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="safe-area-top bg-card" />

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl gradient-gold flex items-center justify-center shadow-sm">
              <ShoppingBag className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-bold text-foreground">Branch Panel</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {sideNavItems.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-xl text-xs font-medium transition-colors ${isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`
                  }>{label}</NavLink>
              ))}
            </nav>
            <button onClick={signOut} className="rounded-xl bg-secondary p-2" title="Sign out">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 hide-scrollbar">{children}</main>

      {/* Bottom tab bar — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border/50 safe-area-bottom md:hidden">
        <div className="flex items-center justify-around py-1.5">
          {bottomNavItems.map(({ to, icon: Icon, label, end, isCenter }) => {
            const isActive = end ? location.pathname === to : location.pathname.startsWith(to) && to !== "/branch";
            return (
              <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[56px]">
                {isCenter ? (
                  <div className="rounded-2xl bg-primary p-2.5 -mt-5 shadow-gold">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : (
                  <div className={`rounded-2xl px-4 py-1 transition-all duration-200 ${isActive ? "bg-primary/15" : ""}`}>
                    <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                )}
                <span className={`text-[10px] font-semibold transition-colors ${isActive || isCenter ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}