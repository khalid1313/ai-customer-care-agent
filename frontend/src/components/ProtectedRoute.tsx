'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Check role permissions if specified
      if (allowedRoles && !hasRole(allowedRoles)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [loading, isAuthenticated, router, allowedRoles, hasRole]);

  // Set timeout for loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setTimeoutReached(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">
            {timeoutReached ? 'Still loading...' : 'Loading your workspace...'}
          </p>
          {timeoutReached && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Taking longer than expected?</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-purple-600 hover:text-purple-700 text-sm underline"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || (allowedRoles && !hasRole(allowedRoles))) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}