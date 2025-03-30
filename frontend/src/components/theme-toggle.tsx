import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ size = "10" }) {
	const { handleToggleTheme } = useTheme();

	return (
		<div>
			<Button variant="ghost" className={`w-${size} h-${size}`} onClick={handleToggleTheme}>
				<Sun className="size-4 hidden transition-all dark:block" />
				<Moon className="size-4 block transition-all dark:hidden" />
			</Button>
		</div>
	);
}
