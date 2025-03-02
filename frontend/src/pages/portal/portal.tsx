import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { MyStrategies } from "./components/my-strategies"
import { ExploreStrategies } from "./components/explore-strategies"
import { ApiKeys } from "./components/api-keys"
import { Dashboard } from "./components/dashboard/dashboard"
import { Settings } from "./components/settings/settings"
import { FileChartPie, ChartNoAxesCombined, Globe, Key, UserRound, LogOut, Settings as SettingsIcon } from "lucide-react";
import { logout, getCurrentUser } from "@/api";

export function Portal() {
	const navigate = useNavigate();
	const [user, setUser] = useState<{ username: string; email: string } | null>(null);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const userData = await getCurrentUser();
				setUser(userData.data);
			} catch (error) {
				console.error("Error fetching user:", error);
			}
		};
		fetchUser();
	}, []);

	const handleLogout = async () => {
		await logout();
		navigate("/home");
	};
	return (
		<Tabs defaultValue="dashboard" className="h-auto">
			<div className="flex flex-wrap items-center h-auto px-4 py-1 border-b">
				<div className="flex gap-2 hover:drop-shadow-[0_0_2em_hsl(var(--primary))]">
					<img src="/logo.svg" alt="Logo" className="size-8" />
					<h1 className="text-2xl">Stratify</h1>
				</div>
				<TabsList className="flex flex-wrap h-auto mx-auto bg-transparent" style={{ marginTop: '0' }}>
					<TabsTrigger className="px-2 md:px-4" value="dashboard"><FileChartPie size={18} className="mr-1" />Dashboard</TabsTrigger>
					<TabsTrigger className="px-2 md:px-4" value="my-strategies"><ChartNoAxesCombined size={18} className="mr-1" />My Strategies</TabsTrigger>
					<TabsTrigger className="px-2 md:px-4" value="explore-strategies"><Globe size={18} className="mr-1" />Explore Strategies</TabsTrigger>
					<TabsTrigger className="px-2 md:px-4" value="api-keys"><Key size={18} className="mr-1" />API Keys</TabsTrigger>
				</TabsList>
				<div className="flex items-center gap-1">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="relative size-10">
								<UserRound />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-56" align="end" forceMount>
							<DropdownMenuLabel className="font-normal">
								<div className="flex flex-col space-y-1">
									<p className="text-sm font-medium leading-none">{user?.username || "Cargando..."}</p>
									<p className="text-xs leading-none text-muted-foreground">{user?.email || "Cargando..."}</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="p-0">
								<TabsList className="h-auto p-0 bg-transparent w-full">
									<TabsTrigger className="px-2 py-1.5 w-full text-foreground font-normal gap-2 data-[state=active]:bg-transparent justify-start" value="settings">
										<SettingsIcon />
										Settings
									</TabsTrigger>
								</TabsList>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={handleLogout}><LogOut />Log out</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<ThemeToggle />
				</div>
			</div>
			<TabsContent className="py-2 sm:px-4" value="dashboard"><Dashboard /></TabsContent>
			<TabsContent className="py-2 sm:px-4" value="my-strategies"><MyStrategies /></TabsContent>
			<TabsContent className="py-2 sm:px-4" value="explore-strategies"><ExploreStrategies /></TabsContent>
			<TabsContent className="py-2 sm:px-4" value="api-keys"><ApiKeys /></TabsContent>
			<TabsContent className="py-2 sm:px-4" value="settings"><Settings /></TabsContent>
		</Tabs>
	)
}
