import { 
  signInWithRedirect,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from '../firebase';

export const signInWithGoogle = () => signInWithRedirect(auth, googleProvider);

export const signUpWithEmail = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });
  return userCredential;
};

export const signInWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
