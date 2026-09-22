import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { isPlaceholderConfig } from './lib/supabaseClient.js'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

if (isPlaceholderConfig()) {
  root.render(
    <React.StrictMode>
      <SetupScreen />
    </React.StrictMode>,
  )
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}
