import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Asegúrate de que la ruta a tu archivo firebase.js sea correcta
import { collection, onSnapshot } from 'firebase/firestore';

function Monitor() {
  const [retiros, setRetiros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Conexión en tiempo real con Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'pickup_events'),
      (snapshot) => {
        const alumnosData = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        
        // Filtramos solo los que están pendientes para que el guardia no vea los ya retirados
        const pendientes = alumnosData.filter(alumno => alumno.status !== 'completed');
        
        // Ordenamos para que los más recientes aparezcan primero (opcional, dependiendo de cómo guardes el timestamp)
        setRetiros(pendientes);
        setLoading(false);
      },
      (error) => {
        console.error("Error al escuchar Firestore:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full h-full animate-fade-in">
      {/* Cabecera interna del Monitor */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-redland-primary">Panel de Control de Puerta</h2>
          <p className="text-slate-500">Visualización en tiempo real de apoderados en espera</p>
        </div>
        
        {/* Indicador de conexión Firebase */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Sistema Activo</span>
        </div>
      </div>

      {/* Cuadrícula de Tarjetas */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-redland-secondary"></div>
        </div>
      ) : retiros.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm mt-12">
          <svg className="w-20 h-20 mx-auto text-slate-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-2xl font-bold text-slate-700">Sin retiros en espera</h3>
          <p className="text-slate-500 mt-2 text-lg">La puerta se encuentra despejada en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {retiros.map((item) => (
            <div 
              key={item.id} 
              className="bg-white border-l-8 border-redland-secondary rounded-xl p-6 shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-slate-100 text-redland-primary text-xs font-extrabold px-3 py-1 rounded-full border border-slate-200">
                    {item.grade || item.curso || 'CURSO NO ASIGNADO'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2 leading-tight">
                  {item.studentName || item.nombreAlumno || 'Alumno Desconocido'}
                </h2>
                <div className="bg-slate-50 rounded-lg p-3 mt-4 border border-slate-100">
                  <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Retira:</p>
                  <p className="text-sm text-slate-700 font-medium truncate">
                    {item.parentName || item.nombreApoderado || 'Apoderado no registrado'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Monitor;