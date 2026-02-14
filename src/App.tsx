import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { fixTextEncoding } from "@/lib/textEncoding";

const queryClient = new QueryClient();

const EncodingRepair = () => {
  useEffect(() => {
    let rafId: number | null = null;

    const repairTextInNode = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let current: Node | null = walker.nextNode();
      while (current) {
        const textNode = current as Text;
        const value = textNode.nodeValue || '';
        const fixed = fixTextEncoding(value);
        if (fixed && fixed !== value) {
          textNode.nodeValue = fixed;
        }
        current = walker.nextNode();
      }
    };

    const repairAttributes = (scope: ParentNode) => {
      const attrs = ['placeholder', 'title', 'aria-label', 'alt'] as const;
      const elements = scope.querySelectorAll<HTMLElement>('*');
      elements.forEach((el) => {
        attrs.forEach((attr) => {
          const value = el.getAttribute(attr);
          if (!value) return;
          const fixed = fixTextEncoding(value);
          if (fixed && fixed !== value) {
            el.setAttribute(attr, fixed);
          }
        });
      });
    };

    const runRepair = () => {
      rafId = null;
      if (!document.body) return;
      repairTextInNode(document.body);
      repairAttributes(document.body);
    };

    const scheduleRepair = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(runRepair);
    };

    scheduleRepair();

    const observer = new MutationObserver(() => {
      scheduleRepair();
    });

    if (document.body) {
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
      });
    }

    return () => {
      observer.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EncodingRepair />
      <BrowserRouter>
        <Routes>
          {/* Public entry route */}
          <Route path="/" element={<Navigate to="/customer" replace />} />

          {/* Admin Protected Routes */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>} />
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
