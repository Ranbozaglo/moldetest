import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/AuthContext"
import { PopupProvider } from "@/components/ui/popup"

function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <Pages />
        <Toaster />
      </PopupProvider>
    </AuthProvider>
  )
}

export default App 