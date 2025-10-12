import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';

// Functions to interact with Firestore
export const getPosts = () => getDocs(collection(db, "posts"));
export const addPost = (post) => addDoc(collection(db, "posts"), post);

// Book management functions
export const getBooks = () => getDocs(collection(db, "books"));
export const addBook = (book) => addDoc(collection(db, "books"), {
  ...book,
  createdAt: new Date()
});
export const updateBook = (bookId, updates) => updateDoc(doc(db, "books", bookId), updates);
export const deleteBook = (bookId) => deleteDoc(doc(db, "books", bookId));

// Other collection functions
export const getMeetings = () => getDocs(collection(db, "meetings"));
export const getUserGoals = (userId) => getDocs(collection(db, `users/${userId}/user_goals`));
export const getGoalChecks = (userId, goalId) => getDocs(collection(db, `users/${userId}/user_goals/${goalId}/goal_checks`));
