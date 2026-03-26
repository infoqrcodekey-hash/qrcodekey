// Deprecated - redirects to Group Attendance
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DeprecatedPage() {
  const router = useRouter();
    useEffect(() => { router.replace('/group'); }, [router]);
      return null;
      }
      