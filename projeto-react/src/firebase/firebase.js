import { initializeApp } from "firebase/app";
import 'firebase/compat/auth';
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: "gtr2-39061.firebaseapp.com",
  projectId: "gtr2-39061",
  storageBucket: "gtr2-39061.firebasestorage.app",
  messagingSenderId: "1096620429957",
  appId: "1:1096620429957:web:5b704bc9af912402634fec",
  measurementId: "G-4G448SW4E9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


export { auth, db };
