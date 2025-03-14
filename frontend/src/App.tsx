import { lazy, Suspense, useEffect, useState, createContext, useContext } from "react";
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
const Strategy = lazy(() => import("@/pages/strategy/strategy").then(module => ({ default: module.Strategy })));

interface User {
  uuid: string;
  email: string;
  username: string;
  timezone_offset: string;
}

const SessionContext = createContext<{ user: User | null }>({ user: null });

export const useSession = () => useContext(SessionContext);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/home") || location.pathname.startsWith("/api")) return;
    checkAuth()
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, [location]);

  return (
    <SessionContext.Provider value={{ user }}>
      <Suspense fallback={<div></div>}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={user ? <Navigate to="/portal" /> : <Login />} />
          <Route path="/recover-password" element={user ? <Navigate to="/portal" /> : <RecoverPassword />} />
          <Route path="/signup" element={user ? <Navigate to="/portal" /> : <Signup />} />
          <Route path="/portal" element={user ? <Portal /> : <Navigate to="/login" />} />
          <Route path="/strategy/:id" element={<Strategy />} />
          <Route path="/api/*" />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </Suspense>
      <Toaster />
    </SessionContext.Provider>
  );
}

export default App;
