import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const location = useLocation();
  const { user, role, logout } = useAuth();

  let roleName = 'Monitor en Vivo';
  if (location.pathname.includes('admin')) roleName = 'Administración';
  if (location.pathname.includes('docente')) roleName = 'Panel Docente';

  return (
    <nav className="bg-redland-primary border-b-4 border-redland-secondary px-6 py-4 shadow-md flex justify-between items-center">
      <div className="flex items-center gap-4">
        {/* Logo sin fondo blanco y un poco más grande */}
        <img src="/logo.png" alt="Redland School" className="h-14 w-auto object-contain" />
        <div className="border-l-2 border-slate-600 pl-4">
          <p className="text-sm text-slate-300 font-medium tracking-wide">Sistema de Retiros</p>
          <p className="text-lg font-bold text-white">{roleName}</p>
        </div>
      </div>
      
      {/* Menú de navegación rápido */}
      <div className="flex items-center gap-2">
        <Link 
          to="/monitor" 
          className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${location.pathname === '/monitor' ? 'bg-redland-secondary text-white' : 'text-slate-300 hover:bg-white/10'}`}
        >
          Monitor
        </Link>
        {(role === 'docente' || role === 'admin') && (
          <Link
            to="/docente"
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${location.pathname === '/docente' ? 'bg-redland-secondary text-white' : 'text-slate-300 hover:bg-white/10'}`}
          >
            Docente
          </Link>
        )}
        {role === 'admin' && (
          <Link
            to="/admin"
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${location.pathname === '/admin' ? 'bg-redland-secondary text-white' : 'text-slate-300 hover:bg-white/10'}`}
          >
            Admin
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-3 pl-4 ml-2 border-l-2 border-slate-600">
            <span className="text-xs text-slate-300 hidden md:inline">{user.email}</span>
            <button
              onClick={logout}
              className="text-sm font-semibold px-3 py-2 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
            >
              Salir
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-sm font-semibold px-4 py-2 rounded-lg ml-2 bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;