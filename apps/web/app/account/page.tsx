'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, User, Lock, ShieldCheck, CheckCircle2, ImagePlus, Mail, Phone } from 'lucide-react';
import { fetchApi, getCurrentUser, setCurrentUser, setAuthSession } from '../../lib/api';
import IdentityAvatar from '../../components/IdentityAvatar';
import { uploadImage } from '../../lib/media';

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [sendingVerification, setSendingVerification] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push('/login?redirect=/account');
      return;
    }
    fetchApi('/auth/me')
      .then((res) => {
        setUser(res.user);
        setProvider(res.provider);
        setFirstName(res.user.first_name || '');
        setLastName(res.user.last_name || '');
        setPhone(res.user.phone || '');
        setAvatarUrl(res.user.avatar_url || '');
      })
      .catch((err) => setError(err.message || 'Impossible de charger le profil'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSavingProfile(true);
    try {
      const res = await fetchApi('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          avatar_url: avatarUrl,
        }),
      });
      setUser(res.user);
      setCurrentUser(res.user);
      setNotice('Profil mis à jour.');
    } catch (err: any) {
      setError(err.message || 'Impossible de mettre à jour le profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setError(null);
    setUploadingAvatar(true);
    try {
      setAvatarUrl(await uploadImage(file, 'avatar'));
    } catch (err: any) {
      setError(err.message || 'Impossible de téléverser la photo');
    } finally {
      URL.revokeObjectURL(preview);
      setAvatarPreview('');
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetchApi('/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (res?.token) {
        setAuthSession(res.token, res.refresh_token);
      }
      setNotice('Mot de passe modifié.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Impossible de modifier le mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    setError(null);
    setNotice(null);
    setSendingVerification(true);
    try {
      const res = await fetchApi('/auth/resend-verification', { method: 'POST' });
      setNotice(res.message || 'Email de vérification envoyé.');
    } catch (err: any) {
      setError(err.message || 'Impossible d’envoyer l’email de vérification');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleRequestOtp = async () => {
    setError(null);
    setNotice(null);
    setSendingOtp(true);
    try {
      const res = await fetchApi('/auth/phone/request-otp', { method: 'POST' });
      setOtpSent(true);
      setNotice(res.message || 'Code envoyé par SMS.');
    } catch (err: any) {
      setError(err.message || 'Impossible d’envoyer le code SMS');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setVerifyingOtp(true);
    try {
      const res = await fetchApi('/auth/phone/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ code: otpCode }),
      });
      setUser((prev: any) => (prev ? { ...prev, phone_verified: true } : prev));
      setOtpSent(false);
      setOtpCode('');
      setNotice(res.message || 'Numéro de téléphone vérifié.');
    } catch (err: any) {
      setError(err.message || 'Code invalide');
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
        <p className="text-muted text-sm">Chargement de votre profil...</p>
      </div>
    );
  }

  const verified = user?.verification_status === 'verified';

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-[28px] font-extrabold m-0">Mon profil</h1>
        {verified ? (
          <span className="badge-green">✓ Vérifié</span>
        ) : (
          <span className="badge-orange">Vérification en cours</span>
        )}
      </div>
      <p className="text-muted text-sm mb-6">
        Gérez vos informations personnelles et la sécurité de votre compte.
      </p>

      {error && <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {notice && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {notice}
        </div>
      )}

      {/* Informations personnelles */}
      <form onSubmit={handleSaveProfile} className="card gap-4 mb-5">
        <h2 className="font-extrabold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-accent" />
          Informations personnelles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label mb-1">Prénom *</label>
            <input className="field" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="field-label mb-1">Nom *</label>
            <input className="field" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field-label mb-1">Téléphone *</label>
          <input className="field" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div>
          <label className="field-label mb-1">Email (non modifiable)</label>
          <input className="field bg-canvas" value={user?.email || ''} disabled />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <IdentityAvatar
            name={`${firstName} ${lastName}`.trim() || user?.email || 'ASSISTCI'}
            src={avatarPreview || avatarUrl}
            className="w-20 h-20 border border-line"
          />
          <div className="flex-1 min-w-[220px]">
            <label className="field-label mb-1">Photo de profil</label>
            <label className="btn-outline inline-flex cursor-pointer">
              {uploadingAvatar ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
              {uploadingAvatar ? 'Téléversement…' : 'Choisir une photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarUpload} disabled={uploadingAvatar} className="sr-only" />
            </label>
            <label className="field-label mt-3 mb-1">Ou utiliser une URL d’image</label>
            <input className="field" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        <button type="submit" disabled={savingProfile} className="btn-primary self-start disabled:opacity-50">
          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
        </button>
      </form>

      {/* Espace prestataire */}
      {user?.role === 'provider' && (
        <div className="card gap-3 mb-5">
          <h2 className="font-extrabold text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Mon activité de prestataire
          </h2>
          <p className="text-muted text-sm">
            {provider?.business_name ? `Activité : ${provider.business_name}. ` : ''}
            Configurez vos services, vos tarifs et vos zones d’intervention depuis votre espace.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard" className="btn-navy">Gérer mon activité</Link>
            <Link href="/kyc" className="btn-outline">Vérification d’identité (KYC)</Link>
          </div>
        </div>
      )}

      {user?.role !== 'provider' && (
        <div className="card gap-3 mb-5">
          <h2 className="font-extrabold text-lg">Vérification d’identité (KYC)</h2>
          <p className="text-muted text-sm">
            Renforcez la confiance en vérifiant votre identité. Recommandé pour les prestataires.
          </p>
          <Link href="/kyc" className="btn-outline self-start">Gérer ma vérification</Link>
        </div>
      )}

      {/* Vérification du compte */}
      <div className="card gap-4 mb-5">
        <h2 className="font-extrabold text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          Vérification du compte
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted" /> {user?.email}
            </p>
            <p className="text-xs text-muted">
              {user?.email_verified ? 'Adresse email vérifiée' : 'Adresse email non vérifiée'}
            </p>
          </div>
          {user?.email_verified ? (
            <span className="badge-green">Vérifié</span>
          ) : (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={sendingVerification}
              className="btn-outline disabled:opacity-50"
            >
              {sendingVerification ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Renvoyer l’email'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted" /> {user?.phone}
            </p>
            <p className="text-xs text-muted">
              {user?.phone_verified ? 'Numéro de téléphone vérifié' : 'Numéro de téléphone non vérifié'}
            </p>
          </div>
          {user?.phone_verified ? (
            <span className="badge-green">Vérifié</span>
          ) : (
            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={sendingOtp}
              className="btn-outline disabled:opacity-50"
            >
              {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer un code'}
            </button>
          )}
        </div>

        {otpSent && !user?.phone_verified && (
          <form onSubmit={handleVerifyOtp} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <div className="flex-1 min-w-[160px]">
              <label className="field-label mb-1">Code reçu par SMS</label>
              <input
                className="field"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            <button type="submit" disabled={verifyingOtp} className="btn-navy disabled:opacity-50">
              {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider'}
            </button>
          </form>
        )}
      </div>

      {/* Sécurité */}
      <form onSubmit={handleChangePassword} className="card gap-4">
        <h2 className="font-extrabold text-lg flex items-center gap-2">
          <Lock className="w-5 h-5 text-accent" />
          Mot de passe
        </h2>

        <div>
          <label className="field-label mb-1">Mot de passe actuel *</label>
          <input type="password" className="field" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label mb-1">Nouveau mot de passe *</label>
            <input type="password" className="field" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="field-label mb-1">Confirmer *</label>
            <input type="password" className="field" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>

        <button type="submit" disabled={savingPassword} className="btn-navy self-start disabled:opacity-50">
          {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  );
}