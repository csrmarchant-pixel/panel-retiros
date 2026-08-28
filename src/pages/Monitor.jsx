import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';

function Monitor() {
  const [retiros, setRetiros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'pickup_events'),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            
            if (data.status === 'alert_duplicate') {
              toast.error(`⚠️ ¡Atención! El apoderado ${data.tutorName || 'Desconocido'} ya retiró su tarjeta hoy para el alumno ${data.studentName || 'Estudiante'}.`, {
                position: "top-right",
                autoClose: 7000,
              });
            }
          }
        });

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

  const pendientes = retiros.filter(item => item.status !== 'completed' && item.status !== 'alert_duplicate');
  const completados = retiros.filter(item => item.status === 'completed');

  return (
    <div className="w-full h-full animate-fade-in pb-12">
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-redland-primary">Panel de Control de Puerta</h2>
          <p className="text-slate-500">Visualización en tiempo real de apoderados en espera e historial diario</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Sistema Activo</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-redland-secondary"></div>
        </div>
      ) : (
        <>
          {/* SECCIÓN 1: EN ESPERA (Tarjetas grandes para los que están en la puerta ahora) */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-redland-secondary inline-block"></span>
              Alumnos en Espera ({pendientes.length})
            </h3>

            {pendientes.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
                <p className="text-slate-400">No hay apoderados esperando en este momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pendientes.map((item) => (
                  <div key={item.id} className="bg-white border-l-8 border-redland-secondary rounded-xl p-6 shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-slate-100 text-redland-primary text-xs font-extrabold px-3 py-1 rounded-full border border-slate-200">
                          {item.courseId || item.grade || item.curso || 'CURSO NO ASIGNADO'}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                          {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2 leading-tight">
                        {item.studentName || item.nombreAlumno}
                      </h2>
                      <div className="bg-slate-50 rounded-lg p-3 mt-4 border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Retira:</p>
                        <p className="text-sm text-slate-700 font-medium truncate">
                          {item.tutorName || item.parentName || item.nombreApoderado}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: HISTORIAL COMPACTO (Diseño de filas en tabla para alto volumen) */}
          {completados.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block"></span>
                  Historial de Retirados Hoy ({completados.length})
                </h3>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Hora</th>
                        <th className="py-3 px-4 font-semibold">Curso</th>
                        <th className="py-3 px-4 font-semibold">Alumno</th>
                        <th className="py-3 px-4 font-semibold">Retirado por</th>
                        <th className="py-3 px-4 font-semibold text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {completados.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                            {item.deliveredAt?.toDate ? item.deliveredAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md">
                              {item.courseId || item.grade || item.curso}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {item.studentName || item.nombreAlumno}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.tutorName || item.parentName || item.nombreApoderado}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                              ✓ Despachado
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Monitor;