import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

function Docente() {
  const [retiros, setRetiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCurso, setFiltroCurso] = useState('TODOS');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'pickup_events'),
      (snapshot) => {
        const alumnosData = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setRetiros(alumnosData);
        setLoading(false);
      },
      (error) => {
        console.error("Error al escuchar Firestore:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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

  const pendientes = retiros.filter(item => item.status !== 'completed');
  const completados = retiros.filter(item => item.status === 'completed');

  const cursosDisponibles = ['TODOS', ...new Set(retiros.map(item => item.courseId || item.grade || item.curso || 'General').filter(Boolean))];

  const pendientesFiltrados = pendientes.filter(item => {
    if (filtroCurso === 'TODOS') return true;
    const cursoItem = item.courseId || item.grade || item.curso || 'General';
    return cursoItem === filtroCurso;
  });

  return (
    <div className="w-full h-full animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-redland-primary">Panel de Gestión Docente</h2>
          <p className="text-slate-500">Administra, despacha y revisa el registro de tu curso</p>
        </div>
        
        {!loading && retiros.length > 0 && (
          <div className="flex flex-wrap bg-white rounded-lg p-1 shadow-sm border border-slate-200">
            {cursosDisponibles.map((curso) => (
              <button
                key={curso}
                onClick={() => setFiltroCurso(curso)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                  filtroCurso === curso
                    ? 'bg-redland-primary text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {curso}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-redland-secondary"></div>
        </div>
      ) : (
        <>
          {/* SECCIÓN PENDIENTES */}
          <div className="mb-12">
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-redland-secondary inline-block"></span>
              Alumnos en Espera de Retiro ({pendientesFiltrados.length})
            </h3>

            {pendientesFiltrados.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <p className="text-slate-400">No hay alumnos en espera para el filtro seleccionado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pendientesFiltrados.map((item) => (
                  <div key={item.id} className="bg-white border-t-4 border-redland-primary rounded-xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
                    <div className="mb-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-slate-100 text-redland-primary text-xs font-bold px-3 py-1 rounded-md border border-slate-200">
                          {item.courseId || item.grade || item.curso || 'General'}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-800 mb-1">
                        {item.studentName || item.nombreAlumno}
                      </h2>
                      <p className="text-sm text-slate-500">
                        Retira: <span className="font-semibold text-slate-700">{item.tutorName || item.parentName || item.nombreApoderado}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => entregarAlumno(item.id)}
                      className="w-full bg-redland-secondary hover:bg-red-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Despachar Alumno
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN HISTORIAL DIARIO (VERDES) */}
          {completados.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block"></span>
                Historial de Alumnos Ya Retirados Hoy ({completados.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {completados.map((item) => (
                  <div key={item.id} className="bg-emerald-50/60 border-t-4 border-emerald-500 rounded-xl p-6 shadow-sm flex flex-col justify-between opacity-90">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-md border border-emerald-200">
                          {item.courseId || item.grade || item.curso}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                          Despachado
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-emerald-900 mb-1">
                        {item.studentName || item.nombreAlumno}
                      </h2>
                      <p className="text-sm text-emerald-700">
                        Retirado por: <span className="font-semibold text-emerald-900">{item.tutorName || item.parentName || item.nombreApoderado}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Docente;