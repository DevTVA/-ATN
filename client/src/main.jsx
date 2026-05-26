import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: { fontSize: '13px', borderRadius: '10px', background: '#2C1810', color: '#F5EDE3' },
        success: { iconTheme: { primary: '#86EFAC', secondary: '#2C1810' } },
        error: { iconTheme: { primary: '#FCA5A5', secondary: '#2C1810' } },
      }}
    />
  </BrowserRouter>
)
