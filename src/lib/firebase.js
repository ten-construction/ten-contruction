import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

// Your copied firebaseConfig here
const firebaseConfig = {
    apiKey: "AIzaSyCwbhGaVfcHtlA3E5961yQJ5mr3ZUvTG38",
    authDomain: "ten-construction.firebaseapp.com",
    projectId: "ten-construction",
    storageBucket: "ten-construction.firebasestorage.app",
    messagingSenderId: "203518426675",
    appId: "1:203518426675:web:fb4f4039d6caba22eaad46"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firestorage
const storage = getStorage(app);

export { db, storage, ref, uploadBytes, getDownloadURL };
