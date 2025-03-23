import { useState } from "react";
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast, useToast } from "@/hooks/use-toast"
import { Skull, Eye, EyeClosed } from "lucide-react"
import { Label } from "@/components/ui/label";
import { useSession } from "@/App";

export function Account() {
	const { toast } = useToast()
	const { user } = useSession();
	const [username, setUsername] = useState(user.username);
	const [email, setEmail] = useState(user.email);
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-medium">Account</h3>
				<div>
					<p className="text-sm text-muted-foreground">
						Update your account settings.
						To change your username or email, you will need to enter your current password and verify your email address.
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
			<Button>Update account</Button>
			<div className="flex flex-row items-center gap-1">
				<Skull className='text-destructive size-6 mb-0.5' />
				<h3 className="text-lg font-medium">Danger Zone</h3>
			</div>
			<Separator />
			<Button variant="destructive">Delete account</Button>
		</div>
	)
}
