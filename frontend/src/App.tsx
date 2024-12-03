import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"

import { Button } from "@/components/ui/button"

import { DateRangePicker } from 'rsuite'
import 'rsuite/dist/rsuite.css'
document.head.insertAdjacentHTML('beforeend', `<style>.rs-calendar-time-dropdown-column ::after {display: none;}</style>`)

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div>
          <div>
            <a href="https://vite.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </div>
          <h1>Vite + React</h1>
          <div className="card">
            <ModeToggle />
            <Button variant="outline" onClick={() => setCount((count) => count + 1)}>count is {count}</Button>
            <DateRangePicker showOneCalendar ranges={[]} format="dd/MM/yyyy, HH:mm" />
            <p>
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className="read-the-docs">
            Click on the Vite and React logos to learn more
          </p>
        </div>
      </ThemeProvider>
    </>
  )
}

export default App
