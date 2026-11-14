'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { fetchApi } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(res.message || 'Consultez votre boîte email.');
    } catch (err: any) {
      setError(err.message || 'Impossible de traiter la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="card p-8 gap-5">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent-light text-accent-dark rounded-card flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
          <p className="text-sm text-muted mt-1">
            Recevez un lien sécurisé pour réinitialiser votre mot de passe.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="gap-4">
          <div>
            <label className="field-label mb-1.5">Adresse email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3.5 top-4" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.ci"
                className="field pl-10"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer le lien'}
          </button>
        </form>

        <div className="border-t border-line pt-4 text-center text-xs text-muted">
          <Link href="/login" className="inline-flex items-center gap-1 text-accent font-bold hover:underline">
            <ArrowLeft className="w-3 h-3" /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
