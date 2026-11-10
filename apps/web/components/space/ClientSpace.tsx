'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Star } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import RequestCard, { isDone } from './RequestCard';
import NotificationsPanel from './NotificationsPanel';

type Tab = 'open' | 'done' | 'reviews' | 'notifications';

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star className={`w-5 h-5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-line'}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ request, onDone }: { request: any; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError('Choisissez une note');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchApi('/reviews', {
        method: 'POST',
        body: JSON.stringify({ request_id: request.id, rating, comment }),
      });
      onDone();
    } catch (err: any) {
      setError(err.message || 'Impossible d’enregistrer l’avis');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card gap-3 border border-line">
      <div className="font-bold">
        Évaluer #{request.id} · {request.title}
      </div>
      <Stars value={rating} onChange={setRating} />
      <textarea
        className="field min-h-[72px]"
        placeholder="Votre expérience (optionnel)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button type="submit" disabled={saving} className="btn-primary self-start disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier mon avis'}
      </button>
    </form>
  );
}

export default function ClientSpace() {
  const [requests, setRequests] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('open');

  const load = async () => {
    try {
      const [reqs, revs] = await Promise.all([fetchApi('/requests'), fetchApi('/reviews/mine')]);
      setRequests(reqs || []);
      setReviews(revs || []);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos données');
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
        <p className="text-muted text-sm">Chargement de vos données...</p>
      </div>
    );
  }

  const open = requests.filter((r) => !isDone(r.status));
  const done = requests.filter((r) => isDone(r.status));
  const reviewedIds = new Set(reviews.map((r) => r.request_id));
  const toReview = done.filter((r) => r.status === 'completed' && !reviewedIds.has(r.id));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'open', label: 'En cours', count: open.length },
    { key: 'done', label: 'Terminées', count: done.length },
    { key: 'reviews', label: 'Mes avis', count: reviews.length },
    { key: 'notifications', label: 'Notifications' },
  ];

  const shown = tab === 'open' ? open : tab === 'done' ? done : [];

  return (
    <div>
      <div className="flex justify-between items-center gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-[28px] font-extrabold m-0">Mes demandes</h1>
          <p className="text-muted text-sm mt-1">Suivez vos demandes de service et vos avis.</p>
        </div>
        <Link href="/assistance" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle demande
        </Link>
      </div>

      <div className="segmented-control mb-5" role="group" aria-label="Filtrer mes demandes">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
            aria-pressed={tab === t.key}
          >
            {t.label}
            {t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4">{error}</div>}

      {tab === 'notifications' ? (
        <NotificationsPanel />
      ) : tab === 'reviews' ? (
        <div className="flex flex-col gap-4">
          {toReview.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-extrabold text-lg">Interventions à évaluer</h3>
              {toReview.map((r) => (
                <ReviewForm key={r.id} request={r} onDone={load} />
              ))}
            </div>
          )}
          <h3 className="font-extrabold text-lg mt-2">Avis publiés</h3>
          {reviews.length === 0 ? (
            <div className="card text-center py-10 text-muted text-sm">Vous n’avez laissé aucun avis pour le moment.</div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="card gap-2">
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="font-bold">{rev.business_name}</div>
                  <Stars value={rev.rating} />
                </div>
                <div className="text-muted text-sm">{rev.request_title}</div>
                {rev.comment && <div className="text-sm">{rev.comment}</div>}
                <div className="text-xs text-muted">
                  {new Date(rev.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-14">
          <h3 className="font-extrabold text-lg">Aucune demande</h3>
          <p className="text-sm text-muted max-w-md mx-auto mt-1 mb-5">
            Besoin d’un professionnel ? Lancez une demande en quelques secondes.
          </p>
          <Link href="/assistance" className="btn-primary mx-auto">Créer une demande</Link>
        </div>
      ) : shown.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-muted text-sm">Aucune demande dans cet onglet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((req) => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  );
}