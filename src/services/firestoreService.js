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

// Goals management functions
export const getGoals = (userId) => getDocs(collection(db, `users/${userId}/goals`));
export const addGoal = (userId, goal) => addDoc(collection(db, `users/${userId}/goals`), {
  ...goal,
  createdAt: new Date()
});
export const updateGoal = (userId, goalId, updates) => updateDoc(doc(db, `users/${userId}/goals`, goalId), updates);
export const deleteGoal = (userId, goalId) => deleteDoc(doc(db, `users/${userId}/goals`, goalId));

// Goal progress tracking functions
export const getGoalProgress = (userId, goalId) => getDocs(collection(db, `users/${userId}/goals/${goalId}/progress`));
export const addGoalProgress = (userId, goalId, progress) => addDoc(collection(db, `users/${userId}/goals/${goalId}/progress`), {
  ...progress,
  createdAt: new Date()
});
