import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
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

// User management functions
export const createUserDocument = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Create user document if it doesn't exist
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
  } else {
    // Update last login time for existing users
    await updateDoc(userRef, {
      lastLoginAt: new Date()
    });
  }
};

export const getUserDocument = (userId) => getDoc(doc(db, 'users', userId));

// Goal completion functions
export const checkGoalCompletion = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  const completionSnap = await getDoc(completionRef);
  return completionSnap.exists();
};

export const markGoalComplete = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  await setDoc(completionRef, {
    completed: true,
    completedAt: new Date()
  });
};

export const markGoalIncomplete = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  await deleteDoc(completionRef);
};

export const markMilestoneComplete = async (userId, goalId, milestoneIndex) => {
  const goalRef = doc(db, `users/${userId}/goals`, goalId);
  const goalSnap = await getDoc(goalRef);
  
  if (goalSnap.exists()) {
    const goalData = goalSnap.data();
    const updatedMilestones = [...goalData.milestones];
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: true,
      completedAt: new Date()
    };
    
    await updateDoc(goalRef, { milestones: updatedMilestones });
  }
};

export const markOneTimeGoalComplete = async (userId, goalId) => {
  const goalRef = doc(db, `users/${userId}/goals`, goalId);
  await updateDoc(goalRef, {
    completed: true,
    completedAt: new Date()
  });
};
