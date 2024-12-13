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

    const handleGithubLogin = async () => {
        try {
            const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
            const redirectUri = window.location.origin + "/login";
            const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user`;
            window.location.href = githubAuthUrl;
        } catch (error) {
            toast({ title: "GitHub Login failed", description: "Try to login with credentials", });
        }
    };

    useEffect(() => {
        const code = searchParams.get("code");
        if (code) {
            const gihubLogin = async () => {
                try {
                    await githubLogin(code);
                    navigate("/dashboard");
                    toast({ description: "GitHub Login successfully", });
                } catch (error) {
                    toast({ title: "GitHub Login failed", description: "Try to login with credentials", });
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
