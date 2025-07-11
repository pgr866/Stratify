import React, { lazy, Suspense, useEffect, useState, createContext, useContext } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from '@/components/theme-provider.tsx';
import { getAuthUser, User } from "@/api";

// Lazy-loaded components
const Home = lazy(() => import("@/pages/home/home").then(module => ({ default: module.Home })));
const Login = lazy(() => import("@/pages/login").then(module => ({ default: module.Login })));
const RecoverPassword = lazy(() => import("@/pages/recover-password").then(module => ({ default: module.RecoverPassword })));
const Signup = lazy(() => import("@/pages/signup").then(module => ({ default: module.Signup })));
const Portal = lazy(() => import("@/pages/portal/portal").then(module => ({ default: module.Portal })));
const Strategy = lazy(() => import("@/pages/strategy/strategy").then(module => ({ default: module.Strategy })));

const SessionContext = createContext<{ user: User | null; setUser: React.Dispatch<React.SetStateAction<User | null>>; }>({ user: null, setUser: () => {} });

export const useSession = () => useContext(SessionContext);

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const location = useLocation();
  const sessionValue = React.useMemo(() => ({ user, setUser }), [user, setUser]);

  useEffect(() => {
    if (location.pathname.startsWith("/api")) return;
    getAuthUser()
      .then((response: { data: User }) => setUser(response.data))
      .catch(() => setUser(null));
  }, [location]);

  if (user === undefined) {
    return;
  }

  return (
    <SessionContext.Provider value={sessionValue}>
      <Suspense fallback={<div></div>}>
        <ThemeProvider>
          <Routes>
            <Route path="/api/*" />
            <Route path="/home" element={<Home />} />
            <Route path="/recover-password" element={<RecoverPassword />} />
            <Route path="/login" element={user ? <Navigate to="/portal" /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/portal" /> : <Signup />} />
            <Route path="/portal" element={user ? <Portal /> : <Navigate to="/login" />} />
            <Route path="/strategy/:id" element={user ? <Strategy /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        </ThemeProvider>
      </Suspense>
      <Toaster />
    </SessionContext.Provider>
  );
}

export default App;
