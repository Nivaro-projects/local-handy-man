import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { bffFetch } from '@/lib/bffClient';

interface RequireRoleProps {
  role: 'admin' | 'technician' | 'customer';
  children: React.ReactElement;
}

interface UserProfile {
  id: string;
  role: string;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRole() {
      try {
        const profile = await bffFetch<UserProfile>('/me');
        if (isMounted) {
          setAuthorized(profile.role === role);
        }
      } catch {
        if (isMounted) {
          setAuthorized(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkRole();

    return () => {
      isMounted = false;
    };
  }, [role]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-neutral-500">
        Checking permissions...
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
