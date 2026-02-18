import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import BranchesPage from "./pages/BranchesPage";

import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerWallet from "./pages/customer/CustomerWallet";
import CustomerReferral from "./pages/customer/CustomerReferral";
import CustomerPurchases from "./pages/customer/CustomerPurchases";
import CustomerProfile from "./pages/customer/CustomerProfile";
import CustomerOffers from "./pages/customer/CustomerOffers";
import CustomerSpinWheel from "./pages/customer/CustomerSpinWheel";

import BranchDashboard from "./pages/branch/BranchDashboard";
import BranchNewPurchase from "./pages/branch/BranchNewPurchase";
import BranchCustomers from "./pages/branch/BranchCustomers";
import BranchPurchases from "./pages/branch/BranchPurchases";
import BranchWallet from "./pages/branch/BranchWallet";
import BranchOffers from "./pages/branch/BranchOffers";
import BranchReturns from "./pages/branch/BranchReturns";
import BranchStaff from "./pages/branch/BranchStaff";
import BranchPerformance from "./pages/branch/BranchPerformance";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBranches from "./pages/admin/AdminBranches";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminPurchases from "./pages/admin/AdminPurchases";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminWalletTransactions from "./pages/admin/AdminWalletTransactions";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/branches" element={<BranchesPage />} />

            {/* Customer */}
            <Route path="/app" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/app/wallet" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerWallet /></ProtectedRoute>} />
            <Route path="/app/referral" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerReferral /></ProtectedRoute>} />
            <Route path="/app/purchases" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerPurchases /></ProtectedRoute>} />
            <Route path="/app/profile" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerProfile /></ProtectedRoute>} />
            <Route path="/app/offers" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerOffers /></ProtectedRoute>} />
            <Route path="/app/spin" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerSpinWheel /></ProtectedRoute>} />

            {/* Branch */}
            <Route path="/branch" element={<ProtectedRoute allowedRoles={["branch"]}><BranchDashboard /></ProtectedRoute>} />
            <Route path="/branch/purchase/new" element={<ProtectedRoute allowedRoles={["branch"]}><BranchNewPurchase /></ProtectedRoute>} />
            <Route path="/branch/customers" element={<ProtectedRoute allowedRoles={["branch"]}><BranchCustomers /></ProtectedRoute>} />
            <Route path="/branch/purchases" element={<ProtectedRoute allowedRoles={["branch"]}><BranchPurchases /></ProtectedRoute>} />
            <Route path="/branch/wallet" element={<ProtectedRoute allowedRoles={["branch"]}><BranchWallet /></ProtectedRoute>} />
            <Route path="/branch/offers" element={<ProtectedRoute allowedRoles={["branch"]}><BranchOffers /></ProtectedRoute>} />
            <Route path="/branch/returns" element={<ProtectedRoute allowedRoles={["branch"]}><BranchReturns /></ProtectedRoute>} />
            <Route path="/branch/staff" element={<ProtectedRoute allowedRoles={["branch"]}><BranchStaff /></ProtectedRoute>} />
            <Route path="/branch/performance" element={<ProtectedRoute allowedRoles={["branch"]}><BranchPerformance /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/branches" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminBranches /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminCustomers /></ProtectedRoute>} />
            <Route path="/admin/purchases" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminPurchases /></ProtectedRoute>} />
            <Route path="/admin/referrals" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminReferrals /></ProtectedRoute>} />
            <Route path="/admin/wallet-transactions" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminWalletTransactions /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminAnnouncements /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/leaderboard" element={<ProtectedRoute allowedRoles={["superadmin"]}><AdminLeaderboard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
