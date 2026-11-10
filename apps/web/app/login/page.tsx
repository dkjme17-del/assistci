'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Car, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { fetchApi, setAuthToken, setCurrentUser } from '../../lib/api';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });

      setAuthToken(res.token);
      setCurrentUser(res.user);

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="card p-8 gap-5">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent-light text-accent-dark rounded-card flex items-center justify-center mx-auto mb-3">
            <Car className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold">Connexion ASSISTCI</h1>
          <p className="text-sm text-muted mt-1">
            Accédez à vos demandes d'assistance et propositions
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="gap-4">
          <div>
            <label className="field-label mb-1.5">Email ou Téléphone</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3.5 top-4" />
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Ex: +2250700000001 ou email"
                className="field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="field-label mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted absolute left-3.5 top-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-line pt-4 text-center text-xs text-muted">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-accent font-bold hover:underline">
            S'inscrire gratuitement
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Chargement...</div>}>
      <LoginContent />
    </Suspense>
  );
}