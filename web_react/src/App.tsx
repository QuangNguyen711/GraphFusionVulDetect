import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { usePreferences } from "@/lib/preferences";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Analysis from "./pages/Analysis";
import Projects from "./pages/Projects";
import ProjectAnalysis from "./pages/ProjectAnalysis";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LanguageSync = () => {
  const { language } = usePreferences();
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return null;
};

const LegacyProjectRedirect = () => {
  const { projectId } = useParams();
  return <Navigate to={`/project/${projectId}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <LanguageSync />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/analysis" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/analysis/live" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
            <Route path="/project" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/project/:projectId" element={<ProtectedRoute><ProjectAnalysis /></ProtectedRoute>} />
            <Route path="/projects" element={<Navigate to="/project" replace />} />
            <Route path="/projects/:projectId" element={<LegacyProjectRedirect />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
