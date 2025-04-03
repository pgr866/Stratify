import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/App";
import { toggleTheme } from "@/api";
import { toast } from "sonner"

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; handleToggleTheme: () => void } | undefined>(undefined);

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
	const { user, setUser } = useSession();
	const [theme, setTheme] = useState<Theme>(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

	useEffect(() => {
		if (user) {
			setTheme(user.dark_theme ? "dark" : "light");
		}
	}, [user]);
	
	useEffect(() => {
		document.documentElement.classList.remove("dark", "light");
		document.documentElement.classList.add(theme);
	}, [theme]);

	const handleToggleTheme = async () => {
		if (user) {
			try {
				const response = await toggleTheme();
				setUser({ ...user, dark_theme: response.data.dark_theme });
			} catch (error) {
				const axiosError = error as { isAxiosError?: boolean; response?: { data?: Record<string, unknown> } };
				const errorMessage = axiosError?.isAxiosError && axiosError.response?.data
					? Object.entries(axiosError.response.data).map(([k, v]) =>
						k === "non_field_errors" || k === "detail" ? (Array.isArray(v) ? v[0] : v) : `${k}: ${(Array.isArray(v) ? v[0] : v)}`).shift()
					: "Something went wrong";
				toast("Failed to toggle theme", { description: errorMessage });
			}
		} else {
			setTheme(theme === "dark" ? "light" : "dark");
		}
	};

	const contextValue = React.useMemo(() => ({ theme, handleToggleTheme }), [theme, handleToggleTheme]);

	return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
