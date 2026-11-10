'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MapPin, Star } from 'lucide-react';
import { fetchApi, getCurrentUser } from '../../../lib/api';

interface ServiceCategory {
  id: number;
  name: string;
}

interface ProviderSummary {
  id: number;
  business_name: string | null;
  first_name: string | null;
  last_name: string | null;
  rating: string | number | null;
  total_reviews: string | number | null;
  availability: boolean;
  district: string | null;
  city: string | null;
  specialties: string[] | null;
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted">Chargement du formulaire…</div>}>
      <NewRequestForm />
    </Suspense>
  );
}

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerIdParam = searchParams.get('provider_id');
  const providerId = providerIdParam ? Number(providerIdParam) : null;
  const initialDescription = searchParams.get('description') || '';

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [provider, setProvider] = useState<ProviderSummary | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(initialDescription);
  const [city, setCity] = useState('Abidjan');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadFormData() {
      setPageLoading(true);
      setError(null);
      try {
        const [categoryData, providerData] = await Promise.all([
          fetchApi('/services/categories', { signal: controller.signal }),
          providerId === null
            ? Promise.resolve(null)
            : Number.isInteger(providerId) && providerId > 0
              ? fetchApi(`/services/providers/${providerId}`, { signal: controller.signal })
              : Promise.reject(new Error('Identifiant prestataire invalide')),
        ]);
        if (!active) return;
        const loadedCategories = Array.isArray(categoryData) ? categoryData : [];
        setCategories(loadedCategories);
        setCategoryId((current) => current || String(loadedCategories[0]?.id || ''));
        setProvider(providerData);
        if (providerData?.city) setCity(providerData.city);
        if (providerData?.district) setDistrict(providerData.district);
        if (providerData) {
          setTitle(`Demande de service pour ${providerData.business_name || 'un prestataire'}`);
        }
      } catch (loadError) {
        if (active) {
          console.error('Erreur de chargement du formulaire de demande:', loadError);
          setError('Impossible de préparer la demande. Vérifiez votre connexion puis réessayez.');
        }
      } finally {
        if (active) setPageLoading(false);
      }
    }

    void loadFormData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [providerId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!getCurrentUser()) {
      const returnUrl = `/requests/new${window.location.search}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    if (!categoryId || !title.trim() || !description.trim() || !city.trim()) {
      setError('Veuillez renseigner le service, le titre, la description et la ville.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await fetchApi('/requests', {
        method: 'POST',
        body: JSON.stringify({
          category_id: Number(categoryId),
          title: title.trim(),
          description: description.trim(),
          city: city.trim(),
          district: district.trim() || null,
          address_text: address.trim() || null,
          provider_id: provider?.id,
        }),
      });
      setCreatedRequestId(result.request.id);
    } catch (submitError) {
      console.error('Erreur de création de demande:', submitError);
      setError(submitError instanceof Error ? submitError.message : 'Impossible d’envoyer la demande.');
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <section className="py-16 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted">Préparation de votre demande…</p>
      </section>
    );
  }

  if (createdRequestId) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Votre demande a été envoyée</h1>
        <p className="mt-2 text-muted">Référence #{createdRequestId}. Vous pourrez suivre son évolution depuis votre espace.</p>
        <Link href="/dashboard" className="btn-primary mt-6">Suivre ma demande</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <Link href={provider ? `/providers/${provider.id}` : '/providers'} className="mb-4 inline-flex text-sm font-semibold text-muted hover:text-navy">
        ← Retour aux prestataires
      </Link>
      <div className="card">
        <h1 className="m-0 text-2xl font-extrabold">Décrire votre besoin</h1>
        <p className="mt-2 text-sm text-muted">Envoyez votre demande et suivez la réponse depuis votre espace ASSISTCI.</p>

        {provider && (
          <div className="mt-5 rounded-xl border border-line bg-page p-4">
            <div className="font-bold">{provider.business_name || `${provider.first_name || ''} ${provider.last_name || ''}`.trim()}</div>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {[provider.district, provider.city].filter(Boolean).join(', ') || 'Zone non renseignée'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {Number(provider.rating || 0).toFixed(1)} ({provider.total_reviews || 0} avis)
              </span>
              <span>{provider.availability ? 'Disponible' : 'Indisponible'}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="service-category" className="field-label">Service demandé *</label>
            <select id="service-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="field" required>
              <option value="" disabled>Choisir un service</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="request-title" className="field-label">Titre de la demande *</label>
            <input id="request-title" value={title} onChange={(event) => setTitle(event.target.value)} className="field" maxLength={255} required />
          </div>
          <div>
            <label htmlFor="request-description" className="field-label">Décrivez le travail à réaliser *</label>
            <textarea id="request-description" value={description} onChange={(event) => setDescription(event.target.value)} className="field min-h-32 resize-y" rows={5} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="request-city" className="field-label">Ville *</label>
              <input id="request-city" value={city} onChange={(event) => setCity(event.target.value)} className="field" maxLength={100} required />
            </div>
            <div>
              <label htmlFor="request-district" className="field-label">Commune / quartier</label>
              <input id="request-district" value={district} onChange={(event) => setDistrict(event.target.value)} className="field" maxLength={100} />
            </div>
          </div>
          <div>
            <label htmlFor="request-address" className="field-label">Adresse ou repère complémentaire</label>
            <input id="request-address" value={address} onChange={(event) => setAddress(event.target.value)} className="field" maxLength={255} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting || categories.length === 0}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? 'Envoi en cours…' : 'Envoyer la demande'}
          </button>
        </form>
      </div>
    </section>
  );
}
