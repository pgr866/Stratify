import { useNavigate, Link } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle"
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { login, googleLogin } from "../../api/api";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export function Login() {
    const { toast } = useToast()
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        try {
            await login(email, password);
            navigate("/dashboard");
            toast({ description: "Login successfully" });
        } catch (error) {
            const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
            const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
                ? Object.entries(axiosError.response.data).map(([k, v]) =>
                    k === "non_field_errors" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
                : "An unknown error occurred.";
            toast({ title: "Login failed", description: errorMessage });
        }
    };

    const handleGoogleLogin = async (response: any) => {
        try {
            await googleLogin(response.credential);
            navigate("/dashboard");
            toast({ description: "Google Login successfully", });
        } catch {
            toast({ title: "Google Login failed", description: "Try to login with credentials", });
        }
    };

    return (
        <div className="flex h-[90vh] w-full items-center justify-center px-4 flex-wrap">
            <div className="fixed top-4 right-4">
                <ThemeToggle />
            </div>
            {/* <img src="/logo.svg" alt="Logo" className="logo size-[25rem]"/> */}
            <Card className="mx-auto w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-6">
                            <Button variant="outline">
                                <Icons.gitHub />
                                GitHub
                            </Button>
                            <GoogleOAuthProvider clientId="342211032228-mpne21vi7q9v3gi3m92aqnu6t9tbdk9o.apps.googleusercontent.com">
                                <Button variant="outline" className="relative">
                                    <Icons.google />
                                    Google
                                    <GoogleLogin
                                        onSuccess={handleGoogleLogin}
                                        onError={() => toast({ title: "Google Login failed", description: "An error occurred during Google login." })}
                                        useOneTap
                                        containerProps={{ className: 'absolute size-full opacity-0' }}
                                    />
                                </Button>
                            </GoogleOAuthProvider>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-[1px] border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="email">Email or Username</Label>
                            </div>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                                <Link to="#" className="ml-auto inline-block text-sm underline">
                                    Forgot your password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required />
                        </div>
                        <Button onClick={handleLogin} className="w-full">
                            Login
                        </Button>
                    </div>
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link to="/signup" className="underline">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
