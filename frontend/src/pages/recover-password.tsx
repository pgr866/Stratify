import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Eye, EyeClosed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmailVerificationDialog } from "@/components/email-verification-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { toast } from "sonner"
import { useSession } from "@/App";
import { recoverPassword, sendEmailRecoverPassword } from "@/api";

export function RecoverPassword() {
	const { user } = useSession();
	const navigate = useNavigate();
	const [email, setEmail] = useState(user?.email || "");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [repeatPassword, setRepeatPassword] = useState("");
	const [showRepeatPassword, setShowRepeatPassword] = useState(false);
	const [code, setCode] = useState("");
	const [emailSent, setEmailSent] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleSendEmail = async () => {
		try {
			setIsLoading(true);
			if (password !== repeatPassword) {
				throw new Error("Passwords do not match");
			}
			await sendEmailRecoverPassword(email, password);
			setEmailSent(true);
		} catch (error) {
			const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
			const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
				? Object.entries(axiosError.response.data).map(([k, v]) =>
					k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
				: "Passwords do not match";
			toast("Password change failed", { description: errorMessage });
		} finally {
			setIsLoading(false);
		}
	};

	const handleRecoverPassword = async () => {
		try {
			setIsLoading(true);
			await recoverPassword(email, password, code);
			navigate("/portal");
			toast("Password changed successfully");
		} catch (error) {
			const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
			const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
				? Object.entries(axiosError.response.data).map(([k, v]) =>
					k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
				: "Something went wrong";
			toast("Password change failed", { description: errorMessage });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div>
			<div className="flex h-screen w-full items-center justify-center px-4 flex-wrap overflow-hidden">
				<div className="fixed top-4 right-4">
					<ThemeToggle />
				</div>
				{/* <img src="/logo.svg" alt="Logo" className="logo size-[25rem]"/> */}
				<Card className="mx-auto w-full max-w-sm">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl">Recover password</CardTitle>
						<CardDescription>
							Enter your email and new password below
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<div className="flex items-center">
									<Label htmlFor="email">Email</Label>
								</div>
								<Input
									id="email"
									type="email"
									placeholder="m@example.com"
									maxLength={254}
									value={email}
									disabled={!!user?.email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div className="grid gap-2">
								<div className="flex items-center">
									<Label htmlFor="password">New Password</Label>
								</div>
								<div className="relative w-full">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										maxLength={128}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="pr-10"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
									>
										{showPassword ? <Eye size={16} /> : <EyeClosed size={16} />}
									</button>
								</div>
							</div>
							<div className="grid gap-2">
								<div className="flex items-center">
									<Label htmlFor="repeat_password">Repeat New Password</Label>
								</div>
								<div className="relative w-full">
									<Input
										id="repeat_password"
										type={showRepeatPassword ? "text" : "password"}
										maxLength={128}
										value={repeatPassword}
										onChange={(e) => setRepeatPassword(e.target.value)}
										className="pr-10"
									/>
									<button
										type="button"
										onClick={() => setShowRepeatPassword(!showRepeatPassword)}
										className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
									>
										{showRepeatPassword ? <Eye size={16} /> : <EyeClosed size={16} />}
									</button>
								</div>
							</div>
							<Button onClick={handleSendEmail} disabled={isLoading} className="w-full">
								{isLoading ? (
									<><Loader2 className="animate-spin mr-2" />Loading...</>
								) : (
									"Recover password"
								)}
							</Button>
						</div>
						<div className="mt-4 text-center text-sm">
							Have you remembered your password?{" "}
							<Link to="/login" className="underline">
								Sign in
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
			<EmailVerificationDialog
  			open={emailSent}
  			onOpenChange={setEmailSent}
  			onVerify={handleRecoverPassword}
  			isLoading={isLoading}
  			code={code}
  			setCode={setCode}
			/>
		</div>
	)
}
