import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';

function Admin() {
  const [activeTab, setActiveTab] = useState('historial');
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para el modal (solo para Alumnos y Apoderados)
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    tutorName: '',
    rfidCard: ''
  });

  // Historial de auditoría y filtros
  const [historialGlobal, setHistorialGlobal] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('');

  // Cargar datos desde Firebase según la pestaña activa
  useEffect(() => {
    fetchDatos();
  }, [activeTab]);

  const fetchDatos = async () => {
    setLoading(true);
    try {
      if (activeTab === 'usuarios' || activeTab === 'tarjetas') {
        const querySnapshot = await getDocs(collection(db, 'students'));
        const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsuarios(data);
      } else if (activeTab === 'historial') {
        const q = query(collection(db, 'pickup_events'), orderBy('timestamp', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistorialGlobal(data);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para Crear
  const abrirModalNuevo = () => {
    setEditandoId(null);
    setFormData({ name: '', courseId: '', tutorName: '', rfidCard: '' });
    setShowModal(true);
  };

  // Abrir modal para Editar
  const abrirModalEditar = (item) => {
    setEditandoId(item.id);
    setFormData({
      name: item.name || '',
      courseId: item.courseId || '',
      tutorName: item.tutorName || '',
      rfidCard: item.rfidCard || item.cardNo || ''
    });
    setShowModal(true);
  };

  // Guardar (Crear o Actualizar)
  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        const docRef = doc(db, 'students', editandoId);
        await updateDoc(docRef, {
          name: formData.name,
          courseId: formData.courseId,
          tutorName: formData.tutorName,
          rfidCard: formData.rfidCard
        });
        alert('¡Registro actualizado exitosamente!');
      } else {
        await addDoc(collection(db, 'students'), {
          name: formData.name,
          courseId: formData.courseId,
          tutorName: formData.tutorName,
          rfidCard: formData.rfidCard,
          cardStatus: 'active',
          status: 'active'
        });
        alert('¡Alumno registrado exitosamente!');
      }
      setShowModal(false);
      fetchDatos();
    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
      alert('Error al procesar la solicitud.');
    }
  };

  // Cambiar estado de la tarjeta (Bloquear / Activar por extravío)
  const handleToggleBloqueoTarjeta = async (item) => {
    const nuevoEstado = item.cardStatus === 'blocked' ? 'active' : 'blocked';
    const mensaje = nuevoEstado === 'blocked' 
      ? `¿Estás seguro de bloquear la tarjeta de ${item.tutorName} por extravío o robo?` 
      : `¿Deseas reactivar la tarjeta de ${item.tutorName}?`;

    if (window.confirm(mensaje)) {
      try {
        const docRef = doc(db, 'students', item.id);
        await updateDoc(docRef, { cardStatus: nuevoEstado });
        fetchDatos();
      } catch (error) {
        console.error("Error al cambiar estado de tarjeta:", error);
        alert('No se pudo actualizar el estado de la tarjeta.');
      }
    }
  };

  // Eliminar alumno
  const handleEliminar = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este registro del padrón?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
        fetchDatos();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  // Filtrado de auditoría
  const historialFiltrado = historialGlobal.filter(item => {
    const coincideFecha = filtroFecha ? item.dateString === filtroFecha : true;
    const texto = busquedaAuditoria.toLowerCase();
    const coincideTexto = 
      (item.studentName && item.studentName.toLowerCase().includes(texto)) ||
      (item.tutorName && item.tutorName.toLowerCase().includes(texto)) ||
      (item.courseId && item.courseId.toLowerCase().includes(texto));

    return coincideFecha && coincideTexto;
  });

  const usuariosFiltrados = usuarios.filter(u => 
    (u.name && u.name.toLowerCase().includes(busqueda.toLowerCase())) ||
    (u.tutorName && u.tutorName.toLowerCase().includes(busqueda.toLowerCase())) ||
    (u.courseId && u.courseId.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="w-full h-full animate-fade-in pb-12">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-redland-primary">Panel de Administración</h2>
          <p className="text-slate-500">Gestión de retiros alumnos Junior</p>
        </div>
        
        {activeTab === 'usuarios' && (
          <button 
            onClick={abrirModalNuevo}
            className="bg-redland-secondary hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Alumno / Apoderado
          </button>
        )}
      </div>

      {/* Pestañas de Navegación del Admin */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('historial')}
          className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'historial' ? 'border-redland-primary text-redland-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🔍 Historial general
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'usuarios' ? 'border-redland-primary text-redland-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          👥 Alumnos y Apoderados
        </button>
        <button
          onClick={() => setActiveTab('tarjetas')}
          className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tarjetas' ? 'border-redland-primary text-redland-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          💳 RFID & Bloqueos
        </button>
      </div>

      {/* CONTENIDO DE LAS PESTAÑAS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
        
        {/* PESTAÑA 1: HISTORIAL GENERAL */}
        {activeTab === 'historial' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por texto:</label>
                  <input
                    type="text"
                    placeholder="Buscar alumno, curso..."
                    value={busquedaAuditoria}
                    onChange={(e) => setBusquedaAuditoria(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm w-full md:w-64 focus:outline-none focus:border-redland-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por fecha</label>
                  <input
                    type="text"
                    placeholder="Ej: 28-08-2026"
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm w-full md:w-48 focus:outline-none focus:border-redland-primary"
                  />
                </div>
              </div>
              
              {filtroFecha && (
                <button
                  onClick={() => setFiltroFecha('')}
                  className="text-xs text-red-600 font-semibold hover:underline self-end md:self-auto"
                >
                  Limpiar fecha
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redland-secondary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3 font-semibold">Fecha / Hora</th>
                      <th className="p-3 font-semibold">Curso</th>
                      <th className="p-3 font-semibold">Alumno</th>
                      <th className="p-3 font-semibold">Apoderado</th>
                      <th className="p-3 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
                    {historialFiltrado.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400">
                          No se encontraron registros con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      historialFiltrado.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                            {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente'}
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-bold border border-slate-200">
                              {item.courseId || 'General'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{item.studentName}</td>
                          <td className="p-3 text-slate-600">{item.tutorName}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              item.status === 'alert_duplicate' ? 'bg-red-100 text-red-800 font-bold' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status === 'completed' ? '✓ Despachado' : item.status === 'alert_duplicate' ? '⚠️ Duplicado' : 'En Espera'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: USUARIOS */}
        {activeTab === 'usuarios' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <input
                type="text"
                placeholder="Buscar por alumno, apoderado o curso..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-sm w-full md:w-96 focus:outline-none focus:border-redland-primary"
              />
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redland-secondary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3 font-semibold">Alumno</th>
                      <th className="p-3 font-semibold">Curso</th>
                      <th className="p-3 font-semibold">Apoderado Autorizado</th>
                      <th className="p-3 font-semibold">Tarjeta RFID</th>
                      <th className="p-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
                    {usuariosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400">
                          No hay registros encontrados en la colección 'students'.
                        </td>
                      </tr>
                    ) : (
                      usuariosFiltrados.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">
                            {item.name || item.studentName || 'Sin nombre'}
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-bold border border-slate-200">
                              {item.courseId || 'Sin curso'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {item.tutorName || 'Sin apoderado'}
                          </td>
                          <td className="p-3 font-mono text-xs text-indigo-600 font-semibold">
                            {item.rfidCard || item.cardNo || 'Sin asignar'}
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => abrirModalEditar(item)}
                              className="text-indigo-600 hover:text-indigo-800 font-medium text-xs cursor-pointer transition-colors bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200 mr-2"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleEliminar(item.id)}
                              className="text-red-500 hover:text-red-700 font-medium text-xs cursor-pointer transition-colors bg-red-50 px-2.5 py-1 rounded border border-red-200"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 3: TARJETAS RFID & BLOQUEOS */}
        {activeTab === 'tarjetas' && (
          <div>
            <h3 className="text-base font-bold text-slate-700 mb-2">Gestión y Seguridad de Credenciales</h3>
            <p className="text-slate-500 text-sm mb-6">
              Supervisa las tarjetas asociadas y bloquea de inmediato aquellas que hayan sido reportadas como extraviadas o robadas.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3 font-semibold">Apoderado</th>
                    <th className="p-3 font-semibold">Alumno asociado</th>
                    <th className="p-3 font-semibold">Código Tarjeta RFID</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold text-right">Acción de Seguridad</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
                  {usuarios.map((item) => {
                    const isBlocked = item.cardStatus === 'blocked';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{item.tutorName}</td>
                        <td className="p-3 text-slate-600">{item.name} ({item.courseId})</td>
                        <td className="p-3 font-mono text-xs text-indigo-600 font-semibold">{item.rfidCard || item.cardNo || 'Sin asignar'}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isBlocked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isBlocked ? '🔒 Bloqueada' : 'Activa'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleToggleBloqueoTarjeta(item)}
                            className={`font-medium text-xs px-3 py-1.5 rounded cursor-pointer transition-colors border ${
                              isBlocked 
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                                : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {isBlocked ? '🔓 Reactivar Tarjeta' : '🔒 Bloquear Tarjeta'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL PARA CREAR O EDITAR ALUMNO (SOLO EN LA OTRA PESTAÑA) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editandoId ? 'Editar Alumno y Apoderado' : 'Registrar Nuevo Alumno y Apoderado'}
            </h3>
            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Alumno:</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-redland-primary"
                  placeholder="Ej: Amparo Marchant"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Curso:</label>
                <input 
                  type="text" 
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-redland-primary"
                  placeholder="Ej: 1 Básico Ant"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Apoderado:</label>
                <input 
                  type="text" 
                  required
                  value={formData.tutorName}
                  onChange={(e) => setFormData({...formData, tutorName: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-redland-primary"
                  placeholder="Ej: César Marchant"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código Tarjeta RFID (Hexadecimal):</label>
                <input 
                  type="text" 
                  required
                  value={formData.rfidCard}
                  onChange={(e) => setFormData({...formData, rfidCard: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-redland-primary"
                  placeholder="Ej: 1265420193"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-redland-secondary text-white rounded-lg text-sm font-semibold hover:bg-red-800 cursor-pointer shadow-sm"
                >
                  {editandoId ? 'Guardar Cambios' : 'Guardar Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;