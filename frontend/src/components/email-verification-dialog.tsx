import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { Loader2 } from "lucide-react"

export const EmailVerificationDialog = ({ open, onOpenChange, onVerify, isLoading, code, setCode }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => { e.preventDefault(); }}>
				<DialogHeader>
					<DialogTitle className="text-2xl">Verify your email</DialogTitle>
					<DialogDescription>
						Enter the 6-digit code sent to your email address to verify your account. This code expires in 10 minutes.
					</DialogDescription>
				</DialogHeader>
				<InputOTP containerClassName="flex justify-center mb-2" maxLength={6} value={code} onChange={(newCode) => setCode(newCode)}>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
					</InputOTPGroup>
					<InputOTPSeparator />
					<InputOTPGroup>
						<InputOTPSlot index={2} />
						<InputOTPSlot index={3} />
					</InputOTPGroup>
					<InputOTPSeparator />
					<InputOTPGroup>
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>
				<DialogFooter>
					<Button onClick={onVerify} disabled={isLoading} className="w-full">
						{isLoading ? (
							<><Loader2 className="animate-spin mr-2" />Loading...</>
						) : (
							"Verify"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
  )
}