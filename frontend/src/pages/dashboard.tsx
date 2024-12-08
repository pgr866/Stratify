import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { DateTimeRangePicker } from "@/components/date-time-range-picker"
import { logout } from "../../api/api";

export function Dashboard() {

    const handleLogout = async () => {
        await logout();
        window.location.reload();
    };

    return (
        <div>
            <img src="/logo.svg" className="logo" alt="Logo" />
            <Button onClick={handleLogout}>Log out</Button>
            <ThemeToggle />
            <DateTimeRangePicker></DateTimeRangePicker>
            <h1>Taxing Laughter: The Joke Tax Chronicles</h1>
            <p>Hola Mundo.</p>
        </div>
    )
}
