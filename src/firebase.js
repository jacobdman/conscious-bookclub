import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  getRedirectResult,
  onAuthStateChanged, 
  signOut,
  connectAuthEmulator
} from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

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
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Connect to emulators in development
const isDevelopment = process.env.NODE_ENV === 'development';
if (isDevelopment) {
  // Connect to emulators (wrapped in try-catch to prevent errors if already connected)
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
  } catch (e) {
    // Already connected, ignore error
  }
  
  try {
    connectStorageEmulator(storage, "localhost", 9199);
  } catch (e) {
    // Already connected, ignore error
  }
}

// Export Firebase instances and utilities
export { auth, onAuthStateChanged, signOut, getRedirectResult, googleProvider, functions, storage };
