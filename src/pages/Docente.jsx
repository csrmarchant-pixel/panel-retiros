import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

function Docente() {
  const [retiros, setRetiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCurso, setFiltroCurso] = useState('TODOS');

  // Escuchar a Firebase en tiempo real
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'pickup_events'),
      (snapshot) => {
        const alumnosData = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        
        // Solo mostramos los pendientes
        const pendientes = alumnosData.filter(alumno => alumno.status !== 'completed');
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

  // Función para marcar la entrega (esto lo borra del monitor del guardia)
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

  // Generar botones de filtro dinámicamente según los alumnos que vayan llegando
  const cursosDisponibles = ['TODOS', ...new Set(retiros.map(item => item.grade || item.curso || 'General').filter(Boolean))];

  const alumnosFiltrados = retiros.filter(item => {
    if (filtroCurso === 'TODOS') return true;
    const cursoItem = item.grade || item.curso || 'General';
    return cursoItem === filtroCurso;
  });

  return (
    <div className="w-full h-full animate-fade-in">
      {/* Cabecera y Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-redland-primary">Panel de Gestión Docente</h2>
          <p className="text-slate-500">Administra y despacha los alumnos de tu curso</p>
        </div>
        
        {/* Barra de Filtros Dinámicos */}
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

      {/* Cuadrícula de Tarjetas Interactivas */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-redland-secondary"></div>
        </div>
      ) : alumnosFiltrados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm mt-8">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-xl font-bold text-slate-700">
            {retiros.length === 0 ? "No hay alumnos en espera" : "No hay retiros para este curso"}
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {alumnosFiltrados.map((item) => (
            <div 
              key={item.id} 
              className="bg-white border-t-4 border-redland-primary rounded-xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow"
            >
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-slate-100 text-redland-primary text-xs font-bold px-3 py-1 rounded-md border border-slate-200">
                    {item.grade || item.curso || 'General'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">
                  {item.studentName || item.nombreAlumno || 'Nombre del Alumno'}
                </h2>
                <p className="text-sm text-slate-500">
                  Retira: <span className="font-semibold text-slate-700">{item.parentName || item.nombreApoderado || 'No especificado'}</span>
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
  );
}

export default Docente;