import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Skull, Eye, EyeClosed, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label";
import { EmailVerificationDialog } from "@/components/email-verification-dialog"
import { useSession } from "@/App";
import { updateAccount, sendEmailUpdateAccount, deleteAccount, sendEmailDeleteAccount, User } from "@/api";

export function Account() {
	const navigate = useNavigate();
	const { user, setUser } = useSession();
	const [username, setUsername] = useState(user.username);
	const [email, setEmail] = useState(user.email);
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [code, setCode] = useState("");
	const [emailSentUpdateAccount, setEmailSentUpdateAccount] = useState(false);
	const [emailSentDeleteAccount, setEmailSentDeleteAccount] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

		const handleSendEmailUpdateAccount = async () => {
			try {
				setIsLoading(true);
				await sendEmailUpdateAccount(email, username, password);
				setEmailSentUpdateAccount(true);
			} catch (error) {
				const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
				console.log(axiosError);
				const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
					? Object.entries(axiosError.response.data).map(([k, v]) =>
						k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
					: "Something went wrong";
				console.log(errorMessage);
				toast("Failed to update account", { description: errorMessage });
			} finally {
				setIsLoading(false);
			}
		};
	
		const handleUpdateAccount = async () => {
			try {
				setIsLoading(true);
				const response: User = await updateAccount(email, username, password, code);
				setUser({ ...user, email: response.email, username: response.username });
				setPassword("");
				setCode("");
				setShowPassword(false);
				toast("Account updated successfully");
			} catch (error) {
				const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
				const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
					? Object.entries(axiosError.response.data).map(([k, v]) =>
						k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
					: "Something went wrong";
				toast("Failed to update account", { description: errorMessage });
			} finally {
				setIsLoading(false);
				setEmailSentUpdateAccount(false);
			}
		};

		const handleSendEmailDeleteAccount = async () => {
			try {
				setIsLoading(true);
				await sendEmailDeleteAccount(password);
				setEmailSentDeleteAccount(true);
			} catch (error) {
				const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
				const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
					? Object.entries(axiosError.response.data).map(([k, v]) =>
						k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
					: "Something went wrong";
				toast("Account deletion failed", { description: errorMessage });
			} finally {
				setIsLoading(false);
			}
		};

		const handleDeleteAccount = async () => {
			try {
				setIsLoading(true);
				await deleteAccount(password, code);
				toast("Account deleted successfully");
				navigate("/home");
			} catch (error) {
				const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
				const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
					? Object.entries(axiosError.response.data).map(([k, v]) =>
						k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
					: "Something went wrong";
				toast("Account deletion failed", { description: errorMessage });
			} finally {
				setIsLoading(false);
				setEmailSentDeleteAccount(false);
			}
		};

	return (
		<div className="space-y-5">
			<div>
				<h3 className="text-lg font-medium">Account</h3>
				<div>
					<p className="text-sm text-muted-foreground">
						Update your account settings.
						To update your account, you will need to enter your current password and verify your email address.
					</p>
				</div>
			</div>
			<Separator />
			<div className="grid gap-2">
				<div className="flex items-center">
					<Label htmlFor="username">Username</Label>
				</div>
				<Input
					id="username"
					type="text"
					placeholder="username"
					maxLength={150}
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					className="max-w-80"
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
					maxLength={254}
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="max-w-80"
				/>
			</div>
			<div className="grid gap-2">
				<div className="flex items-center">
					<Label htmlFor="password">Confirm Password</Label>
				</div>
				<div className="relative w-full max-w-80">
					<Input
						id="password"
						type={showPassword ? "text" : "password"}
						placeholder="Your current password"
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
			<Button onClick={handleSendEmailUpdateAccount} disabled={isLoading}>
				{isLoading ? (
					<><Loader2 className="animate-spin mr-2" />Loading...</>
				) : (
					"Update account"
				)}
			</Button>
			<div className="flex flex-row items-center gap-1">
				<Skull className='text-destructive size-6 mb-0.5' />
				<h3 className="text-lg font-medium">Danger Zone</h3>
			</div>
			<Separator />
			<Button variant="destructive" onClick={handleSendEmailDeleteAccount} disabled={isLoading}>
				{isLoading ? (
					<><Loader2 className="animate-spin mr-2" />Loading...</>
				) : (
					"Delete account"
				)}
			</Button>
			<EmailVerificationDialog
				open={emailSentUpdateAccount}
				onOpenChange={setEmailSentUpdateAccount}
				onVerify={handleUpdateAccount}
				isLoading={isLoading}
				code={code}
				setCode={setCode}
			/>
			<EmailVerificationDialog
				open={emailSentDeleteAccount}
				onOpenChange={setEmailSentDeleteAccount}
				onVerify={handleDeleteAccount}
				isLoading={isLoading}
				code={code}
				setCode={setCode}
			/>
		</div>
	)
}
