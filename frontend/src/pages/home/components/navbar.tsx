import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

export function Navbar() {

	return (
		<header className="sticky top-0 z-40 w-screen -mx-[calc(50vw-50%+6px)] backdrop-blur-lg">
			<NavigationMenu className="mx-auto">
				<NavigationMenuList className="flex justify-between w-screen max-w-[90vw] h-14 gap-8">
					<NavigationMenuItem className="font-bold">
						<a href="/home" rel="noreferrer noopener">
							<h4 className="flex gap-2">
								<img src="/logo.svg" alt="Logo" className="logo size-[2rem]" />
								Stratify
							</h4>
						</a>
					</NavigationMenuItem>

					<div className="flex gap-2">
						<a href="https://github.com/pgr866/TFG" rel="noreferrer noopener" target="_blank">
							<Button variant="secondary">
								<GitHubLogoIcon />
								GitHub
							</Button>
						</a>
						<ThemeToggle size="9" />
					</div>
				</NavigationMenuList>
			</NavigationMenu>
			<Separator className="absolute left-0 w-full" />
		</header>
	)
}
