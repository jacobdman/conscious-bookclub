import React from 'react';
import { Navigate } from 'react-router-dom';
// Context
import useClubContext from 'contexts/Club';
// Utils
import { getClubFeatures } from 'utils/clubFeatures';

const FeatureGateRoute = ({ featureKey, fallbackPath = '/', children }) => {
  const { currentClub } = useClubContext();
  const features = getClubFeatures(currentClub);

  if (!currentClub) {
    return children;
  }

  if (featureKey && features[featureKey] === false) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default FeatureGateRoute;
