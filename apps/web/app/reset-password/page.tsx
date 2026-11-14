'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Impossible de réinitialiser le mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="card p-8 gap-5">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent-light text-accent-dark rounded-card flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold">Nouveau mot de passe</h1>
          <p className="text-sm text-muted mt-1">Choisissez un mot de passe robuste.</p>
        </div>

        {!token && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            Lien invalide : le jeton de réinitialisation est manquant.
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {done ? (
          <div className="gap-4">
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Mot de passe réinitialisé. Vous pouvez vous connecter.
            </div>
            <Link href="/login" className="btn-primary w-full">
              Se connecter
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="gap-4">
            <div>
              <label className="field-label mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="field-label mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Réinitialiser'}
            </button>
          </form>
        )}

        {!done && (
          <div className="border-t border-line pt-4 text-center text-xs text-muted">
            <Link href="/forgot-password" className="inline-flex items-center gap-1 text-accent font-bold hover:underline">
              <AlertCircle className="w-3 h-3" /> Demander un nouveau lien
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Chargement...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
