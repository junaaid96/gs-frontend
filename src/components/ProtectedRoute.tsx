'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    const auth = isAuthenticated();
    setAuthenticated(auth);
    
    if (!auth) {
      router.push('/login');
    }
  }, [router]);

  // Show nothing during SSR and until we verify authentication
  if (!mounted) {
    return null;
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}

