import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  getRedirectResult,
  onAuthStateChanged, 
  signOut
} from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBmG4u5Kv4nt-5F5XfZhKNsyg9MJ-h96Qo",
  authDomain: "conscious-bookclub-87073-9eb71.firebaseapp.com",
  projectId: "conscious-bookclub-87073-9eb71",
  storageBucket: "conscious-bookclub-87073-9eb71.appspot.com",
  messagingSenderId: "499467823747",
  appId: "1:499467823747:web:4146c4e1a9e368c83549b6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
const googleProvider = new GoogleAuthProvider();

// Export Firebase instances and utilities
export { auth, onAuthStateChanged, signOut, getRedirectResult, googleProvider, functions };
