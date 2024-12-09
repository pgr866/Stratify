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
            <div className="fixed top-4 right-4">
                <ThemeToggle />
            </div>
            <img src="/logo.svg" alt="Logo" className="logo size-[25rem]" />
            <Button onClick={handleLogout}>Log out</Button>
            <DateTimeRangePicker></DateTimeRangePicker>
            <h1>Taxing Laughter: The Joke Tax Chronicles</h1>
            <p>Hola Mundo</p>
        </div>
    )
}
