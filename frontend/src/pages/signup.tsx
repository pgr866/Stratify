import { useNavigate, Link } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle"
import { Loader2 } from "lucide-react"
import { useState } from "react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleSignin } from "@/components/google-signin"
import { GithubSignin } from "@/components/github-signin"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createUser, validateEmail } from "../../api/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function Signup() {
    const { toast } = useToast()
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [emailSent, setEmailSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendEmail = async () => {
        try {
            if (password !== repeatPassword) {
                throw new Error("Passwords do not match");
            }
            setIsLoading(true);
            await validateEmail(email, username, password);
            setEmailSent(true);
        } catch (error) {
            const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
            const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
                ? Object.entries(axiosError.response.data).map(([k, v]) =>
                    k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
                : "Passwords do not match";
            toast({ title: "Sign-up failed", description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async () => {
        try {
            setIsLoading(true);
            await createUser({ email: email, username: username, password: password }, code.join(''));
            navigate("/dashboard");
            toast({ description: "Sign-up successful" });
        } catch (error) {
            const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
            const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
                ? Object.entries(axiosError.response.data).map(([k, v]) =>
                    k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
                : "Something went wrong";
            toast({ title: "Sign-up failed", description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;
        if (/^[0-9]$/.test(value) || value === "") {
            const newCode = [...code];
            newCode[index] = value;
            setCode(newCode);
            if (value && index < 5) document.getElementById(`code-input-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            document.getElementById(`code-input-${index - 1}`)?.focus();
        }
    };

    const handleClick = () => {
        const firstEmptyIndex = code.findIndex(d => !d);
        document.getElementById(`code-input-${firstEmptyIndex !== -1 ? firstEmptyIndex : 5}`)?.focus();
    };

    return (
        <div>
            <div className="flex h-[90vh] w-full items-center justify-center px-4 flex-wrap">
                <div className="fixed top-4 right-4">
                    <ThemeToggle />
                </div>
                {/* <img src="/logo.svg" alt="Logo" className="logo size-[25rem]"/> */}
                <Card className="mx-auto w-full max-w-[26rem]">
                    <CardHeader>
                        <CardTitle className="text-2xl">Create an account</CardTitle>
                        <CardDescription>
                            Enter your email below to create your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-6">
                                <GithubSignin></GithubSignin>
                                <GoogleSignin></GoogleSignin>
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
                                    <Label htmlFor="username">Username</Label>
                                </div>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="email">Email</Label>
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="repeat_password">Repeat Password</Label>
                                </div>
                                <Input
                                    id="repeat_password"
                                    type="password"
                                    placeholder="repeat password"
                                    value={repeatPassword}
                                    onChange={(e) => setRepeatPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button onClick={handleSendEmail} disabled={isLoading} className="w-full">
                                {isLoading ? (
                                    <><Loader2 className="animate-spin mr-2" />Loading...</>
                                ) : (
                                    "Create account"
                                )}
                            </Button>
                        </div>
                        <div className="mt-4 text-center text-sm">
                            Already have an account?{" "}
                            <Link to="/login" className="underline">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={emailSent} onOpenChange={(open) => setEmailSent(open)}>
                <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => { e.preventDefault(); }}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Verify your email</DialogTitle>
                        <DialogDescription>
                            Enter the 6-digit code sent to your email address to verify your account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-6 gap-4 mb-2">
                        {code.map((digit, index) => (
                            <Input
                                key={index}
                                id={`code-input-${index}`}
                                value={digit}
                                onChange={(e) => handleChange(e, index)}
                                onClick={handleClick}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                maxLength={1}
                                pattern="[0-9]*"
                                inputMode="numeric"
                                className="h-12 w-full text-center text-lg font-medium"
                            />
                        ))}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSignup} disabled={isLoading} className="w-full">
                            {isLoading ? (
                                <><Loader2 className="animate-spin mr-2" />Loading...</>
                            ) : (
                                "Verify"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}