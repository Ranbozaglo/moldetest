import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Production debugging banner
const isProduction = window.location.hostname !== 'localhost';
console.log(`
🔍 ==========================================
🔍 ENVIRONMENT: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}
🔍 HOSTNAME: ${window.location.hostname}
🔍 URL: ${window.location.href}
🔍 ==========================================
`);

if (isProduction) {
  console.log('🔍 PROD DEBUG: Use debugBackend.* functions to test backend connectivity');
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 