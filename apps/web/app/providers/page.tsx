'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Star, MapPin, Loader2, Pencil } from 'lucide-react';
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
  'Adjamé',
  'Abobo',
  'Bingerville',
];

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

  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState(
    ABIDJAN_COMMUNES.includes(districtParam) ? districtParam : 'Toutes les communes'
  );
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rapide' | 'note'>('rapide');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedDistrict !== 'Toutes les communes') params.set('district', selectedDistrict);
        if (availableOnly) params.set('emergency_only', 'true');
        const qs = params.toString();
        const data = await fetchApi(`/services/providers${qs ? `?${qs}` : ''}`);
        setProviders(data || []);
      } catch (err) {
        console.error('Erreur chargement prestataires:', err);
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDistrict, availableOnly]);

  useEffect(() => {
    if (districtParam && ABIDJAN_COMMUNES.includes(districtParam)) {
      setSelectedDistrict(districtParam);
    }
  }, [districtParam]);

  const ql = q.trim().toLowerCase();
  const matchesQ = (p: any) => {
    if (!ql) return true;
    const specs = Array.isArray(p.specialties) ? p.specialties.join(' ') : '';
    const hay = `${p.business_name || ''} ${p.first_name || ''} ${p.last_name || ''} ${p.bio || ''} ${specs} ${p.category_name || ''}`.toLowerCase();
    return hay.includes(ql);
  };

  const filtered = providers.filter(
    (p) => matchesQ(p) && (verifiedOnly ? p.verification_status === 'verified' : true)
  );

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'note'
      ? parseFloat(b.rating || 0) - parseFloat(a.rating || 0)
      : (b.emergency_ready ? 1 : 0) - (a.emergency_ready ? 1 : 0)
  );

  const mapMarkers: MarkerData[] = sorted.flatMap((provider) => {
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

  return (
    <section className="py-8">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="flex justify-between gap-3 flex-wrap items-center mb-5">
          <h1 className="text-[28px] font-extrabold m-0">{title}</h1>
          <Link href="/" className="btn-outline">
            <Pencil className="w-4 h-4 mr-2" />
            Modifier la recherche
          </Link>
        </div>

        <div className="flex gap-5 flex-wrap items-start">
          {/* Filtres */}
          <aside className="card w-[260px] gap-3 self-start">
            <div className="font-extrabold">Filtres</div>

            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="field mt-2"
            >
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
              Le plus rapide
            </label>
            <label className="flex gap-2.5 items-center min-h-[36px] cursor-pointer text-sm font-medium">
              <input type="radio" name="sort" checked={sortBy === 'note'} onChange={() => setSortBy('note')} className="w-5 h-5 accent-accent" />
              Mieux noté
            </label>
          </aside>

          {/* Résultats */}
          {loading ? (
            <div className="flex-1 min-w-[340px] py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-muted text-sm">Recherche des prestataires dans votre zone...</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="card flex-1 min-w-[340px] text-center py-12">
              <h3 className="font-extrabold text-lg">Aucun prestataire trouvé</h3>
              <p className="text-muted text-sm mt-1">
                Essayez de réinitialiser le filtre de commune ou lancez directement une demande.
              </p>
              <Link href="/assistance" className="btn-primary mt-4">Créer une demande</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 flex-1 min-w-[340px] items-start">
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
                          {p.emergency_ready && <span className="badge-orange">Le plus rapide</span>}
                        </div>
                        <div className="text-muted text-sm">{p.bio || 'Professionnel de proximité'}</div>
                        <div className="flex gap-2 flex-wrap mt-1.5 items-center">
                          {p.verification_status === 'verified' ? (
                            <span className="badge-green">✓ Vérifié niv. 2</span>
                          ) : (
                            <span className="badge-orange">Profil en cours de vérification</span>
                          )}
                          <span className="text-muted text-sm flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {parseFloat(p.rating || 0).toFixed(1)} · {p.total_reviews || 0} avis
                          </span>
                          <span className="text-muted text-sm flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {p.district ? `${p.district}, Abidjan` : 'Grand Abidjan'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`tel:${p.phone}`} className="btn-outline">Appeler</a>
                        <Link href={`/assistance?provider_id=${p.id}`} className="btn-primary">Demander</Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden lg:block min-w-[300px]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="m-0 text-sm font-extrabold">Carte des prestataires</h2>
                  <span className="text-xs text-muted">{mapMarkers.length} point{mapMarkers.length === 1 ? '' : 's'} GPS</span>
                </div>
                <div className="relative">
                  <InteractiveMap markers={mapMarkers} height="520px" zoom={12} />
                  {mapMarkers.length === 0 && (
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-muted shadow-sm">
                      Les positions GPS ne sont pas encore disponibles pour ces prestataires.
                    </div>
                  )}
                </div>
                <p className="mt-1 text-right text-[11px] text-muted">© OpenStreetMap contributors</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}