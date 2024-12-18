import './App.css'
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { checkAuth } from "../api/api";
import { Dashboard } from "./pages/dashboard";
import { Login } from "./pages/login";
import { RecoverPassword } from "./pages/recover-password";
import { Signup } from "./pages/signup";
import { Toaster } from "@/components/ui/toaster"

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
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
    <div className="container mx-auto">
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/recover-password" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RecoverPassword />} />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="*" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
      <Toaster />
    </div>
  );
}

export default App
