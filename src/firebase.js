import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const db = getFirestore(app);

export const getLeaderboard = httpsCallable(functions, 'getLeaderboard');

// Functions to interact with Firestore
export const getPosts = () => getDocs(collection(db, "posts"));
export const addPost = (post) => addDoc(collection(db, "posts"), post);

export const getBooks = () => getDocs(collection(db, "books"));
export const getMeetings = () => getDocs(collection(db, "meetings"));
export const getUserGoals = (userId) => getDocs(collection(db, `users/${userId}/user_goals`));
export const getGoalChecks = (userId, goalId) => getDocs(collection(db, `users/${userId}/user_goals/${goalId}/goal_checks`));

export { db };