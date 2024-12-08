import './index.css'
import { StrictMode } from 'react'
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom";
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme-provider.tsx'

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
