import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { checkAuth } from "@/api";
import './App.css';

// Lazy-loaded components
const Home = lazy(() => import("@/pages/home/home").then(module => ({ default: module.Home })));
const Login = lazy(() => import("@/pages/login").then(module => ({ default: module.Login })));
const RecoverPassword = lazy(() => import("@/pages/recover-password").then(module => ({ default: module.RecoverPassword })));
const Signup = lazy(() => import("@/pages/signup").then(module => ({ default: module.Signup })));
const Portal = lazy(() => import("@/pages/portal/portal").then(module => ({ default: module.Portal })));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/home") || location.pathname.startsWith("/api")) return;

    const fetchAuthStatus = async () => {
      try {
        const response = await checkAuth();
        setIsAuthenticated(response.status === 200 ? response.data.authenticated : false);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    fetchAuthStatus();
  }, [location]);

  return (
    <div>
      <Suspense fallback={<div></div>}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/portal" /> : <Login />} />
          <Route path="/recover-password" element={isAuthenticated ? <Navigate to="/portal" /> : <RecoverPassword />} />
          <Route path="/signup" element={isAuthenticated ? <Navigate to="/portal" /> : <Signup />} />
          <Route path="/portal" element={isAuthenticated ? <Portal /> : <Navigate to="/login" />} />
          <Route path="/api/*" />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </Suspense>
      <Toaster />
    </div>
  );
}

export default App;
