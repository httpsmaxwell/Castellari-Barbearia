import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-functions.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDOV9w2MNGIEeenanydAMyYUuRH9NpQ0C8",
  authDomain: "castellari-barbearia.firebaseapp.com",
  projectId: "castellari-barbearia",
  storageBucket: "castellari-barbearia.firebasestorage.app",
  messagingSenderId: "685816003629",
  appId: "1:685816003629:web:adb38ed88f50434c2f8ca4",
  measurementId: "G-3VG4KWDD47",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "southamerica-east1");
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
