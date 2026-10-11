'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { fetchApi, getCurrentUser } from '../../lib/api';

const DOCUMENT_TYPES = [
  { id: 'cni', label: 'Carte Nationale d’Identité (CNI)', desc: 'Recto / Verso lisible' },
  { id: 'passport', label: 'Passeport biométrique', desc: 'Page avec photo et signature' },
  { id: 'selfie', label: 'Photo du visage (Selfie de contrôle)', desc: 'Visage net et bien éclairé' },
  { id: 'trade_register', label: 'Registre de commerce (DFE / RCCM)', desc: 'Pour les ateliers et garages enregistrés' },
  { id: 'driving_license', label: 'Permis de conduire', desc: 'Requis pour les chauffeurs dépanneurs' },
];

export default function KycPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('cni');
  const [docUrl, setDocUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login?redirect=/kyc');
      return;
    }
    setUser(currentUser);

    const loadDocs = async () => {
      try {
        const docs = await fetchApi('/kyc/my-documents');
        setDocuments(docs);
      } catch (err: any) {
        console.error('Erreur chargement documents KYC:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDocs();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUrl.trim()) {
      setError('Veuillez indiquer le lien ou la référence du document');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetchApi('/kyc/upload', {
        method: 'POST',
        body: JSON.stringify({
          document_type: selectedType,
          document_url: docUrl.trim(),
        }),
      });

      setSuccess('Document téléversé avec succès. Il est en cours d’examen par un administrateur.');
      setDocUrl('');
      setDocuments([res.document, ...documents]);
    } catch (err: any) {
      setError(err.message || 'Impossible de soumettre le document');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Validé
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Rejeté
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            En attente de vérification
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full mb-2 uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          Confiance & Sécurité ASSISTCI
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Vérification d'Identité (KYC)
        </h1>
        <p className="text-slate-600 mt-1">
          Pour garantir la sécurité de nos clients à Abidjan, les prestataires et dépanneurs doivent valider leur identité.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulaire de soumission */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-orange-600" />
            <span>Soumettre un justificatif</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Type de document
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>{dt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Fichier / Photo du document (Lien sécurisé ou image)
              </label>
              <input
                type="text"
                required
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="Ex: https://storage.assistci.ci/uploads/cni-scan.jpg"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Formats acceptés : JPG, PNG, PDF haute définition. Vos documents sont strictement confidentiels.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Envoyer pour validation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Historique des documents */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            <span>Vos documents soumis</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm">Aucun document soumis pour le moment.</p>
              <p className="text-xs text-slate-400">
                Téléversez au minimum votre CNI et un selfie pour activer le badge vérifié.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                        {DOCUMENT_TYPES.find((t) => t.id === d.document_type)?.label || d.document_type}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Soumis le {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    {getStatusBadge(d.status)}
                  </div>

                  {d.rejection_reason && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                      <strong>Motif de refus :</strong> {d.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
