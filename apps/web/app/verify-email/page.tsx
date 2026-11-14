'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Lien invalide : jeton manquant.');
      return;
    }

    let cancelled = false;

    fetchApi('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (cancelled) return;
        setState('success');
        setMessage(res.message || 'Adresse email vérifiée.');
      })
      .catch((err: any) => {
        if (cancelled) return;
        setState('error');
        setMessage(err.message || 'Impossible de vérifier cet email.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="card p-8 gap-5 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-accent" />
            <h1 className="text-2xl font-extrabold">Vérification en cours…</h1>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />
            <h1 className="text-2xl font-extrabold">Email vérifié</h1>
            <p className="text-sm text-muted">{message}</p>
            <Link href="/dashboard" className="btn-primary w-full">
              Accéder à mon espace
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-10 h-10 mx-auto text-red-600" />
            <h1 className="text-2xl font-extrabold">Vérification impossible</h1>
            <p className="text-sm text-muted">{message}</p>
            <Link href="/login" className="btn-primary w-full">
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Chargement...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
