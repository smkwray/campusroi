import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Institutions from "./pages/Institutions";
import InstitutionDetail from "./pages/InstitutionDetail";
import Fields from "./pages/Fields";
import FieldDetail from "./pages/FieldDetail";
import Compare from "./pages/Compare";
import Insights from "./pages/Insights";
import Methodology from "./pages/Methodology";

function NotFound() {
  return (
    <div className="empty-state">
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="#/" className="button">Go Home</a>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/institutions" element={<Institutions />} />
          <Route path="/institutions/:id" element={<InstitutionDetail />} />
          <Route path="/fields" element={<Fields />} />
          <Route path="/fields/:code" element={<FieldDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
