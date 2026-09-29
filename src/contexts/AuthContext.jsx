import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [courseIds, setCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // onAuthStateChanged corre en cada carga de página, no solo al hacer login.
    // Esto es clave: si un admin desactiva a alguien en staff_junior, esa persona
    // pierde el acceso la próxima vez que la app se recarga o revisa su sesión,
    // aunque su sesión de Google/Firebase siga técnicamente viva.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError('');

      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setCourseIds([]);
        setLoading(false);
        return;
      }

      try {
        const staffRef = doc(db, 'staff_junior', firebaseUser.email);
        const staffSnap = await getDoc(staffRef);

        if (!staffSnap.exists() || staffSnap.data().active !== true) {
          await signOut(auth);
          setUser(null);
          setRole(null);
          setCourseIds([]);
          setAuthError('No tienes acceso a esta sección. Si crees que es un error, contacta a administración.');
          setLoading(false);
          return;
        }

        const staffData = staffSnap.data();
        setUser(firebaseUser);
        setRole(staffData.role || 'docente');
        setCourseIds(staffData.courseIds || []);
        setLoading(false);
      } catch (error) {
        console.error('Error verificando autorización de staff:', error);
        await signOut(auth);
        setUser(null);
        setRole(null);
        setCourseIds([]);
        setAuthError('Ocurrió un error verificando tu acceso. Intenta de nuevo.');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError('');
    const provider = new GoogleAuthProvider();
    // hd restringe el selector de cuentas de Google al dominio del colegio.
    // No es una barrera de seguridad real (se puede forzar por API), solo evita
    // que alguien elija por error una cuenta personal. La barrera real es la
    // verificación contra staff_junior que corre justo después, en onAuthStateChanged.
    provider.setCustomParameters({
      hd: 'redland.cl',
      prompt: 'select_account',
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error en el inicio de sesión con Google:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    }
  };

  const logout = () => signOut(auth);

  const value = {
    user,
    role,
    courseIds,
    loading,
    authError,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}