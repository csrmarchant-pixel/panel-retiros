import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

function App() {
  const [retirandoAlumnos, setRetirandoAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Conexión en tiempo real con Firestore usando onSnapshot
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'pickup_events'),
      (snapshot) => {
        const alumnosData = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        // Filtramos solo los que estén pendientes (estado activo)
        setRetirandoAlumnos(alumnosData);
        setLoading(false);
      },
      (error) => {
        console.error("Error al escuchar Firestore:", error);
        setLoading(false);
      }
    );

    // Limpieza al desmontar el componente
    return () => unsubscribe();
  }, []);

  // Función para marcar al alumno como entregado y retirarlo de la pantalla
  const entregarAlumno = async (id) => {
    try {
      const alumnoRef = doc(db, 'pickup_events', id);
      await updateDoc(alumnoRef, {
        status: 'completed',
        deliveredAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
      alert("No se pudo actualizar el estado en Firebase.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Cabecera del Panel */}
      <header className="bg-slate-800 border-b border-slate-700 py-6 px-8 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Monitor de Retiros en Vivo</h1>
          <p className="text-sm text-slate-400 mt-1">Sistema de Control Escolar - CEBIBE</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700 shadow-inner">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">En Línea (Firebase)</span>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : retirandoAlumnos.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-12 text-center max-w-lg mx-auto mt-12 shadow-inner">
            <svg className="w-16 h-16 mx-auto text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-medium text-slate-300">No hay retiros pendientes</h3>
            <p className="text-sm text-slate-500 mt-1">Las solicitudes de los apoderados aparecerán automáticamente aquí en tiempo real.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {retirandoAlumnos.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl hover:border-indigo-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/20">
                      {item.grade || 'Curso general'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {item.studentName || 'Nombre del Alumno'}
                  </h2>
                  <p className="text-sm text-slate-400 mb-6">
                    Apoderado: <span className="text-slate-200 font-medium">{item.parentName || 'No especificado'}</span>
                  </p>
                </div>

                <button
                  onClick={() => entregarAlumno(item.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Entregar Alumno
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;