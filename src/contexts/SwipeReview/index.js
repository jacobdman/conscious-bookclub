import { useContext } from 'react';
import SwipeReviewContext from './SwipeReviewContext';

export const useSwipeReviewContext = () => useContext(SwipeReviewContext);

export { default as SwipeReviewProvider } from './SwipeReviewProvider';
export { default as SwipeReviewContext } from './SwipeReviewContext';
