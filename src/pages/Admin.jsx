import React, { useState } from 'react';

function Admin() {
  // Estado para controlar qué pestaña está activa
  const [activeTab, setActiveTab] = useState('usuarios');

  return (
    <div className="w-full h-full animate-fade-in">
      {/* Cabecera del Administrador */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-redland-primary">Centro de Comando</h2>
          <p className="text-slate-500">Gestión integral de usuarios, tarjetas RFID y auditoría</p>
        </div>
        
        {/* Botón de Acción Principal */}
        <button className="bg-redland-secondary hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Registro
        </button>
      </div>

      {/* Sistema de Pestañas (Tabs) */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'usuarios'
              ? 'border-redland-primary text-redland-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Alumnos y Apoderados
        </button>
        <button
          onClick={() => setActiveTab('tarjetas')}
          className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tarjetas'
              ? 'border-redland-primary text-redland-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Dispositivos RFID
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'historial'
              ? 'border-redland-primary text-redland-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Historial de Retiros
        </button>
      </div>

      {/* Contenido Dinámico de las Pestañas */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* PESTAÑA 1: USUARIOS */}
        {activeTab === 'usuarios' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold border-b border-slate-200">Alumno</th>
                  <th className="p-4 font-semibold border-b border-slate-200">Curso</th>
                  <th className="p-4 font-semibold border-b border-slate-200">Apoderado Autorizado</th>
                  <th className="p-4 font-semibold border-b border-slate-200 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                <tr className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-redland-primary">Ejemplo Alumno</td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">1° Básico</span>
                  </td>
                  <td className="p-4">Ejemplo Apoderado</td>
                  <td className="p-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium mr-4 cursor-pointer transition-colors">Editar</button>
                    <button className="text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors">Eliminar</button>
                  </td>
                </tr>
                {/* Mensaje de espera para nuestra importación de base de datos */}
                <tr>
                  <td colSpan="4" className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                      </svg>
                      <p>Estructura lista. A la espera de importar los usuarios de prueba desde Firebase.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* PESTAÑA 2: TARJETAS RFID */}
        {activeTab === 'tarjetas' && (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Módulo de Sincronización Hikvision</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Aquí gestionaremos los códigos hexadecimales de las tarjetas que lee el hardware y los vincularemos con cada apoderado.
            </p>
          </div>
        )}

        {/* PESTAÑA 3: HISTORIAL */}
        {activeTab === 'historial' && (
          <div className="p-12 text-center">
             <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Auditoría de Retiros</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Registro histórico de todos los alumnos que fueron marcados como "Despachados" por los docentes, con fecha y hora exacta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;