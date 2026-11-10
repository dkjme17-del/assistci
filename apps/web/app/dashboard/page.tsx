'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '../../lib/api';
import ClientSpace from '../../components/space/ClientSpace';
import ProviderSpace from '../../components/space/ProviderSpace';

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login?redirect=/dashboard');
      return;
    }
    setRole(user.role);
  }, [router]);

  if (!role) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
        <p className="text-muted text-sm">Chargement de votre espace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10">
      {role === 'provider' ? <ProviderSpace /> : <ClientSpace />}
    </div>
  );
}