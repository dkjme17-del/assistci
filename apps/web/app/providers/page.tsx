'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Star, MapPin, Loader2, Pencil, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { fetchApi } from '../../lib/api';
import IdentityAvatar from '../../components/IdentityAvatar';
import type { MarkerData } from '../../components/InteractiveMap';

const InteractiveMap = dynamic(() => import('../../components/InteractiveMap'), {
  ssr: false,
  loading: () => <div className="h-[520px] animate-pulse rounded-card bg-line" />,
});

const ABIDJAN_COMMUNES = [
  'Toutes les communes',
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

interface Provider {
  id: number;
  business_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  bio: string | null;
  specialties: string[] | null;
  rating: string | number | null;
  total_reviews: string | number | null;
  availability: boolean;
  emergency_ready: boolean;
  verification_status: string | null;
  district: string | null;
  city: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  logo_url: string | null;
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
      <p className="text-muted text-sm">Recherche des prestataires...</p>
    </div>}>
      <SearchResultsContent />
    </Suspense>
  );
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const districtParam = searchParams.get('district') || '';

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState(
    districtParam || 'Toutes les communes'
  );
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rapide' | 'note'>('rapide');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (selectedDistrict !== 'Toutes les communes') params.set('district', selectedDistrict);
        if (availableOnly) params.set('available_only', 'true');
        if (q.trim()) params.set('q', q.trim());
        const qs = params.toString();
        const data = await fetchApi(`/services/providers${qs ? `?${qs}` : ''}`, { signal: controller.signal });
        if (active) setProviders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) console.error('Erreur chargement prestataires:', err);
        if (active) {
          setProviders([]);
          setLoadError('Impossible de charger les prestataires. Vérifiez votre connexion puis réessayez.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedDistrict, availableOnly, q, reloadKey]);

  useEffect(() => {
    if (districtParam) {
      setSelectedDistrict(districtParam);
    }
  }, [districtParam]);

  const filtered = providers.filter(
    (p: Provider) => (verifiedOnly ? p.verification_status === 'verified' : true)
  );

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'note'
      ? Number(b.rating || 0) - Number(a.rating || 0)
      : Number(b.emergency_ready) - Number(a.emergency_ready)
  );

  const mapMarkers: MarkerData[] = sorted.flatMap((provider: Provider) => {
    if (provider.latitude == null || provider.longitude == null) return [];
    const lat = Number(provider.latitude);
    const lng = Number(provider.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{
      lat,
      lng,
      type: 'provider',
      title: provider.business_name || `${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
      description: [provider.district, provider.city].filter(Boolean).join(', ') || 'Abidjan',
      linkUrl: `/providers/${provider.id}`,
    }];
  });

  const title = q
    ? `${q.charAt(0).toUpperCase() + q.slice(1)} · près de vous`
    : 'Prestataires · près de vous';
  const hasFilters = selectedDistrict !== 'Toutes les communes' || availableOnly || verifiedOnly;
  const editSearchParams = new URLSearchParams();
  if (q.trim()) editSearchParams.set('service', q.trim());
  if (selectedDistrict !== 'Toutes les communes') editSearchParams.set('location', selectedDistrict);

  return (
    <section className="py-8">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="flex justify-between gap-3 flex-wrap items-center mb-5">
          <h1 className="text-[28px] font-extrabold m-0">{title}</h1>
          <Link href={`/?${editSearchParams.toString()}`} className="btn-outline">
            <Pencil className="w-4 h-4 mr-2" />
            Modifier la recherche
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px] gap-5 items-start">
          {/* Filtres */}
          <aside className="card gap-3 self-start">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 font-extrabold text-base">Filtres</h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDistrict('Toutes les communes');
                    setAvailableOnly(false);
                    setVerifiedOnly(false);
                  }}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Tout effacer
                </button>
              )}
            </div>

            <select
              aria-label="Filtrer par commune"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="field mt-2"
            >
              {districtParam && !ABIDJAN_COMMUNES.includes(districtParam) && (
                <option value={districtParam}>{districtParam}</option>
              )}
              {ABIDJAN_COMMUNES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label className="flex gap-2.5 items-center min-h-[36px] cursor-pointer text-sm font-medium">
              <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="w-5 h-5 accent-accent" />
              Disponible maintenant
            </label>
            <label className="flex gap-2.5 items-center min-h-[36px] cursor-pointer text-sm font-medium">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="w-5 h-5 accent-accent" />
              Vérifié niveau 2 et plus
            </label>

            <div className="font-extrabold mt-2">Trier par</div>
            <label className="flex gap-2.5 items-center min-h-[36px] cursor-pointer text-sm font-medium">
              <input type="radio" name="sort" checked={sortBy === 'rapide'} onChange={() => setSortBy('rapide')} className="w-5 h-5 accent-accent" />
              Prêt pour les urgences
            </label>
            <label className="flex gap-2.5 items-center min-h-[36px] cursor-pointer text-sm font-medium">
              <input type="radio" name="sort" checked={sortBy === 'note'} onChange={() => setSortBy('note')} className="w-5 h-5 accent-accent" />
              Mieux noté
            </label>
          </aside>

          {/* Résultats */}
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted" aria-live="polite">
              <Users className="w-4 h-4" />
              {loading ? 'Recherche en cours…' : loadError ? 'Résultats indisponibles' : `${sorted.length} prestataire${sorted.length === 1 ? '' : 's'} trouvé${sorted.length === 1 ? '' : 's'}`}
            </div>
            {loading ? (
              <div className="card py-16 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
                <p className="text-muted text-sm">Recherche des prestataires dans votre zone...</p>
              </div>
            ) : loadError ? (
              <div className="card text-center py-12" role="alert">
                <h3 className="font-extrabold text-lg">La recherche n’a pas abouti</h3>
                <p className="text-muted text-sm mt-1">{loadError}</p>
                <button type="button" className="btn-primary mt-4" onClick={() => setReloadKey((key) => key + 1)}>
                  Réessayer
                </button>
              </div>
            ) : sorted.length === 0 ? (
              <div className="card text-center py-12">
                <h3 className="font-extrabold text-lg">Aucun prestataire trouvé</h3>
                <p className="text-muted text-sm mt-1">
                  Essayez une autre commune, retirez un filtre ou lancez directement une demande.
                </p>
                <Link href="/assistance" className="btn-primary mt-4">Créer une demande</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sorted.map((p) => (
                  <article key={p.id} className="card">
                    <div className="flex gap-4 flex-wrap items-center">
                      <IdentityAvatar name={p.business_name || `${p.first_name || ''} ${p.last_name || ''}`} src={p.logo_url} className="w-16 h-16 border border-line" />
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/providers/${p.id}`} className="font-extrabold text-lg hover:underline">
                            {p.business_name || `${p.first_name} ${p.last_name}`}
                          </Link>
                          {p.emergency_ready && <span className="badge-orange">Prêt pour les urgences</span>}
                        </div>
                        <div className="text-muted text-sm">{p.bio || 'Professionnel de proximité'}</div>
                        {Array.isArray(p.specialties) && p.specialties.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.specialties.slice(0, 3).map((specialty: string) => (
                              <span key={specialty} className="rounded-full bg-line px-2.5 py-1 text-xs text-muted">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap mt-1.5 items-center">
                          {p.verification_status === 'verified' ? (
                            <span className="badge-green">✓ Vérifié niv. 2</span>
                          ) : (
                            <span className="badge-orange">Profil en cours de vérification</span>
                          )}
                          <span className="text-muted text-sm flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {Number(p.rating || 0).toFixed(1)} · {p.total_reviews || 0} avis
                          </span>
                          <span className="text-muted text-sm flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {[p.district, p.city || 'Abidjan'].filter(Boolean).join(', ')}
                          </span>
                          <span className={`text-xs font-semibold ${p.availability ? 'text-emerald-700' : 'text-muted'}`}>
                            {p.availability ? 'Disponible' : 'Indisponible'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {p.phone ? (
                          <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className="btn-outline">Appeler</a>
                        ) : (
                          <button type="button" className="btn-outline opacity-60" disabled title="Numéro non renseigné">
                            Appeler
                          </button>
                        )}
                        <Link href={`/requests/new?provider_id=${p.id}`} className="btn-primary">Demander</Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="m-0 text-sm font-extrabold">Carte des prestataires</h2>
              <span className="text-xs text-muted">{mapMarkers.length} point{mapMarkers.length === 1 ? '' : 's'} GPS</span>
            </div>
            <div className="relative">
              <InteractiveMap markers={mapMarkers} height="clamp(280px, 52vh, 520px)" zoom={12} />
              {mapMarkers.length === 0 && (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-muted shadow-sm">
                  Les positions GPS ne sont pas encore disponibles pour ces prestataires.
                </div>
              )}
              </div>
            <p className="mt-1 text-right text-[11px] text-muted">© OpenFreeMap · OpenStreetMap</p>
          </aside>
        </div>
      </div>
    </section>
  );
}