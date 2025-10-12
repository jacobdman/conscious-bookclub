import { httpsCallable } from "firebase/functions";
import { functions } from '../firebase';

export const getLeaderboard = httpsCallable(functions, 'getLeaderboard');
