'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Plus, X, Check, Star, Wallet, TrendingUp, Wrench, ImagePlus, Download, WandSparkles, LocateFixed, MapPin } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { categoryIcon, type Category } from '../../lib/categoryIcons';
import { download, fileUrl, generateLogoFile, uploadImage } from '../../lib/media';
import { getBrowserPosition } from '../../lib/geolocation';
import IdentityAvatar from '../IdentityAvatar';
import RequestCard, { isDone } from './RequestCard';
import NotificationsPanel from './NotificationsPanel';

type Tab = 'missions' | 'activity' | 'earnings' | 'notifications';

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card gap-1.5">
      <div className="flex items-center gap-2 text-muted text-sm">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}

const DISTRICT_SUGGESTIONS = [
  'Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Treichville', 'Adjamé', 'Abobo', 'Koumassi',
  'Port-Bouët', 'Bingerville', 'Riviera', 'Angré',
];

interface AreaDraft {
  city: string;
  district: string;
  radius_km: number;
  latitude: number | null;
  longitude: number | null;
}

function ActivityEditor({ onSaved }: { onSaved: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesRetry, setCategoriesRetry] = useState(0);
  const [hourlyRate, setHourlyRate] = useState('');
  const [availability, setAvailability] = useState(true);
  const [emergencyReady, setEmergencyReady] = useState(false);
  const [areas, setAreas] = useState<AreaDraft[]>([]);
  const [locatingArea, setLocatingArea] = useState<number | null>(null);

  useEffect(() => {
    fetchApi('/providers/me')
      .then((res) => {
        const p = res.provider || {};
        setBusinessName(p.business_name || '');
        setLogoUrl(p.logo_url || '');
        setPhotos(res.photos || []);
        setBio(p.bio || '');
        setSpecialties(Array.isArray(p.specialties) ? p.specialties : []);
        setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : '');
        setAvailability(!!p.availability);
        setEmergencyReady(!!p.emergency_ready);
        setAreas(
          (res.areas || []).map((a: any) => ({
            city: a.city || 'Abidjan',
            district: a.district || '',
            radius_km: a.radius_km || 10,
            latitude: a.latitude != null ? Number(a.latitude) : null,
            longitude: a.longitude != null ? Number(a.longitude) : null,
          }))
        );
      })
      .catch((err) => setError(err.message || 'Impossible de charger votre activité'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);
    setCategoriesError(null);
    fetchApi('/services/categories')
      .then((data) => {
        if (active) setCategories(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setCategoriesError(err.message || 'Impossible de charger les services proposés');
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [categoriesRetry]);

  const toggleSpecialty = (name: string) => {
    if (specialties.includes(name)) {
      setSpecialties(specialties.filter((specialty) => specialty !== name));
      return;
    }
    if (specialties.length >= 20) {
      setError('Vous pouvez sélectionner 20 services au maximum.');
      return;
    }
    setError(null);
    setSpecialties([...specialties, name]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await fetchApi('/providers/me', {
        method: 'PUT',
        body: JSON.stringify({
          business_name: businessName,
          bio,
          specialties,
          hourly_rate: hourlyRate === '' ? null : Number(hourlyRate),
          availability,
          emergency_ready: emergencyReady,
          logo_url: logoUrl,
        }),
      });
      const areaPayload = areas
        .filter((a) => a.district.trim() || (a.latitude != null && a.longitude != null))
        .map((a) => ({
          city: a.city || 'Abidjan',
          district: a.district.trim() || undefined,
          radius_km: a.radius_km || 10,
          latitude: a.latitude,
          longitude: a.longitude,
        }));
      if (areaPayload.length > 0) {
        await fetchApi('/providers/me/areas', {
          method: 'PUT',
          body: JSON.stringify({ areas: areaPayload }),
        });
      }
      setNotice('Activité enregistrée.');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Impossible d’enregistrer');
    } finally {
      setSaving(false);
    }
  };

  const shareAreaPosition = async (index: number) => {
    setError(null);
    setNotice(null);
    setLocatingArea(index);
    try {
      const position = await getBrowserPosition();
      setAreas((current) =>
        current.map((area, i) =>
          i === index
            ? { ...area, latitude: position.latitude, longitude: position.longitude }
            : area
        )
      );
      setNotice('Position GPS partagée. Enregistrez pour la publier sur la carte.');
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer votre position');
    } finally {
      setLocatingArea(null);
    }
  };

  const clearAreaPosition = (index: number) => {
    setAreas((current) =>
      current.map((area, i) => (i === index ? { ...area, latitude: null, longitude: null } : area))
    );
  };

  const updateLogo = async (file: File) => {
    setError(null);
    setUploadingMedia(true);
    try {
      setLogoUrl(await uploadImage(file, 'logo'));
    } catch (err: any) {
      setError(err.message || 'Impossible de téléverser le logo');
    } finally {
      setUploadingMedia(false);
    }
  };

  const generateLogo = async () => {
    try {
      await updateLogo(await generateLogoFile(businessName || 'ASSISTCI'));
    } catch (err: any) {
      setError(err.message || 'Impossible de générer le logo');
    }
  };

  const addPortfolioPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (photos.length + files.length > 24) {
      setError('La galerie est limitée à 24 photos.');
      return;
    }

    setError(null);
    setUploadingMedia(true);
    try {
      const added: any[] = [];
      for (const file of files) {
        const photoUrl = await uploadImage(file, 'portfolio');
        const result = await fetchApi('/providers/me/photos', {
          method: 'POST',
          body: JSON.stringify({ photo_url: photoUrl }),
        });
        added.push(result.photo);
      }
      setPhotos((current) => [...added, ...current]);
    } catch (err: any) {
      setError(err.message || 'Impossible d’ajouter les photos');
    } finally {
      setUploadingMedia(false);
    }
  };

  const removePortfolioPhoto = async (photoId: number) => {
    try {
      await fetchApi(`/providers/me/photos/${photoId}`, { method: 'DELETE' });
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    } catch (err: any) {
      setError(err.message || 'Impossible de supprimer cette photo');
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-2" />
        Chargement de votre activité…
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      {error && <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {notice}
        </div>
      )}

      <div className="card gap-4">
        <h3 className="font-extrabold text-lg flex items-center gap-2">
          <Wrench className="w-5 h-5 text-accent" />
          Mon activité
        </h3>

        <div>
          <label className="field-label mb-1">Nom de l’activité</label>
          <input className="field" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex. : Atelier Plomberie Cocody" />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <IdentityAvatar name={businessName || 'ASSISTCI'} src={logoUrl} className="w-20 h-20 rounded-xl border border-line" />
          <div className="flex flex-wrap gap-2">
            <label className="btn-outline inline-flex cursor-pointer">
              {uploadingMedia ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
              Importer un logo
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void updateLogo(file); }} disabled={uploadingMedia} className="sr-only" />
            </label>
            <button type="button" onClick={generateLogo} disabled={uploadingMedia} className="btn-outline disabled:opacity-50">
              <WandSparkles className="w-4 h-4 mr-2" />
              Générer un logo
            </button>
            {logoUrl && (
              <button type="button" onClick={() => void download(logoUrl, 'logo-prestataire')} className="btn-outline" title="Télécharger le logo">
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="field-label mb-1">Présentation</label>
          <textarea className="field min-h-[90px]" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Décrivez votre savoir-faire, vos prestations…" />
        </div>

        <div>
          <label className="field-label mb-1">Mes services / spécialités</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {specialties.map((s) => (
              <span key={s} className="badge-orange flex items-center gap-1.5">
                {s}
                <button type="button" onClick={() => setSpecialties(specialties.filter((x) => x !== s))}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {specialties.length === 0 && <span className="text-muted text-sm">Aucune spécialité ajoutée</span>}
          </div>
          <p className="text-muted text-sm mb-2">Choisissez les services que vous proposez parmi le catalogue ASSISTCI.</p>
          {categoriesLoading ? (
            <p className="text-muted text-sm">Chargement des services proposés…</p>
          ) : categoriesError ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-red-700">{categoriesError}</span>
              <button type="button" onClick={() => setCategoriesRetry((retry) => retry + 1)} className="btn-outline min-h-[36px] px-3">
                Réessayer
              </button>
            </div>
          ) : categories.length === 0 ? (
            <p className="text-muted text-sm">Aucun service proposé n’est disponible pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((category) => {
                const Icon = categoryIcon(category.icon_name);
                const checked = specialties.includes(category.name);
                return (
                  <label
                    key={category.id}
                    className={`flex items-start gap-3 rounded-card border p-3 cursor-pointer transition ${
                      checked ? 'border-accent bg-accent-light/50' : 'border-line hover:border-accent/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSpecialty(category.name)}
                      className="mt-1 h-4 w-4 flex-none"
                    />
                    <Icon className="w-4 h-4 mt-1 flex-none text-accent" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-sm">{category.name}</span>
                      {category.description && <span className="block text-xs text-muted mt-0.5">{category.description}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label mb-1">Tarif horaire (FCFA, optionnel)</label>
            <input type="number" min={0} className="field" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="Ex. : 5000" />
          </div>
          <div className="flex flex-col gap-3 justify-end">
            <label className="flex items-center gap-2 font-semibold text-sm">
              <input type="checkbox" checked={availability} onChange={(e) => setAvailability(e.target.checked)} className="w-4 h-4" />
              Disponible pour de nouvelles missions
            </label>
            <label className="flex items-center gap-2 font-semibold text-sm">
              <input type="checkbox" checked={emergencyReady} onChange={(e) => setEmergencyReady(e.target.checked)} className="w-4 h-4" />
              Intervient en urgence
            </label>
          </div>
        </div>
      </div>

      <div className="card gap-4">
        <h3 className="font-extrabold text-lg">Zones d’intervention</h3>
        <p className="text-muted text-sm -mt-2">Ajoutez les communes où vous acceptez des missions. Sans zone, vous verrez toutes les demandes ouvertes.</p>
        <div className="flex flex-col gap-2">
          {areas.map((a, i) => (
            <div key={i} className="rounded-card border border-line p-3 flex flex-col gap-2">
              <div className="flex gap-2 items-center flex-wrap">
                <input className="field flex-1 min-w-[140px]" value={a.city} onChange={(e) => setAreas(areas.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))} placeholder="Ville" />
                <input className="field flex-1 min-w-[140px]" list="districts" value={a.district} onChange={(e) => setAreas(areas.map((x, j) => (j === i ? { ...x, district: e.target.value } : x)))} placeholder="Commune / quartier" />
                <input type="number" min={1} className="field w-[110px]" value={a.radius_km} onChange={(e) => setAreas(areas.map((x, j) => (j === i ? { ...x, radius_km: Number(e.target.value) } : x)))} placeholder="Rayon km" />
                <button type="button" onClick={() => setAreas(areas.filter((_, j) => j !== i))} className="text-accent p-2" aria-label="Supprimer cette zone">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => void shareAreaPosition(i)}
                  disabled={locatingArea === i}
                  className="btn-outline min-h-[36px] px-3 text-xs disabled:opacity-50"
                >
                  {locatingArea === i ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {a.latitude != null && a.longitude != null ? 'Mettre à jour ma position' : 'Partager ma position'}
                </button>
                {a.latitude != null && a.longitude != null ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <MapPin className="w-3.5 h-3.5" />
                      Position GPS partagée
                    </span>
                    <button type="button" onClick={() => clearAreaPosition(i)} className="font-semibold text-muted hover:text-accent">
                      Retirer
                    </button>
                  </>
                ) : (
                  <span className="text-muted">Sans position GPS, cette zone n’apparaît pas sur la carte des prestataires.</span>
                )}
              </div>
            </div>
          ))}
          <datalist id="districts">
            {DISTRICT_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <button type="button" onClick={() => setAreas([...areas, { city: 'Abidjan', district: '', radius_km: 10, latitude: null, longitude: null }])} className="btn-outline self-start min-h-[40px] text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une zone
          </button>
        </div>
      </div>

      <div className="card gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-lg">Portfolio</h3>
            <p className="text-muted text-sm">{photos.length}/24 photos de vos réalisations</p>
          </div>
          <label className="btn-outline inline-flex cursor-pointer">
            {uploadingMedia ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
            Ajouter des photos
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={addPortfolioPhotos} disabled={uploadingMedia || photos.length >= 24} className="sr-only" />
          </label>
        </div>
        {photos.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative overflow-hidden rounded-card border border-line">
                <Image src={fileUrl(photo.photo_url)} alt={photo.caption || 'Réalisation du prestataire'} width={640} height={640} unoptimized className="w-full aspect-square object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button type="button" onClick={() => void download(photo.photo_url, `portfolio-${photo.id}`)} className="bg-white p-2 rounded-full shadow" title="Télécharger la photo" aria-label="Télécharger la photo">
                    <Download className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => void removePortfolioPhoto(photo.id)} className="bg-white p-2 rounded-full shadow text-red-600" title="Supprimer la photo" aria-label="Supprimer la photo">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">Aucune réalisation publiée pour le moment.</p>
        )}
      </div>

      <button type="submit" disabled={saving} className="btn-primary self-start disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer mon activité'}
      </button>
    </form>
  );
}

function Earnings() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchApi('/transactions'), fetchApi('/providers/me/stats')])
      .then(([tx, st]) => {
        setTransactions(tx || []);
        setStats(st);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-10 text-center text-muted text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-2" />
        Chargement de vos gains…
      </div>
    );
  }

  const fmt = (n: any) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
  const STATUS: Record<string, string> = { pending: 'En attente', completed: 'Encaissé', failed: 'Échoué', refunded: 'Remboursé' };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Wallet className="w-4 h-4" />} label="Gains encaissés" value={fmt(stats?.total_earnings)} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="En attente" value={fmt(stats?.pending_earnings)} />
        <StatCard icon={<Check className="w-4 h-4" />} label="Missions terminées" value={stats?.completed_missions ?? 0} />
      </div>

      <h3 className="font-extrabold text-lg">Historique des paiements</h3>
      {transactions.length === 0 ? (
        <div className="card text-center py-10 text-muted text-sm">Aucun paiement enregistré pour le moment.</div>
      ) : (
        transactions.map((t) => (
          <div key={t.id} className="card flex justify-between items-center gap-3 flex-wrap">
            <div>
              <div className="font-bold">{fmt(t.amount)}</div>
              <div className="text-muted text-xs mt-0.5">
                {t.payment_method} · {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <span className={t.payment_status === 'completed' ? 'badge-green' : t.payment_status === 'pending' ? 'badge-orange' : 'badge-gray'}>
              {STATUS[t.payment_status] || t.payment_status}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export default function ProviderSpace() {
  const [tab, setTab] = useState<Tab>('missions');
  const [providerId, setProviderId] = useState<number | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missionFilter, setMissionFilter] = useState<'current' | 'available' | 'done'>('current');

  const load = async () => {
    try {
      const [me, reqs] = await Promise.all([fetchApi('/providers/me'), fetchApi('/requests')]);
      setProviderId(me.provider?.id ?? null);
      setRequests(reqs || []);
      fetchApi('/providers/me/stats').then(setStats).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Impossible de charger votre espace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
        <p className="text-muted text-sm">Chargement de votre espace...</p>
      </div>
    );
  }

  const available = requests.filter((r) => r.status === 'created' || r.status === 'matching');
  const mine = requests.filter((r) => providerId != null && r.assigned_provider_id === providerId);
  const mineOpen = mine.filter((r) => !isDone(r.status));
  const mineDone = mine.filter((r) => isDone(r.status));

  const shown = missionFilter === 'available' ? available : missionFilter === 'done' ? mineDone : mineOpen;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'missions', label: 'Missions' },
    { key: 'activity', label: 'Mon activité' },
    { key: 'earnings', label: 'Mes gains' },
    { key: 'notifications', label: 'Notifications' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-[28px] font-extrabold m-0">Espace prestataire</h1>
          <p className="text-muted text-sm mt-1">Missions, activité, gains et notifications.</p>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {stats.rating ? Number(stats.rating).toFixed(1) : '—'} ({stats.total_reviews || 0})
            </span>
            <span className={`badge ${stats.availability ? 'badge-green' : 'badge-gray'}`}>
              {stats.availability ? 'Disponible' : 'Indisponible'}
            </span>
          </div>
        )}
      </div>

      <div className="segmented-control mb-5" role="group" aria-label="Navigation de l’espace prestataire">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
            aria-pressed={tab === t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4">{error}</div>}

      {tab === 'notifications' ? (
        <NotificationsPanel />
      ) : tab === 'activity' ? (
        <ActivityEditor onSaved={load} />
      ) : tab === 'earnings' ? (
        <Earnings />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-1 p-1 w-fit rounded-badge">
            {([
              { key: 'current', label: `En cours (${mineOpen.length})` },
              { key: 'available', label: `Disponibles (${available.length})` },
              { key: 'done', label: `Terminées (${mineDone.length})` },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setMissionFilter(f.key)}
                className={`min-h-[38px] px-3.5 rounded-badge font-bold text-sm border transition ${
                  missionFilter === f.key ? 'bg-accent text-white border-accent' : 'bg-white text-muted border-line hover:text-navy'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="card text-center py-10 text-muted text-sm">
              {missionFilter === 'available' ? 'Aucune demande disponible dans vos zones.' : 'Rien dans cet onglet.'}
            </div>
          ) : (
            shown.map((req) => <RequestCard key={req.id} req={req} showClient />)
          )}
        </div>
      )}
    </div>
  );
}