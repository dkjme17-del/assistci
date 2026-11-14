'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Car, Wrench, User, Mail, Phone, Lock, Building, Loader2, ArrowRight, MapPin, LocateFixed } from 'lucide-react';
import dynamic from 'next/dynamic';
import { fetchApi, setAuthSession, setCurrentUser } from '../../lib/api';
import { getBrowserPosition } from '../../lib/geolocation';
import type { MarkerData } from '../../components/InteractiveMap';

const InteractiveMap = dynamic(() => import('../../components/InteractiveMap'), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-card bg-line" />,
});

const ABIDJAN_COMMUNES = [
  'Cocody',
  'Yopougon',
  'Marcory',
  'Plateau',
  'Koumassi',
  'Treichville',
  'Port-Bouët',
  'Attécoubé',
  'Adjamé',
  'Abobo',
  'Bingerville',
  'Songon',
  'Anyama',
];

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
  const [city, setCity] = useState('Abidjan');
  const [district, setDistrict] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPosition = latitude != null && longitude != null;

  const positionMarkers: MarkerData[] = hasPosition
    ? [
        {
          lat: latitude as number,
          lng: longitude as number,
          type: 'provider',
          title: 'Votre position',
          description: [district, city].filter(Boolean).join(', '),
        },
      ]
    : [];

  const sharePosition = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const position = await getBrowserPosition();
      setLatitude(position.latitude);
      setLongitude(position.longitude);
    } catch (err: any) {
      setLocationError(err.message || 'Impossible de récupérer votre position');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        role,
        business_name: role === 'provider' ? businessName : undefined,
      };

      if (role === 'provider') {
        payload.city = city.trim() || 'Abidjan';
        if (district.trim()) payload.district = district.trim();
        if (hasPosition) {
          payload.latitude = latitude;
          payload.longitude = longitude;
        }
      }

      const res = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setAuthSession(res.token, res.refresh_token);
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

          {role === 'provider' && (
            <div className="rounded-card border border-line p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-extrabold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" />
                    Localisation de votre activité
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Partagez votre position pour apparaître sur la carte des prestataires dès votre inscription.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void sharePosition()}
                  disabled={locating}
                  className="btn-outline min-h-[40px] px-3 text-sm disabled:opacity-50"
                >
                  {locating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LocateFixed className="w-4 h-4 mr-2" />
                  )}
                  {hasPosition ? 'Actualiser' : 'Partager ma position'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label mb-1">Ville</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Abidjan" className={inputClass} />
                </div>
                <div>
                  <label className="field-label mb-1">Commune / quartier</label>
                  <input type="text" list="register-districts" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Ex: Cocody" className={inputClass} />
                  <datalist id="register-districts">
                    {ABIDJAN_COMMUNES.map((commune) => (
                      <option key={commune} value={commune} />
                    ))}
                  </datalist>
                </div>
              </div>

              {hasPosition ? (
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <MapPin className="w-3.5 h-3.5" />
                    Position GPS prête ({latitude?.toFixed(5)}, {longitude?.toFixed(5)})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLatitude(null);
                      setLongitude(null);
                    }}
                    className="font-semibold text-muted hover:text-accent"
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted">
                  Aucune position partagée. Vous pouvez aussi cliquer sur la carte pour choisir votre emplacement.
                </p>
              )}

              {locationError && <p className="text-xs text-red-700">{locationError}</p>}

              <InteractiveMap
                centerLat={latitude ?? undefined}
                centerLng={longitude ?? undefined}
                zoom={14}
                markers={positionMarkers}
                fitMarkers={false}
                onLocationSelect={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setLocationError(null);
                }}
                height="220px"
                defaultMode="2d"
                showModeToggle={false}
              />
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