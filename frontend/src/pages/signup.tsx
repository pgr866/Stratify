import { useNavigate, Link } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function Signup() {
    const navigate = useNavigate();

    return (
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
                            <Button variant="outline">
                                <Icons.gitHub />
                                GitHub
                            </Button>
                            <Button variant="outline">
                                <Icons.google />
                                Google
                            </Button>
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
                            <Input id="username" type="username" placeholder="username" />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="email">Email</Label>
                            </div>
                            <Input id="email" type="email" placeholder="m@example.com" />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input id="password" type="password" placeholder="password" />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="repeat_password">Repeat Password</Label>
                            </div>
                            <Input id="repeat_password" type="password" placeholder="repeat password" />
                        </div>
                        <Button type="submit" className="w-full">
                            Create account
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
    )
}