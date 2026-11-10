'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Download,
  Link2,
  LockKeyhole,
} from 'lucide-react';
import { downloadApiFile, fetchApi, getCurrentUser, postApiForm } from '../../lib/api';

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
  const [sourceMode, setSourceMode] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [secureLink, setSecureLink] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileUploadsEnabled = process.env.NEXT_PUBLIC_FILE_UPLOADS_ENABLED !== 'false';

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

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
    if (sourceMode === 'file' && !selectedFile) {
      setError('Sélectionnez le fichier justificatif à transmettre.');
      return;
    }
    if (sourceMode === 'link' && !secureLink.trim()) {
      setError('Saisissez le lien sécurisé de votre document.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('document_type', selectedType);
      if (sourceMode === 'file' && selectedFile) formData.append('file', selectedFile);
      if (sourceMode === 'link') formData.append('document_url', secureLink.trim());
      const res = await postApiForm('/kyc/upload', formData);

      setSuccess('Document téléversé avec succès. Il est en cours d’examen par un administrateur.');
      setSelectedFile(null);
      setSecureLink('');
      setDocuments([res.document, ...documents]);
    } catch (err: any) {
      setError(err.message || 'Impossible de soumettre le document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setError('Format refusé. Choisissez un fichier JPG, PNG ou PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10 Mo.');
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDownload = async (document: any) => {
    setDownloadingId(document.id);
    setError(null);
    try {
      const isExternal = /^https:\/\//i.test(document.document_url || '');
      if (isExternal) {
        window.open(document.document_url, '_blank', 'noopener,noreferrer');
      } else {
        const extension = `.${String(document.document_url).split('.').pop()}`;
        await downloadApiFile(`/kyc/documents/${document.id}/file`, `justificatif-${document.id}${extension}`);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de télécharger le document');
    } finally {
      setDownloadingId(null);
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
        <h1 className="text-3xl font-extrabold text-navy">
          Vérification d'Identité (KYC)
        </h1>
        <p className="text-muted mt-1">
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
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-line shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-accent" />
            <span>Soumettre un justificatif</span>
          </h2>

          {!fileUploadsEnabled ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              La soumission de documents KYC est désactivée sur cette version démo.
              N’envoyez aucun document d’identité.
            </p>
          ) : <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                Type de document
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>{dt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                Fichier / photo du document
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1 mb-3">
                <button type="button" aria-pressed={sourceMode === 'file'} onClick={() => setSourceMode('file')} className={`min-h-10 rounded-lg text-sm font-bold ${sourceMode === 'file' ? 'bg-white text-navy shadow-sm' : 'text-muted'}`}>
                  <UploadCloud className="w-4 h-4 inline mr-2" />Fichier
                </button>
                <button type="button" aria-pressed={sourceMode === 'link'} onClick={() => setSourceMode('link')} className={`min-h-10 rounded-lg text-sm font-bold ${sourceMode === 'link' ? 'bg-white text-navy shadow-sm' : 'text-muted'}`}>
                  <Link2 className="w-4 h-4 inline mr-2" />Lien sécurisé
                </button>
              </div>

              {sourceMode === 'file' ? (
                <>
                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-canvas px-4 py-5 text-center hover:border-accent">
                    <UploadCloud className="w-6 h-6 text-accent mb-2" />
                    <span className="text-sm font-bold text-navy">{selectedFile ? 'Remplacer le document' : 'Choisir un fichier'}</span>
                    <span className="text-xs text-muted mt-1">JPG, PNG ou PDF · 10 Mo maximum</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={handleFileChange} className="sr-only" />
                  </label>
                  {selectedFile && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-3">
                      {previewUrl ? (
                        <Image src={previewUrl} alt="Aperçu du justificatif" width={80} height={80} unoptimized className="h-16 w-16 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-canvas text-accent"><FileText className="w-7 h-7" /></span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-navy">{selectedFile.name}</div>
                        <div className="text-xs text-muted">{(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="url"
                    value={secureLink}
                    onChange={(e) => setSecureLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl border border-input text-sm text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-muted mt-2">Le lien doit être en HTTPS et accessible à l’équipe de vérification. Privilégiez un lien protégé et temporaire.</p>
                </>
              )}
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">
                <LockKeyhole className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Vos fichiers sont stockés dans un espace privé et accessibles uniquement par vous et les personnes habilitées à vérifier votre dossier.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
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
          </form>}
        </div>

        {/* Historique des documents */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-line shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <FileText className="w-5 h-5 text-navy" />
            <span>Vos documents soumis</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-muted text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-muted space-y-2">
              <AlertCircle className="w-8 h-8 text-muted mx-auto" />
              <p className="text-sm">Aucun document soumis pour le moment.</p>
              <p className="text-xs text-muted">
                Téléversez au minimum votre CNI et un selfie pour activer le badge vérifié.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl border border-line bg-canvas flex flex-col justify-between gap-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-navy uppercase tracking-wide">
                        {DOCUMENT_TYPES.find((t) => t.id === d.document_type)?.label || d.document_type}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
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
                  <button type="button" onClick={() => void handleDownload(d)} disabled={downloadingId === d.id} className="inline-flex items-center gap-2 self-start text-xs font-semibold text-accent hover:underline disabled:opacity-50">
                    {downloadingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {/^https:\/\//i.test(d.document_url || '') ? 'Ouvrir le lien sécurisé' : 'Télécharger mon justificatif'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
