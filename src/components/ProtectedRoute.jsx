import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-400 text-sm">
        Verificando acceso...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-center max-w-md">
          <p className="font-semibold mb-1">Acceso restringido</p>
          <p className="text-sm">Tu cuenta no tiene permiso para ver esta sección.</p>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;