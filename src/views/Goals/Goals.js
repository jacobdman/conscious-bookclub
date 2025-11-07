import React from 'react';
import GoalsComponent from 'components/Goals';
import GoalsProvider from 'contexts/Goals/GoalsProvider';

const Goals = () => {
  return (
    <GoalsProvider>
      <GoalsComponent />
    </GoalsProvider>
  );
};

export default Goals;

