'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, CheckCircle2, MapPin, Phone, Loader2, Download } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import IdentityAvatar from '../../../components/IdentityAvatar';
import { download, fileUrl } from '../../../lib/media';

const VERIFICATION_LABELS: { label: string; ok: (p: any) => boolean }[] = [
  { label: 'Identité confirmée', ok: (p) => p.verification_status === 'verified' },
  { label: 'Documents KYC approuvés', ok: (p) => p.verified_documents > 0 },
  { label: 'Zone déclarée', ok: (p) => !!p.city },
  { label: 'Téléphone actif', ok: (p) => !!p.phone_verified },
];

export default function ProviderProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const providerId = Number(params?.id);

  const [provider, setProvider] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!Number.isInteger(providerId)) {
      setMissing(true);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [p, r] = await Promise.all([
          fetchApi(`/services/providers/${providerId}`),
          fetchApi(`/reviews/provider/${providerId}`),
        ]);
        setProvider(p);
        setReviews(r || []);
      } catch (err) {
        console.error('Erreur chargement profil:', err);
        setMissing(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [providerId]);

  if (loading) {
    return (
      <section className="py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
        <p className="text-muted text-sm">Chargement du profil...</p>
      </section>
    );
  }

  if (missing || !provider) {
    return (
      <section className="py-16 text-center max-w-[1120px] mx-auto px-6">
        <h1 className="text-[28px] font-extrabold">Prestataire introuvable</h1>
        <Link href="/providers" className="btn-outline mt-4">Retour aux résultats</Link>
      </section>
    );
  }

  const name = provider.business_name || `${provider.first_name} ${provider.last_name}`;
  const verified = provider.verification_status === 'verified';
  const ratingsCount = provider.total_reviews || reviews.length;
  const avgRating = provider.rating || 0;
  const specialties: string[] =
    Array.isArray(provider.specialties) && provider.specialties.length
      ? provider.specialties
      : ['Dépannage auto', 'Mécanique légère', 'Remorquage'];

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const params2 = new URLSearchParams({ provider_id: String(providerId) });
    if (description.trim()) params2.set('description', description.trim());
    router.push(`/requests/new?${params2.toString()}`);
  };

  return (
    <section className="py-6">
      <div className="max-w-[1120px] mx-auto px-6">
        <Link href="/providers" className="inline-flex items-center font-semibold text-muted hover:text-navy mb-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Résultats de recherche
        </Link>

        {/* Carte profil */}
        <div className="card">
          <div className="flex gap-5 flex-wrap items-center">
            <IdentityAvatar name={name} src={provider.logo_url} className="w-20 h-20 border border-line" />
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[26px] font-extrabold m-0">{name}</h1>
                {verified ? (
                  <span className="badge-green">✓ Vérifié niv. 2</span>
                ) : (
                  <span className="badge-orange">Profil en cours de vérification</span>
                )}
              </div>
              <p className="text-muted mt-1 mb-2">{provider.bio || 'Mécanicien · dépannage sur place'}</p>
              <div className="flex gap-4 text-sm text-muted flex-wrap">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {parseFloat(avgRating).toFixed(1)} ({ratingsCount} avis)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {provider.district ? `${provider.district}, ${provider.city || 'Abidjan'}` : 'Grand Abidjan'}
                </span>
                <span>{provider.completed_missions || 0} interventions terminées</span>
              </div>
            </div>
            <div className="flex gap-2">
              {provider.logo_url && (
                <button type="button" onClick={() => void download(provider.logo_url, 'logo-prestataire')} className="btn-outline" title="Télécharger le logo">
                  <Download className="w-4 h-4" />
                </button>
              )}
              {provider.phone ? (
                <a href={`tel:${String(provider.phone).replace(/[^\d+]/g, '')}`} className="btn-outline">
                  <Phone className="w-4 h-4 mr-2" />
                  Contacter
                </a>
              ) : (
                <button type="button" className="btn-outline opacity-60" disabled title="Numéro non renseigné">
                  <Phone className="w-4 h-4 mr-2" />
                  Contacter
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 mt-5 items-start">
          {/* Colonne principale */}
          <div className="flex flex-col gap-5">
            {/* Vérifications */}
            <div className="card">
              <h2 className="font-extrabold text-lg mb-3">Vérifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {VERIFICATION_LABELS.map((v) => {
                  const ok = v.ok(provider);
                  return (
                    <div key={v.label} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`w-5 h-5 ${ok ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span className={ok ? '' : 'text-muted'}>{v.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted mt-4">
                Badge Pending en attente : nos vérifications finales ne sont pas encore terminées sur le terrain.
              </p>
            </div>

            {/* Services */}
            <div className="card">
              <h2 className="font-extrabold text-lg mb-3">Services</h2>
              <div className="flex flex-wrap gap-2">
                {specialties.map((s) => (
                  <span key={s} className="badge-green">{s}</span>
                ))}
              </div>
            </div>

            {Array.isArray(provider.photos) && provider.photos.length > 0 && (
              <div className="card">
                <h2 className="font-extrabold text-lg mb-3">Réalisations</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {provider.photos.map((photo: any) => (
                    <div key={photo.id} className="relative overflow-hidden rounded-card border border-line">
                      <Image src={fileUrl(photo.photo_url)} alt={photo.caption || `Réalisation de ${name}`} width={640} height={640} unoptimized className="w-full aspect-square object-cover" />
                      <button type="button" onClick={() => void download(photo.photo_url, `portfolio-${photo.id}`)} className="absolute top-2 right-2 bg-white p-2 rounded-full shadow" title="Télécharger la photo" aria-label="Télécharger la photo">
                        <Download className="w-4 h-4" />
                      </button>
                      {photo.caption && <p className="p-2 text-xs text-muted">{photo.caption}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Avis */}
            <div className="card">
              <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                <h2 className="font-extrabold text-lg m-0">Avis</h2>
                <span className="flex items-center gap-1 text-sm font-bold text-muted">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {parseFloat(avgRating).toFixed(1)} ({ratingsCount})
                </span>
              </div>
              {reviews.length === 0 ? (
                <p className="text-muted text-sm">Aucun avis pour le moment.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {reviews.map((r) => (
                    <li key={r.id} className="pb-3 border-b border-line last:border-0">
                      <div className="flex items-center gap-2.5">
                        <IdentityAvatar name={r.client_first_name || 'Client'} className="w-9 h-9 border border-line" />
                        <div>
                          <b className="text-sm">{r.client_first_name}</b>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={`w-3.5 h-3.5 ${
                                  n <= Number(r.rating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {r.comment && <p className="text-sm mt-2">{r.comment}</p>}
                      <p className="text-xs text-muted mt-1">
                        {new Date(r.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Demander une intervention */}
          <form onSubmit={handleRequest} className="card gap-3 self-start">
            <h2 className="font-extrabold text-lg">Demander une intervention</h2>
            <label className="field-label">Que se passe-t-il ? (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Décrivez le service souhaité et votre localisation."
              className="field resize-y"
            />
            <button type="submit" className="btn-primary w-full mt-1">
              Envoyer la demande
            </button>
            <p className="text-xs text-muted">
              Le prestataire recevra votre demande et pourra vous proposer une intervention.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}