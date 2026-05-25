import React from 'react';
import GoalsComponent from 'components/Goals';
import GoalsProvider from 'contexts/Goals/GoalsProvider';
import ClubGoalsProvider from 'contexts/ClubGoals';

const Goals = () => {
  return (
    <GoalsProvider>
      <ClubGoalsProvider>
        <GoalsComponent />
      </ClubGoalsProvider>
    </GoalsProvider>
  );
};

export default Goals;

