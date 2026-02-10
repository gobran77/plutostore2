import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import ServiceRequests from "./pages/ServiceRequests";
import SupportTickets from "./pages/SupportTickets";
import Customers from "./pages/Customers";
import Subscriptions from "./pages/Subscriptions";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Messages from "./pages/Messages";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CustomerLogin from "./pages/customer/CustomerLogin";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerRegister from "./pages/customer/CustomerRegister";
import CustomerActivate from "./pages/customer/CustomerActivate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Admin Protected Routes */}
          <Route path="/" element={<ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute requireAdmin><ServiceRequests /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute requireAdmin><Services /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute requireAdmin><Customers /></ProtectedRoute>} />
          <Route path="/subscriptions" element={<ProtectedRoute requireAdmin><Subscriptions /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute requireAdmin><Invoices /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute requireAdmin><Payments /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute requireAdmin><Expenses /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute requireAdmin><SupportTickets /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute requireAdmin><Messages /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute requireAdmin><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requireAdmin><Settings /></ProtectedRoute>} />
          
          {/* Customer Portal Routes - Public */}
          <Route path="/customer" element={<CustomerLogin />} />
          <Route path="/customer/register" element={<CustomerRegister />} />
          <Route path="/customer/activate" element={<CustomerActivate />} />
          
          {/* Customer Dashboard - Protected for logged in customers */}
          <Route path="/customer/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
