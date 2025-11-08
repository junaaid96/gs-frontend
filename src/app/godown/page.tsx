'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GodownPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/godowns');
  }, [router]);

  return null;
}
