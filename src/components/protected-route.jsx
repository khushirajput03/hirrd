import { useUser } from '@clerk/clerk-react'
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded, user } = useUser()  // ✅ include user
  const location = useLocation()

  if (isLoaded && !isSignedIn) {
    return (
      <Navigate
        to="/?sign-in=true"
        state={{ from: location }}
        replace
      />
    )
  }

  // ✅ check onboarding status
  if (user && !user.unsafeMetadata?.role && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

export default ProtectedRoute
