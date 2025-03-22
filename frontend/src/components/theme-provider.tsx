import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/App";
import { toggleTheme } from "@/api";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; handleToggleTheme: () => void } | undefined>(undefined);

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const { user } = useSession();
	const [theme, setTheme] = useState<Theme>(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

	useEffect(() => {
		if (user != null) setTheme(user.dark_theme ? "dark" : "light");
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme === "light");
	}, [user, theme]);

	const handleToggleTheme = async () => {
		if (user) {
			const response = await toggleTheme();
			user.dark_theme = response?.data?.dark_theme;
			setTheme(user.dark_theme ? "dark" : "light");
		} else {
			setTheme(theme === "dark" ? "light" : "dark");
		}
	};

	return <ThemeContext.Provider value={{ theme, handleToggleTheme }}>{children}</ThemeContext.Provider>;
}
