import './App.css'
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { checkAuth } from "@/api";
import { Panel } from "./pages/panel";
import { Home } from "./pages/home";
import { Login } from "./pages/login";
import { RecoverPassword } from "./pages/recover-password";
import { Signup } from "./pages/signup";
import { Toaster } from "@/components/ui/toaster"
import { Temp } from "./pages/temp";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/home") || location.pathname.startsWith("/api")) { return; }
    const fetchAuthStatus = async () => {
      try {
        const response = await checkAuth();
        if (response.status === 200) {
          setIsAuthenticated(response.data.authenticated);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    fetchAuthStatus();
  }, [location]);

  return (
    <div>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/panel" /> : <Login />} />
        <Route path="/recover-password" element={isAuthenticated ? <Navigate to="/panel" /> : <RecoverPassword />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/panel" /> : <Signup />} />
        <Route path="/panel" element={isAuthenticated ? <Panel /> : <Navigate to="/login" />} />
        <Route path="/api/*" />
        <Route path="*" element={<Navigate to="/home" />} />
        <Route path="/temp" element={<Temp />} />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
