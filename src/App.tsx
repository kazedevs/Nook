import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Scanner } from "@/pages/Scanner";
import { Cleaner } from "@/pages/Cleaner";
import { Settings } from "@/pages/Settings";
import { LicenseProvider } from "@/contexts/LicenseContext";

function AppInner() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/cleaner" element={<Cleaner />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

function App() {
  return (
    <LicenseProvider>
      <AppInner />
    </LicenseProvider>
  );
}

export default App;
