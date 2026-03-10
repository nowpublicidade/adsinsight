import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AccountSelect from "./pages/AccountSelect";
import AdminClients from "./pages/admin/AdminClients";
import AdminUsers from "./pages/admin/AdminUsers";
import Dashboard from "./pages/dashboard/Dashboard";
import MetaAds from "./pages/dashboard/MetaAds";
import GoogleAds from "./pages/dashboard/GoogleAds";
import Analytics from "./pages/dashboard/Analytics";
import SocialMedia from "./pages/dashboard/SocialMedia";
import Connections from "./pages/dashboard/Connections";
import Reports from "./pages/dashboard/Reports";
import ReportEditor from "./pages/dashboard/ReportEditor";
import ReportViewer from "./pages/dashboard/ReportViewer";
import Settings from "./pages/dashboard/Settings";
import Optimizations from "./pages/dashboard/Optimizations";
import OptimizationForm from "./pages/dashboard/OptimizationForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Seleção de conta — acessível apenas para usuários autenticados */}
            <Route path="/account-select" element={<AccountSelect />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />

            {/* Client Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/meta"
              element={
                <ProtectedRoute>
                  <MetaAds />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/google"
              element={
                <ProtectedRoute>
                  <GoogleAds />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/social-media"
              element={
                <ProtectedRoute>
                  <SocialMedia />
                </ProtectedRoute>
              }
            <Route
              path="/dashboard/connections"
              element={
                <ProtectedRoute>
                  <Connections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports/:reportId/edit"
              element={
                <ProtectedRoute>
                  <ReportEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports/:reportId/view"
              element={
                <ProtectedRoute>
                  <ReportViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/optimizations"
              element={
                <ProtectedRoute>
                  <Optimizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/optimizations/new"
              element={
                <ProtectedRoute>
                  <OptimizationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/optimizations/:id/edit"
              element={
                <ProtectedRoute>
                  <OptimizationForm />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
