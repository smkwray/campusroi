import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Institutions from "./pages/Institutions";
import InstitutionDetail from "./pages/InstitutionDetail";
import Fields from "./pages/Fields";
import FieldDetail from "./pages/FieldDetail";
import Compare from "./pages/Compare";
import Insights from "./pages/Insights";
import Methodology from "./pages/Methodology";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
