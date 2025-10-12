import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from '../firebase';

// Functions to interact with Firestore
export const getPosts = () => getDocs(collection(db, "posts"));
export const addPost = (post) => addDoc(collection(db, "posts"), post);

export const getBooks = () => getDocs(collection(db, "books"));
export const getMeetings = () => getDocs(collection(db, "meetings"));
export const getUserGoals = (userId) => getDocs(collection(db, `users/${userId}/user_goals`));
export const getGoalChecks = (userId, goalId) => getDocs(collection(db, `users/${userId}/user_goals/${goalId}/goal_checks`));
