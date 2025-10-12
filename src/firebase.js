import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";

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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, provider);

export { auth, onAuthStateChanged, signOut, db };

export const getLeaderboard = httpsCallable(functions, 'getLeaderboard');

// Functions to interact with Firestore
export const getPosts = () => getDocs(collection(db, "posts"));
export const addPost = (post) => addDoc(collection(db, "posts"), post);

export const getBooks = () => getDocs(collection(db, "books"));
export const getMeetings = () => getDocs(collection(db, "meetings"));
export const getUserGoals = (userId) => getDocs(collection(db, `users/${userId}/user_goals`));
export const getGoalChecks = (userId, goalId) => getDocs(collection(db, `users/${userId}/user_goals/${goalId}/goal_checks`));