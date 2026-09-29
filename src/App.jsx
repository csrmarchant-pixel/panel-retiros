import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Monitor from './pages/Monitor';
import Docente from './pages/Docente';
import Admin from './pages/Admin';
import Login from './pages/Login';

// 1. Importaciones de React-Toastify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Contenedor principal que ocupa toda la pantalla */}
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">

          {/* Barra superior corporativa */}
          <Navbar />

          {/* Área dinámica donde cargan las páginas */}
          <main className="flex-1 w-full max-w-7xl mx-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/monitor" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/monitor" element={<Monitor />} />
              <Route
                path="/docente"
                element={
                  <ProtectedRoute allowedRoles={['docente', 'admin']}>
                    <Docente />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>

          {/* Pie de página (Footer) */}
          <footer className="bg-redland-footer text-slate-400 py-4 text-center text-sm mt-auto">
            &copy; {new Date().getFullYear()} Redland. Todos los derechos reservados.
          </footer>
        </div>

        {/* 2. Contenedor global de notificaciones */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;