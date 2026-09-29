import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

function Admin() {
  const { user: currentUser } = useAuth();
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
    tutorId: '',
    rfidCard: ''
  });

  // Historial de auditoría y filtros
  const [historialGlobal, setHistorialGlobal] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('');

  // Staff Junior (docentes/admins autorizados a entrar al panel)
  const [staffList, setStaffList] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editandoStaffEmail, setEditandoStaffEmail] = useState(null);
  const [staffFormData, setStaffFormData] = useState({
    email: '',
    role: 'docente',
    courseIds: [],
  });
  // Cursos reales, sacados del padrón de alumnos (students), no una lista inventada
  const [cursosDisponibles, setCursosDisponibles] = useState([]);

  // Importación masiva de alumnos vía CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRows, setCsvRows] = useState([]); // cada fila: { name, courseId, tutorName, tutorId, rfidCard, _valid, _errores }
  const [importing, setImporting] = useState(false);

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
      } else if (activeTab === 'staff') {
        const [staffSnapshot, studentsSnapshot] = await Promise.all([
          getDocs(collection(db, 'staff_junior')),
          getDocs(collection(db, 'students')),
        ]);
        const staffData = staffSnapshot.docs.map(d => ({ email: d.id, ...d.data() }));
        setStaffList(staffData);

        const cursos = [...new Set(
          studentsSnapshot.docs
            .map(d => d.data().courseId)
            .filter(Boolean)
        )].sort();
        setCursosDisponibles(cursos);
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
    setFormData({ name: '', courseId: '', tutorName: '', tutorId: '', rfidCard: '' });
    setShowModal(true);
  };

  // Abrir modal para Editar
  const abrirModalEditar = (item) => {
    setEditandoId(item.id);
    setFormData({
      name: item.name || '',
      courseId: item.courseId || '',
      tutorName: item.tutorName || '',
      tutorId: item.tutorId || '',
      rfidCard: item.rfidCard || item.cardNo || ''
    });
    setShowModal(true);
  };

  // Guardar (Crear o Actualizar)
  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!formData.tutorId.trim()) {
      alert('El ID de Apoderado (tutorId) es obligatorio: es lo que n8n usa para reconocer la tarjeta al retirar al alumno.');
      return;
    }

    try {
      if (editandoId) {
        const docRef = doc(db, 'students', editandoId);
        await updateDoc(docRef, {
          name: formData.name,
          courseId: formData.courseId,
          tutorName: formData.tutorName,
          tutorId: formData.tutorId,
          rfidCard: formData.rfidCard
        });
        alert('¡Registro actualizado exitosamente!');
      } else {
        await addDoc(collection(db, 'students'), {
          name: formData.name,
          courseId: formData.courseId,
          tutorName: formData.tutorName,
          tutorId: formData.tutorId,
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

  // ---- Importación masiva de alumnos vía CSV ----

  const COLUMNAS_CSV = ['name', 'courseId', 'tutorName', 'tutorId', 'rfidCard'];

  // Parser simple de CSV: soporta campos entre comillas con comas adentro.
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let dentroComillas = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        dentroComillas = !dentroComillas;
      } else if (char === ',' && !dentroComillas) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const descargarPlantillaCSV = () => {
    const encabezado = 'name,courseId,tutorName,tutorId,rfidCard';
    const ejemplo = 'Amparo Marchant,1 Básico A,César Marchant,1,1265420193';
    const contenido = `${encabezado}\n${ejemplo}\n`;
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_alumnos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleArchivoCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const texto = event.target.result;
      // Soporta tanto \r\n como \n, y descarta líneas vacías al final.
      const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');

      if (lineas.length < 2) {
        alert('El archivo no tiene filas de datos (solo encabezado, o está vacío).');
        return;
      }

      const encabezado = parseCSVLine(lineas[0]).map((h) => h.trim());
      const indices = COLUMNAS_CSV.map((col) => encabezado.indexOf(col));

      if (indices[0] === -1 || indices[1] === -1 || indices[2] === -1 || indices[3] === -1) {
        alert('El encabezado del CSV debe incluir al menos: name, courseId, tutorName, tutorId (rfidCard es opcional).');
        return;
      }

      const filas = lineas.slice(1).map((linea) => {
        const valores = parseCSVLine(linea);
        const row = {
          name: valores[indices[0]] || '',
          courseId: valores[indices[1]] || '',
          tutorName: valores[indices[2]] || '',
          tutorId: valores[indices[3]] || '',
          rfidCard: indices[4] !== -1 ? (valores[indices[4]] || '') : '',
        };

        const errores = [];
        if (!row.name) errores.push('falta nombre del alumno');
        if (!row.courseId) errores.push('falta curso');
        if (!row.tutorName) errores.push('falta nombre del apoderado');
        if (!row.tutorId) errores.push('falta tutorId (ID Hikvision)');

        return { ...row, _valid: errores.length === 0, _errores: errores };
      });

      setCsvRows(filas);
      setShowImportModal(true);
    };
    reader.readAsText(file, 'UTF-8');

    // Permite volver a seleccionar el mismo archivo si lo corrige y reintenta
    e.target.value = '';
  };

  const filasValidas = csvRows.filter((r) => r._valid);
  const filasInvalidas = csvRows.filter((r) => !r._valid);

  const confirmarImportacionCSV = async () => {
    if (filasValidas.length === 0) return;
    setImporting(true);

    try {
      // writeBatch soporta máx. 500 operaciones; nos quedamos con margen.
      const LOTE_MAX = 450;
      for (let i = 0; i < filasValidas.length; i += LOTE_MAX) {
        const lote = filasValidas.slice(i, i + LOTE_MAX);
        const batch = writeBatch(db);
        lote.forEach((fila) => {
          const nuevoRef = doc(collection(db, 'students'));
          batch.set(nuevoRef, {
            name: fila.name,
            courseId: fila.courseId,
            tutorName: fila.tutorName,
            tutorId: fila.tutorId,
            rfidCard: fila.rfidCard,
            cardStatus: 'active',
            status: 'active',
          });
        });
        await batch.commit();
      }

      alert(`¡Listo! Se importaron ${filasValidas.length} alumno(s).${filasInvalidas.length > 0 ? ` ${filasInvalidas.length} fila(s) se omitieron por datos incompletos.` : ''}`);
      setShowImportModal(false);
      setCsvRows([]);
      setCsvFileName('');
      fetchDatos();
    } catch (error) {
      console.error("Error al importar CSV:", error);
      alert('Ocurrió un error durante la importación. Revisa la consola para más detalles.');
    } finally {
      setImporting(false);
    }
  };

  // ---- Staff Junior (docentes/admins autorizados) ----

  const abrirModalNuevoStaff = () => {
    setEditandoStaffEmail(null);
    setStaffFormData({ email: '', role: 'docente', courseIds: [] });
    setShowStaffModal(true);
  };

  const abrirModalEditarStaff = (item) => {
    setEditandoStaffEmail(item.email);
    setStaffFormData({
      email: item.email,
      role: item.role || 'docente',
      courseIds: item.courseIds || [],
    });
    setShowStaffModal(true);
  };

  const toggleCursoEnFormulario = (curso) => {
    setStaffFormData((prev) => {
      const yaEsta = prev.courseIds.includes(curso);
      return {
        ...prev,
        courseIds: yaEsta
          ? prev.courseIds.filter((c) => c !== curso)
          : [...prev.courseIds, curso],
      };
    });
  };

  const handleGuardarStaff = async (e) => {
    e.preventDefault();

    const email = staffFormData.email.trim().toLowerCase();

    if (!email.endsWith('@redland.cl')) {
      alert('El correo debe ser una cuenta institucional @redland.cl.');
      return;
    }

    if (staffFormData.role === 'docente' && staffFormData.courseIds.length === 0) {
      alert('Selecciona al menos un curso para este docente.');
      return;
    }

    try {
      // El email es el ID del documento: garantiza que no se puede duplicar
      // y que la verificación de acceso (AuthContext) lo encuentre directo.
      await setDoc(doc(db, 'staff_junior', email), {
        role: staffFormData.role,
        courseIds: staffFormData.role === 'admin' ? [] : staffFormData.courseIds,
        active: editandoStaffEmail ? staffList.find(s => s.email === editandoStaffEmail)?.active ?? true : true,
      });
      setShowStaffModal(false);
      fetchDatos();
    } catch (error) {
      console.error("Error al guardar staff:", error);
      alert('No se pudo guardar el registro de staff.');
    }
  };

  const handleToggleActivoStaff = async (item) => {
    if (currentUser && item.email === currentUser.email && item.active) {
      alert('No puedes desactivar tu propia cuenta desde aquí. Pídele a otro administrador que lo haga.');
      return;
    }

    const nuevoEstado = !item.active;
    const mensaje = nuevoEstado
      ? `¿Reactivar el acceso de ${item.email}?`
      : `¿Quitar el acceso de ${item.email}? No podrá volver a entrar hasta que lo reactives.`;

    if (window.confirm(mensaje)) {
      try {
        await updateDoc(doc(db, 'staff_junior', item.email), { active: nuevoEstado });
        fetchDatos();
      } catch (error) {
        console.error("Error al cambiar estado de staff:", error);
        alert('No se pudo actualizar el estado.');
      }
    }
  };

  const handleEliminarStaff = async (item) => {
    if (currentUser && item.email === currentUser.email) {
      alert('No puedes eliminar tu propia cuenta de administrador.');
      return;
    }

    if (window.confirm(`¿Eliminar por completo el acceso de ${item.email}? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, 'staff_junior', item.email));
        fetchDatos();
      } catch (error) {
        console.error("Error al eliminar staff:", error);
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
          <div className="flex gap-2">
            <button
              onClick={descargarPlantillaCSV}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer text-sm"
            >
              Plantilla CSV
            </button>
            <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer text-sm">
              Importar CSV
              <input type="file" accept=".csv" onChange={handleArchivoCSV} className="hidden" />
            </label>
            <button 
              onClick={abrirModalNuevo}
              className="bg-redland-secondary hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Alumno / Apoderado
            </button>
          </div>
        )}

        {activeTab === 'staff' && (
          <button
            onClick={abrirModalNuevoStaff}
            className="bg-redland-secondary hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Docente / Admin
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
        <button
          onClick={() => setActiveTab('staff')}
          className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'staff' ? 'border-redland-primary text-redland-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          👤 Staff Junior
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
                          <td className="p-3 font-bold text-slate-800">
                            {item.studentName || (item.status === 'unrecognized' ? '—' : 'Sin dato')}
                          </td>
                          <td className="p-3 text-slate-600">
                            {item.status === 'unrecognized'
                              ? <span className="font-mono text-xs">Tarjeta {item.cardNo || '—'}</span>
                              : (item.tutorName || 'Sin dato')}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              item.status === 'alert_duplicate' ? 'bg-red-100 text-red-800 font-bold' :
                              item.status === 'blocked_attempt' ? 'bg-red-200 text-red-900 font-bold' :
                              item.status === 'unrecognized' ? 'bg-slate-200 text-slate-700 font-bold' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status === 'completed' ? '✓ Despachado' :
                               item.status === 'alert_duplicate' ? '⚠️ Duplicado' :
                               item.status === 'blocked_attempt' ? '🚫 Tarjeta bloqueada' :
                               item.status === 'unrecognized' ? '❓ No reconocida' :
                               'En Espera'}
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
                      <th className="p-3 font-semibold">ID Apoderado (Hikvision)</th>
                      <th className="p-3 font-semibold">Tarjeta RFID</th>
                      <th className="p-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
                    {usuariosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400">
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
                          <td className="p-3 font-mono text-xs">
                            {item.tutorId
                              ? <span className="text-slate-700">{item.tutorId}</span>
                              : <span className="text-red-600 font-semibold">⚠️ Falta</span>}
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
                    <th className="p-3 font-semibold">ID Apoderado (Hikvision)</th>
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
                        <td className="p-3 font-mono text-xs">
                          {item.tutorId
                            ? <span className="text-slate-700">{item.tutorId}</span>
                            : <span className="text-red-600 font-semibold">⚠️ Falta</span>}
                        </td>
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

        {/* PESTAÑA 4: STAFF JUNIOR (docentes/admins autorizados a entrar al panel) */}
        {activeTab === 'staff' && (
          <div>
            <h3 className="text-base font-bold text-slate-700 mb-2">Acceso al Sistema</h3>
            <p className="text-slate-500 text-sm mb-6">
              Solo las cuentas @redland.cl agregadas aquí pueden iniciar sesión con Google y entrar a esta sección, aunque el resto del staff del colegio también tenga correo institucional.
            </p>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redland-secondary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3 font-semibold">Correo</th>
                      <th className="p-3 font-semibold">Rol</th>
                      <th className="p-3 font-semibold">Cursos</th>
                      <th className="p-3 font-semibold">Estado</th>
                      <th className="p-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
                    {staffList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400">
                          No hay staff registrado todavía.
                        </td>
                      </tr>
                    ) : (
                      staffList.map((item) => (
                        <tr key={item.email} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800">
                            {item.email}
                            {currentUser && item.email === currentUser.email && (
                              <span className="ml-2 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">Tú</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.role === 'admin' ? '⭐ Admin' : 'Docente'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 text-xs">
                            {item.role === 'admin' ? 'Todos' : (item.courseIds || []).join(', ') || 'Sin curso asignado'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.active ? 'Activo' : 'Sin acceso'}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => abrirModalEditarStaff(item)}
                              className="text-indigo-600 hover:text-indigo-800 font-medium text-xs cursor-pointer transition-colors bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200 mr-2"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleToggleActivoStaff(item)}
                              className={`font-medium text-xs px-2.5 py-1 rounded cursor-pointer transition-colors border mr-2 ${
                                item.active
                                  ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                  : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {item.active ? 'Quitar acceso' : 'Reactivar'}
                            </button>
                            <button
                              onClick={() => handleEliminarStaff(item)}
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID de Apoderado en Hikvision:</label>
                <input
                  type="text"
                  required
                  value={formData.tutorId}
                  onChange={(e) => setFormData({...formData, tutorId: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-redland-primary"
                  placeholder="Ej: 1"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  El número de "empleado" (employeeNoString) que se le asignó a la tarjeta del apoderado al enrolarla en el control de acceso. <strong>Es el dato real que usa n8n para reconocer la tarjeta</strong> — sin esto el retiro no va a funcionar aunque el resto esté bien cargado.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código Tarjeta RFID (Hexadecimal) — opcional:</label>
                <input 
                  type="text" 
                  value={formData.rfidCard}
                  onChange={(e) => setFormData({...formData, rfidCard: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-redland-primary"
                  placeholder="Ej: 1265420193"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Solo referencia interna (para identificar la tarjeta física). No lo usa el flujo de retiro.
                </p>
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

      {/* MODAL DE PREVISUALIZACIÓN E IMPORTACIÓN CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 animate-fade-in max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Confirmar importación</h3>
            <p className="text-sm text-slate-500 mb-4">
              Archivo: <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{csvFileName}</span>
              {' — '}
              <span className="text-emerald-700 font-semibold">{filasValidas.length} lista(s) para importar</span>
              {filasInvalidas.length > 0 && (
                <> · <span className="text-red-600 font-semibold">{filasInvalidas.length} con errores (se omitirán)</span></>
              )}
            </p>

            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="p-2 font-semibold">Alumno</th>
                    <th className="p-2 font-semibold">Curso</th>
                    <th className="p-2 font-semibold">Apoderado</th>
                    <th className="p-2 font-semibold">tutorId</th>
                    <th className="p-2 font-semibold">RFID</th>
                    <th className="p-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvRows.map((row, idx) => (
                    <tr key={idx} className={row._valid ? '' : 'bg-red-50'}>
                      <td className="p-2">{row.name || <span className="text-slate-300">—</span>}</td>
                      <td className="p-2">{row.courseId || <span className="text-slate-300">—</span>}</td>
                      <td className="p-2">{row.tutorName || <span className="text-slate-300">—</span>}</td>
                      <td className="p-2 font-mono">{row.tutorId || <span className="text-slate-300">—</span>}</td>
                      <td className="p-2 font-mono">{row.rfidCard || <span className="text-slate-300">—</span>}</td>
                      <td className="p-2">
                        {row._valid ? (
                          <span className="text-emerald-700 font-semibold">✓ OK</span>
                        ) : (
                          <span className="text-red-600 font-semibold" title={row._errores.join(', ')}>
                            ✗ {row._errores.join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setCsvRows([]); setCsvFileName(''); }}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                disabled={importing}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarImportacionCSV}
                disabled={filasValidas.length === 0 || importing}
                className="px-4 py-2 bg-redland-secondary text-white rounded-lg text-sm font-semibold hover:bg-red-800 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importando...' : `Importar ${filasValidas.length} alumno(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR O EDITAR STAFF JUNIOR */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editandoStaffEmail ? 'Editar Staff' : 'Agregar Docente o Admin'}
            </h3>
            <form onSubmit={handleGuardarStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo institucional:</label>
                <input
                  type="email"
                  required
                  disabled={!!editandoStaffEmail}
                  value={staffFormData.email}
                  onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-redland-primary disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder="docente@redland.cl"
                />
                {editandoStaffEmail && (
                  <p className="text-[11px] text-slate-400 mt-1">El correo no se puede editar una vez creado.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol:</label>
                <select
                  value={staffFormData.role}
                  onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:border-redland-primary bg-white"
                >
                  <option value="docente">Docente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {staffFormData.role === 'docente' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cursos a cargo:</label>
                  {cursosDisponibles.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      No hay cursos cargados todavía en "Alumnos y Apoderados". Agrega al menos un alumno con su curso antes de asignar docentes.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-48 overflow-y-auto">
                      {cursosDisponibles.map((curso) => (
                        <label key={curso} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={staffFormData.courseIds.includes(curso)}
                            onChange={() => toggleCursoEnFormulario(curso)}
                            className="rounded border-slate-300"
                          />
                          {curso}
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">Solo va a ver y despachar alumnos de estos cursos.</p>
                </div>
              )}

              {staffFormData.role === 'admin' && (
                <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  Los admins ven todos los cursos y pueden gestionar el resto del staff.
                </p>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-redland-secondary text-white rounded-lg text-sm font-semibold hover:bg-red-800 cursor-pointer shadow-sm"
                >
                  {editandoStaffEmail ? 'Guardar Cambios' : 'Agregar'}
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