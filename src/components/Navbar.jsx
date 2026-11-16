import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const location = useLocation();
  const { user, role, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  let roleName = 'Monitor en Vivo';
  if (location.pathname.includes('admin')) roleName = 'Administración';
  if (location.pathname.includes('docente')) roleName = 'Panel Docente';

  // Enlaces visibles según el rol (misma lógica de antes, ahora en una lista
  // para dibujarlos igual en el menú de escritorio y en el móvil).
  const enlaces = [
    { to: '/monitor', label: 'Monitor', visible: true },
    { to: '/docente', label: 'Docente', visible: role === 'docente' || role === 'admin' },
    { to: '/admin', label: 'Admin', visible: role === 'admin' },
  ].filter((enlace) => enlace.visible);

  const claseEnlace = (to, extra = '') =>
    `text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
      location.pathname === to ? 'bg-redland-secondary text-white' : 'text-slate-300 hover:bg-white/10'
    } ${extra}`;

  const cerrarMenu = () => setMenuAbierto(false);

  const handleLogout = () => {
    cerrarMenu();
    logout();
  };

  return (
    <nav className="bg-redland-primary border-b-4 border-redland-secondary shadow-md">
      <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          {/* Logo sin fondo blanco; más chico en móvil para dejar espacio */}
          <img src="/logo.png" alt="Redland School" className="h-10 md:h-14 w-auto object-contain shrink-0" />
          <div className="border-l-2 border-slate-600 pl-3 md:pl-4 min-w-0">
            <p className="text-xs md:text-sm text-slate-300 font-medium tracking-wide whitespace-nowrap">Sistema de Retiros</p>
            <p className="text-base md:text-lg font-bold text-white leading-tight">{roleName}</p>
          </div>
        </div>

        {/* Menú de navegación: solo en pantallas medianas y grandes */}
        <div className="hidden md:flex items-center gap-2">
          {enlaces.map((enlace) => (
            <Link key={enlace.to} to={enlace.to} className={claseEnlace(enlace.to)}>
              {enlace.label}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-3 pl-4 ml-2 border-l-2 border-slate-600">
              <span className="text-xs text-slate-300">{user.email}</span>
              <button
                onClick={logout}
                className="text-sm font-semibold px-3 py-2 rounded-lg text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
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

        {/* Botón hamburguesa: solo en móvil */}
        <button
          type="button"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="menu-movil"
          className="md:hidden shrink-0 p-2 rounded-lg text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
        >
          {menuAbierto ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Panel desplegable del menú móvil */}
      {menuAbierto && (
        <div id="menu-movil" className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.to}
              to={enlace.to}
              onClick={cerrarMenu}
              className={claseEnlace(enlace.to, 'block py-3')}
            >
              {enlace.label}
            </Link>
          ))}

          <div className="mt-2 pt-3 border-t border-white/10">
            {user ? (
              <>
                <p className="text-xs text-slate-400 px-4 mb-2 break-all">{user.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-sm font-semibold px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={cerrarMenu}
                className="block text-sm font-semibold px-4 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
