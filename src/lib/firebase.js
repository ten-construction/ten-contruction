import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

// Firebase Config Stenly
const firebaseConfig = {
  apiKey: "AIzaSyCwbhGaVfcHtlA3E5961yQJ5mr3ZUvTG38",
  authDomain: "ten-construction.firebaseapp.com",
  projectId: "ten-construction",
  storageBucket: "ten-construction.firebasestorage.app",
  messagingSenderId: "203518426675",
  appId: "1:203518426675:web:fb4f4039d6caba22eaad46"
};

// Firebase Config BlackCool
// const firebaseConfig = {
//   apiKey: "AIzaSyBQ6JB4Fh5sx6bNAO6B6z5uDocKSqgNM6w",
//   authDomain: "ten-construction-c1367.firebaseapp.com",
//   projectId: "ten-construction-c1367",
//   storageBucket: "ten-construction-c1367.firebasestorage.app",
//   messagingSenderId: "623047531853",
//   appId: "1:623047531853:web:0be82739e289c0a765eb04",
//   measurementId: "G-LC49G5CLT7"
// };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firestorage
const storage = getStorage(app);

export { db, storage, ref, uploadBytes, getDownloadURL };
