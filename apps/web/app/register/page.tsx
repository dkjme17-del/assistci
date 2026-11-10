'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Car, Wrench, User, Mail, Phone, Lock, Building, Loader2, ArrowRight } from 'lucide-react';
import { fetchApi, setAuthToken, setCurrentUser } from '../../lib/api';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const [role, setRole] = useState<'client' | 'provider'>(roleParam === 'provider' ? 'provider' : 'client');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          password,
          role,
          business_name: role === 'provider' ? businessName : undefined,
        }),
      });

      setAuthToken(res.token);
      setCurrentUser(res.user);

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Impossible de créer le compte');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'field';

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <div className="card p-8 gap-5">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent-light text-accent-dark rounded-card flex items-center justify-center mx-auto mb-3">
            <Car className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold">Créer un compte ASSISTCI</h1>
          <p className="text-sm text-muted mt-1">Rejoignez le réseau d'assistance automobile à Abidjan</p>
        </div>

        {/* Sélecteur de rôle */}
        <div className="grid grid-cols-2 gap-1 bg-line rounded-badge p-1">
          <button
            type="button"
            onClick={() => setRole('client')}
            className={`min-h-[44px] rounded-badge font-bold text-sm flex items-center justify-center gap-2 transition ${
              role === 'client' ? 'bg-white text-accent shadow-card' : 'text-muted hover:text-navy'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Client</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('provider')}
            className={`min-h-[44px] rounded-badge font-bold text-sm flex items-center justify-center gap-2 transition ${
              role === 'provider' ? 'bg-white text-accent shadow-card' : 'text-muted hover:text-navy'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Dépanneur / Pro</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label mb-1">Prénom *</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ex: Jean" className={inputClass} />
            </div>
            <div>
              <label className="field-label mb-1">Nom *</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ex: Konan" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="field-label mb-1">Numéro de téléphone *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted absolute left-3.5 top-4" />
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07 00 00 00 00" className={`${inputClass} pl-10`} />
            </div>
          </div>

          <div>
            <label className="field-label mb-1">Adresse Email *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3.5 top-4" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean.konan@example.com" className={`${inputClass} pl-10`} />
            </div>
          </div>

          {role === 'provider' && (
            <div>
              <label className="field-label mb-1">Nom commercial / Atelier</label>
              <div className="relative">
                <Building className="w-4 h-4 text-muted absolute left-3.5 top-4" />
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: Garage Express Cocody" className={`${inputClass} pl-10`} />
              </div>
            </div>
          )}

          <div>
            <label className="field-label mb-1">Mot de passe sécurisé *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted absolute left-3.5 top-4" />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caractères" className={`${inputClass} pl-10`} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 mt-1">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Créer mon compte</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-line pt-4 text-center text-xs text-muted">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-accent font-bold hover:underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Chargement...</div>}>
      <RegisterContent />
    </Suspense>
  );
}