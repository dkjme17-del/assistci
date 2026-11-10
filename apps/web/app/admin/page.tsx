'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  Wrench,
  Car,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Loader2,
  ExternalLink,
  Download,
} from 'lucide-react';
import { downloadApiFile, fetchApi, getCurrentUser } from '../../lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [documentLoading, setDocumentLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, kycData] = await Promise.all([
        fetchApi('/admin/stats'),
        fetchApi('/admin/kyc/pending'),
      ]);
      setStats(statsData);
      setPendingKyc(kycData);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger l espace administrateur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login?redirect=/admin');
      return;
    }
    loadData();
  }, [router]);

  const handleReview = async (id: number, status: 'approved' | 'rejected') => {
    let rejection_reason = '';
    if (status === 'rejected') {
      const reason = prompt('Indiquez le motif de refus (ex: Document flou, illisible, expiré) :');
      if (!reason) return;
      rejection_reason = reason;
    }

    setActionLoading(id);
    try {
      await fetchApi(`/admin/kyc/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ status, rejection_reason }),
      });

      // Retirer le document validé/rejeté de la liste
      setPendingKyc((prev) => prev.filter((doc) => doc.id !== id));
      if (stats) {
        setStats({ ...stats, pending_kyc: Math.max(0, stats.pending_kyc - 1) });
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    setDocumentLoading(doc.id);
    setError(null);
    try {
      if (/^https:\/\//i.test(doc.document_url || '')) {
        window.open(doc.document_url, '_blank', 'noopener,noreferrer');
      } else {
        const extension = String(doc.document_url || '').match(/\.(pdf|png|jpe?g)$/i)?.[0] || '.file';
        await downloadApiFile(`/kyc/documents/${doc.id}/file`, `justificatif-${doc.id}${extension}`);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer le justificatif');
    } finally {
      setDocumentLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
        <p className="text-muted text-sm">Chargement du panneau d'administration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full mb-2 uppercase">
          <ShieldAlert className="w-3.5 h-3.5" />
          Supervision & Modération
        </div>
        <h1 className="text-3xl font-extrabold text-navy">
          Tableau de bord Administrateur ASSISTCI
        </h1>
        <p className="text-muted mt-1">
          Supervisez l’activité de la plateforme et examinez les dossiers de vérification d’identité (KYC).
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Cartes statistiques */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
            <div className="flex items-center gap-3 text-muted mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Utilisateurs</span>
            </div>
            <div className="text-3xl font-extrabold text-navy">{stats.total_users}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
            <div className="flex items-center gap-3 text-muted mb-2">
              <Wrench className="w-5 h-5 text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider">Prestataires</span>
            </div>
            <div className="text-3xl font-extrabold text-navy">{stats.total_providers}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
            <div className="flex items-center gap-3 text-muted mb-2">
              <Car className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Demandes d'aide</span>
            </div>
            <div className="text-3xl font-extrabold text-navy">{stats.total_requests}</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm">
            <div className="flex items-center gap-3 text-muted mb-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider">KYC en attente</span>
            </div>
            <div className="text-3xl font-extrabold text-amber-600">{stats.pending_kyc}</div>
          </div>
        </div>
      )}

      {/* File d'attente KYC */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-line shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-navy">
              Dossiers de vérification d'identité à examiner
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Vérifiez la conformité des pièces d'identité avant d'accorder le statut vérifié aux prestataires.
            </p>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-bold">
            {pendingKyc.length} dossier(s) en attente
          </span>
        </div>

        {pendingKyc.length === 0 ? (
          <div className="py-12 text-center text-muted space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-semibold text-navy">Aucun dossier en attente de modération</p>
            <p className="text-xs text-muted">Toutes les pièces d'identité ont été traitées.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="pb-3">Utilisateur</th>
                  <th className="pb-3">Rôle / Atelier</th>
                  <th className="pb-3">Type Document</th>
                  <th className="pb-3">Justificatif</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pendingKyc.map((doc) => (
                  <tr key={doc.id} className="hover:bg-canvas">
                    <td className="py-4">
                      <div className="font-bold text-navy">{doc.first_name} {doc.last_name}</div>
                      <div className="text-xs text-muted">{doc.email} • {doc.phone}</div>
                    </td>
                    <td className="py-4">
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-line text-navy uppercase">
                        {doc.role}
                      </span>
                      {doc.business_name && (
                        <div className="text-xs text-muted mt-0.5 font-medium">{doc.business_name}</div>
                      )}
                    </td>
                    <td className="py-4 font-semibold text-navy uppercase text-xs">
                      {doc.document_type}
                    </td>
                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => void handleDownloadDocument(doc)}
                        disabled={documentLoading === doc.id}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-semibold disabled:opacity-50"
                      >
                        {documentLoading === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : /^https:\/\//i.test(doc.document_url || '') ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                        <span>{/^https:\/\//i.test(doc.document_url || '') ? 'Ouvrir le lien sécurisé' : 'Télécharger en privé'}</span>
                      </button>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReview(doc.id, 'approved')}
                          disabled={actionLoading === doc.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valider</span>
                        </button>
                        <button
                          onClick={() => handleReview(doc.id, 'rejected')}
                          disabled={actionLoading === doc.id}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejeter</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

