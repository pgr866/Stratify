import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { useToast } from "@/hooks/use-toast"
import { googleLogin } from "../../api/api";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export function GoogleSignin() {
    const { toast } = useToast()
    const navigate = useNavigate();

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
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
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
    )
}
