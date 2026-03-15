import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { Dashboard } from "@/pages/Dashboard"
import { Scanner } from "@/pages/Scanner"
import { Cleaner } from "@/pages/Cleaner"
import { Settings } from "@/pages/Settings"
import { Paywall } from "@/components/Paywall"
import { LicenseProvider, useLicense } from "@/contexts/LicenseContext"

function AppInner() {
  const { showPaywall } = useLicense()

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/scanner"  element={<Scanner />} />
          <Route path="/cleaner"  element={<Cleaner />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>

      {showPaywall && <Paywall />}
    </Router>
  )
}

function App() {
  return (
    <LicenseProvider>
      <AppInner />
    </LicenseProvider>
  )
}

export default App