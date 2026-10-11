'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Car,
  Clock,
  ShieldCheck,
  Plus,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Calendar,
  Loader2,
} from 'lucide-react';
import { fetchApi, getCurrentUser } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    const loadData = async () => {
      try {
        const data = await fetchApi('/requests');
        setRequests(data);
      } catch (err: any) {
        setError(err.message || 'Impossible de charger vos demandes');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            En attente de dépanneur
          </span>
        );
      case 'proposal_received':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
            Devis reçu
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
            Intervention en cours
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Terminée
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Chargement de votre espace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {/* Profil Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Bonjour, {user?.first_name} {user?.last_name}
            </h1>
            <span className="bg-orange-100 text-orange-800 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase">
              {user?.role === 'provider' ? 'Dépanneur' : 'Client'}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {user?.email} • {user?.phone}
          </p>
        </div>

        <Link
          href="/assistance"
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-3 rounded-2xl shadow-sm transition text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Assistance SOS</span>
        </Link>
      </div>

      {/* Liste des Demandes */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">
            {user?.role === 'provider' ? 'Missions et Alertes d intervention' : 'Historique de vos demandes'}
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {requests.length} demande(s) enregistrée(s)
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800">Aucune demande en cours</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Vous n'avez pas encore d'intervention active. Si votre véhicule est en panne, lancez une alerte en quelques clics.
            </p>
            <Link
              href="/assistance"
              className="inline-flex items-center gap-2 bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
            >
              Déclencher une assistance
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-lg">
                      #{req.id} - {req.title}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2">
                    {req.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      {req.district || 'Abidjan'} {req.address_text ? `(${req.address_text})` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-slate-400" />
                      {req.vehicle_brand || req.vehicle_type || 'Véhicule'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(req.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col justify-end sm:justify-center items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Urgence : <span className="text-slate-800">{req.urgency}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
