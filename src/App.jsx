import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Monitor from './pages/Monitor';
import Docente from './pages/Docente';
import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      {/* Contenedor principal que ocupa toda la pantalla */}
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        
        {/* Barra superior corporativa */}
        <Navbar />
        
        {/* Área dinámica donde cargan las páginas */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/monitor" />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/docente" element={<Docente />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>

        {/* Pie de página (Footer) */}
        <footer className="bg-redland-footer text-slate-400 py-4 text-center text-sm mt-auto">
          &copy; {new Date().getFullYear()} Redland. Todos los derechos reservados.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;