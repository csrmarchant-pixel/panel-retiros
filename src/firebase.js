import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuración de tu proyecto de Firebase
// (Puedes reemplazar estos valores con los de tu consola de Firebase cuando los tengas listos)
const firebaseConfig = {
  apiKey: "AIzaSyBJAD9_ALQOfsAgEZW9By5Z7DJHuKZQ86s",
  authDomain: "retiro-alumnos.firebaseapp.com",
  projectId: "retiro-alumnos",
  storageBucket: "retiro-alumnos.firebasestorage.app",
  messagingSenderId: "1001221043487",
  appId: "1:1001221043487:web:a7a2bea9e25480f165ac2a"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar y exportar Firestore y Auth para usarlos en el proyecto
export const db = getFirestore(app);
export const auth = getAuth(app);