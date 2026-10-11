'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Car,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  User,
  Wrench,
  ShieldCheck,
  Loader2,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import { fetchApi, getCurrentUser } from '../../../lib/api';

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');

  // Formulaire de devis pour prestataire
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteEta, setQuoteEta] = useState('25');
  const [quoteMsg, setQuoteMsg] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [reqData, msgsData] = await Promise.all([
        fetchApi(`/requests/${requestId}`),
        fetchApi(`/requests/${requestId}/messages`).catch(() => []),
      ]);
      setData(reqData);
      setMessages(msgsData);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la demande');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push(`/login?redirect=/requests/${requestId}`);
      return;
    }
    setUser(currentUser);
    loadData();

    // Polling doux pour le chat
    const interval = setInterval(async () => {
      try {
        const msgs = await fetchApi(`/requests/${requestId}/messages`);
        setMessages(msgs);
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [requestId, router]);

  const handleSendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    setSendingMsg(true);
    try {
      const sent = await fetchApi(`/requests/${requestId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: newMsg.trim() }),
      });
      setMessages([...messages, sent]);
      setNewMsg('');
    } catch (err: any) {
      alert(`Erreur envoi: ${err.message}`);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAcceptProposal = async (proposalId: number) => {
    if (!confirm('Confirmez-vous l’acceptation de ce devis d’intervention ?')) return;

    try {
      await fetchApi(`/requests/proposals/${proposalId}/accept`, {
        method: 'POST',
      });
      alert('Devis accepté ! Le dépanneur est en route.');
      loadData();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotePrice) return;

    setSubmittingQuote(true);
    try {
      await fetchApi(`/requests/${requestId}/proposals`, {
        method: 'POST',
        body: JSON.stringify({
          proposed_price: parseFloat(quotePrice),
          estimated_arrival_minutes: parseInt(quoteEta, 10),
          message: quoteMsg,
        }),
      });
      alert('Votre proposition de devis a été transmise au client !');
      setQuotePrice('');
      setQuoteMsg('');
      loadData();
    } catch (err: any) {
      alert(`Erreur devis: ${err.message}`);
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await fetchApi(`/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Chargement de la mission...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Demande introuvable</h2>
        <p className="text-sm text-slate-500">{error || 'Cette intervention n’existe pas.'}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  const { request, proposals } = data;
  const isClient = user?.id === request.client_id;
  const isProvider = user?.role === 'provider';

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {/* En-tête de la demande */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900">
                Demande #{request.id} : {request.title}
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span>{request.district}, Abidjan {request.address_text ? `• ${request.address_text}` : ''}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
              Statut : {request.status}
            </span>
          </div>
        </div>

        {/* Détails du véhicule et description */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block font-semibold uppercase">Véhicule</span>
            <span className="font-bold text-slate-800">{request.vehicle_brand || request.vehicle_type || 'Non spécifié'}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block font-semibold uppercase">Type de panne</span>
            <span className="font-bold text-slate-800 uppercase">{request.breakdown_type}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 block font-semibold uppercase">Urgence</span>
            <span className="font-bold text-red-600 uppercase">{request.urgency}</span>
          </div>
        </div>

        <div className="bg-slate-50/70 p-4 rounded-2xl text-sm text-slate-700">
          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Description du problème</span>
          <p>{request.description}</p>
        </div>

        {/* Boutons d'action statut si prestataire assigné */}
        {isProvider && request.status === 'accepted' && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleUpdateStatus('in_progress')}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition"
            >
              Démarrer l'intervention (En cours)
            </button>
          </div>
        )}
        {isProvider && request.status === 'in_progress' && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleUpdateStatus('completed')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition"
            >
              Clôturer l'intervention (Terminée)
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1 : Devis et Propositions */}
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Propositions & Devis reçus ({proposals.length})</span>
            </h2>

            {proposals.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                Aucun devis soumis pour le moment. Les dépanneurs à proximité étudient votre demande.
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map((prop: any) => (
                  <div
                    key={prop.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      prop.status === 'accepted'
                        ? 'border-emerald-500 bg-emerald-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900">{prop.business_name || 'Dépanneur Partenaire'}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Arrivée estimée : ~{prop.estimated_arrival_minutes} min</span>
                          {prop.rating > 0 && <span>★ {parseFloat(prop.rating).toFixed(1)}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-extrabold text-slate-900">
                          {parseFloat(prop.proposed_price).toLocaleString('fr-FR')} FCFA
                        </div>
                        <span className="text-xs uppercase font-bold text-slate-500">{prop.status}</span>
                      </div>
                    </div>

                    {prop.message && (
                      <p className="text-xs text-slate-600 italic bg-white/70 p-2 rounded-lg border border-slate-100">
                        « {prop.message} »
                      </p>
                    )}

                    {isClient && prop.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptProposal(prop.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accepter ce devis</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire prestataire pour envoyer un devis */}
            {isProvider && request.status !== 'completed' && request.status !== 'cancelled' && (
              <form onSubmit={handleSendQuote} className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="font-bold text-sm text-slate-900">Proposer un devis d'intervention</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Montant (FCFA) *</label>
                    <input
                      type="number"
                      required
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      placeholder="Ex: 15000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Arrivée estimée (min)</label>
                    <input
                      type="number"
                      value={quoteEta}
                      onChange={(e) => setQuoteEta(e.target.value)}
                      placeholder="Ex: 20"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Message au client</label>
                  <input
                    type="text"
                    value={quoteMsg}
                    onChange={(e) => setQuoteMsg(e.target.value)}
                    placeholder="Ex: Je suis disponible avec un booster et câble à 15 min."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingQuote}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition"
                >
                  Envoyer ma proposition
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Section 2 : Messagerie Instantanée (Chat en direct) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[540px]">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              <span>Discussion en direct</span>
            </h2>
            <span className="text-xs text-slate-400">Canal sécurisé</span>
          </div>

          {/* Liste des messages */}
          <div className="flex-grow overflow-y-auto space-y-3 pr-2 mb-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs">
                Aucun message échangé pour le moment. Écrivez un message pour convenir des détails.
              </div>
            ) : (
              messages.map((m: any) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-slate-400 mb-0.5 px-1">
                      {isMe ? 'Vous' : m.sender_name} ({m.sender_role})
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMe
                          ? 'bg-orange-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                      {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Envoi de message */}
          <form onSubmit={handleSendMsg} className="flex gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-grow px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              disabled={sendingMsg}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

