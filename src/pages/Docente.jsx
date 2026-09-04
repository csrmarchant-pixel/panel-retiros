import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { toast } from 'react-toastify';

// Debe calzar con el formato que genera n8n: dd-MM-yyyy en America/Santiago
function getTodayDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date());
  const day = parts.find((p) => p.type === 'day').value;
  const month = parts.find((p) => p.type === 'month').value;
  const year = parts.find((p) => p.type === 'year').value;
  return `${day}-${month}-${year}`;
}

function Docente() {
  const [retiros, setRetiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCurso, setFiltroCurso] = useState('TODOS');
  const isFirstSnapshot = useRef(true);

  useEffect(() => {
    const todayQuery = query(
      collection(db, 'pickup_events'),
      where('dateString', '==', getTodayDateString())
    );

    const unsubscribe = onSnapshot(
      todayQuery,
      (snapshot) => {
        // Evita que la primera carga (con todo lo de hoy) dispare toasts
        // como si fueran eventos recién ocurridos.
        if (!isFirstSnapshot.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();

              if (data.status === 'alert_duplicate') {
                toast.error(`⚠️ ¡Atención Docente! El apoderado ${data.tutorName || 'Desconocido'} ya retiró su tarjeta hoy para el alumno ${data.studentName || 'Estudiante'}.`, {
                  position: "top-right",
                  autoClose: 7000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true,
                });
              }

              if (data.status === 'blocked_attempt') {
                toast.error(`🚫 Tarjeta BLOQUEADA usada en portería: ${data.tutorName || 'apoderado desconocido'} (alumno: ${data.studentName || 'sin identificar'}).`, {
                  position: "top-right",
                  autoClose: false,
                });
              }

              if (data.status === 'unrecognized') {
                toast.warning(`❓ Tarjeta no reconocida en el lector (código ${data.cardNo || '—'}).`, {
                  position: "top-right",
                  autoClose: 7000,
                });
              }
            }
          });
        }

        const alumnosData = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));
        setRetiros(alumnosData);
        setLoading(false);
        isFirstSnapshot.current = false;
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

  const alertasDuplicadas = retiros.filter(item => item.status === 'alert_duplicate');
  const alertasSeguridad = retiros.filter(item => item.status === 'blocked_attempt' || item.status === 'unrecognized');
  const todasLasAlertas = [...alertasDuplicadas, ...alertasSeguridad];
  const pendientes = retiros.filter(item => item.status === 'waiting');
  const completados = retiros.filter(item => item.status === 'completed');

  const cursosDisponibles = ['TODOS', ...new Set(retiros.map(item => item.courseId || item.grade || item.curso || 'General').filter(Boolean))];

  const pendientesFiltrados = pendientes.filter(item => {
    if (filtroCurso === 'TODOS') return true;
    const cursoItem = item.courseId || item.grade || item.curso || 'General';
    return cursoItem === filtroCurso;
  });

  return (
    <div className="w-full h-full animate-fade-in pb-12">
      {/* Cabecera */}
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
        /* LAYOUT DE DOS COLUMNAS: Izquierda (Dashboard principal) | Derecha (Panel de Alertas) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* COLUMNA PRINCIPAL (Ocupa 3 espacios en pantallas grandes) */}
          <div className="lg:col-span-3 space-y-10">
            
            {/* SECCIÓN PENDIENTES */}
            <div>
              <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-redland-secondary inline-block"></span>
                Alumnos en Espera de Retiro ({pendientesFiltrados.length})
              </h3>

              {pendientesFiltrados.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                  <p className="text-slate-400">No hay alumnos en espera para el filtro seleccionado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pendientesFiltrados.map((item) => (
                    <div key={item.id} className="bg-white border-t-4 border-redland-primary rounded-xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
                      <div className="mb-6">
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-slate-100 text-redland-primary text-xs font-bold px-3 py-1 rounded-md border border-slate-200">
                            {item.courseId || item.grade || item.curso || 'General'}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">
                          {item.studentName}
                        </h2>
                        <p className="text-sm text-slate-500">
                          Retira: <span className="font-semibold text-slate-700">{item.tutorName}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                          {item.studentName}
                        </h2>
                        <p className="text-sm text-emerald-700">
                          Retirado por: <span className="font-semibold text-emerald-900">{item.tutorName}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA LATERAL DERECHA: ALERTAS (duplicados, tarjetas bloqueadas, no reconocidas) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-red-50/80 border border-red-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-red-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse inline-block"></span>
                ⚠️ Alertas ({todasLasAlertas.length})
              </h3>

              {todasLasAlertas.length === 0 ? (
                <div className="bg-white/60 border border-red-100 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400">Sin alertas hoy.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                  {todasLasAlertas.map((item) => (
                    <div key={item.id} className="bg-white border-l-4 border-red-600 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase">
                            {item.status === 'blocked_attempt' && '🚫 Bloqueada'}
                            {item.status === 'unrecognized' && '❓ No reconocida'}
                            {item.status === 'alert_duplicate' && (item.courseId || item.grade || item.curso || 'General')}
                          </span>
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                          </span>
                        </div>

                        {item.status === 'unrecognized' ? (
                          <>
                            <h4 className="text-base font-bold text-slate-800 mb-1 leading-tight">Tarjeta no registrada</h4>
                            <p className="text-xs text-slate-500 mb-2">
                              Código: <span className="font-semibold text-red-700">{item.cardNo || '—'}</span>
                            </p>
                            <p className="text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100">
                              No corresponde a ningún apoderado del padrón.
                            </p>
                          </>
                        ) : (
                          <>
                            <h4 className="text-base font-bold text-slate-800 mb-1 leading-tight">
                              {item.studentName}
                            </h4>
                            <p className="text-xs text-slate-500 mb-2">
                              Intento: <span className="font-semibold text-red-700">{item.tutorName}</span>
                            </p>
                            <p className="text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100">
                              {item.status === 'blocked_attempt'
                                ? 'Tarjeta marcada como bloqueada en el padrón.'
                                : 'Tarjeta pasada previamente hoy.'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default Docente;