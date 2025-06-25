import { useNavigate } from "react-router-dom";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

export function Hero() {
	const navigate = useNavigate();

	return (
		<section className="grid place-items-center py-20 md:py-32 gap-10">
			<div className="space-y-6 text-center">
				<main className="text-5xl md:text-6xl font-bold max-w-xl mx-auto">
					<h1 className="inline">
						<span className="inline bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">
							Stratify
						</span>
						{" "} — Interactive{" "}
						<span className="inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">
							Algorithmic Trading
						</span>
						{" "}Made Simple
					</h1>
				</main>
				<p className="lead lg:w-7/12 mx-auto">
					Design, backtest, and deploy customizable trading strategies with ease using our interactive full-stack platform.
				</p>
				<div className="flex justify-center md:space-x-4 mx-auto">
					<Button className="w-[50%] md:w-1/3 lg:w-1/4 xl:w-1/4" onClick={() => navigate("/login")}>Get Started</Button>
					<a href="https://github.com/pgr866/Stratify" rel="noreferrer noopener" target="_blank" className="w-[50%] md:w-1/3 lg:w-1/4 xl:w-1/4 relative">
						<Button variant="outline" className="w-full">
							<GitHubLogoIcon />
							GitHub Repository
						</Button>
					</a>
				</div>
			</div>
			{/* Shadow effect */}
			<div className="shadow"></div>
		</section>
	)
}
