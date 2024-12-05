import logo from '/logo.svg'
import './App.css'
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { DateTimeRangePicker } from "@/components/date-time-range-picker"

function App() {

  return (
    <>
      <div>
        <img src={logo} className="logo" alt="Logo" />
        <Button>Hola</Button>
        <ThemeToggle />
        <DateTimeRangePicker></DateTimeRangePicker>
        <h1>Taxing Laughter: The Joke Tax Chronicles</h1>
        <p>Hola Mundo.</p>
      </div>

    </>
  )
}

export default App
