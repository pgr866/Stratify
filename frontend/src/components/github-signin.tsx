import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { githubLogin } from "../../api/api";
import { useSearchParams } from "react-router-dom";

export function GithubSignin() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const generateState = () => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };

    const handleGithubLogin = async () => {
        try {
            const state = generateState();
            const isProduction = window.location.protocol === "https:";
            let cookieString = `github_oauth_state=${state}; path=/; SameSite=Strict`;
            if (isProduction) {
                cookieString += "; Secure; HttpOnly";
            }
            document.cookie = cookieString;
            const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
            const redirectUri = window.location.origin + "/login/";
            const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user&state=${state}`;
            window.location.href = githubAuthUrl;
        } catch (error) {
            toast({ title: "GitHub Login failed", description: "Try to login with credentials", className: "text-left" });
        }
    };

    useEffect(() => {
        const code = searchParams.get("code");
        const stateFromUrl = searchParams.get("state");
        const cookieState = document.cookie .split('; ').find(row => row.startsWith('github_oauth_state='))?.split('=')[1];
        if (code) {
            const gihubLogin = async () => {
                try {
                    if (stateFromUrl !== cookieState || !stateFromUrl || !cookieState) {
                        throw new Error("State mismatch. Security check failed.");
                    }
                    await githubLogin(code, stateFromUrl);
                    document.cookie = "github_oauth_state=; path=/; max-age=0";
                    navigate("/dashboard");
                    toast({ description: "GitHub Login successfully" });
                } catch (error) {
                    document.cookie = "github_oauth_state=; path=/; max-age=0";
                    navigate("/login");
                    toast({ title: "GitHub Login failed", description: "Try to login with credentials", className: "text-left" });
                }
            };
            gihubLogin();
        }
    }, []);

    return (
        <Button variant="outline" onClick={handleGithubLogin}>
            <Icons.gitHub />
            GitHub
        </Button>
    );
}
