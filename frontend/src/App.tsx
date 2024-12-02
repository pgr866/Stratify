import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { DateRangePicker } from 'rsuite'
import 'rsuite/dist/rsuite.css'
document.head.insertAdjacentHTML('beforeend', `<style>.rs-calendar-time-dropdown-column ::after {display: none;}</style>`)

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
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
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <DateRangePicker showOneCalendar ranges={[]} format="dd/MM/yyyy, HH:mm" />
    </>
  )
}

export default App
