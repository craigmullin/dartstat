import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABI_q8HGF_lHMHQwurAjQN10iC4WJN1z4",
  authDomain: "dartstat.craigmullin.com",
  projectId: "dartstat-cmullin",
  storageBucket: "dartstat-cmullin.firebasestorage.app",
  messagingSenderId: "489639570610",
  appId: "1:489639570610:web:1e9a3b4a1deb3598ea6dab",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
void setPersistence(auth, browserLocalPersistence).catch((error: unknown) => {
  console.error("Firebase authentication persistence is unavailable", error);
});
export const db = getFirestore(app);
