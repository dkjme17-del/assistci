'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Star,
  ShieldCheck,
  MapPin,
  Phone,
  CheckCircle,
  Filter,
  Loader2,
  Car,
} from 'lucide-react';
import { fetchApi } from '../../lib/api';

const ABIDJAN_COMMUNES = [
  'Toutes les communes',
  'Cocody',
  'Yopougon',
  'Marcory',
  'Plateau',
  'Koumassi',
  'Treichville',
  'Port-Bouët',
  'Adjamé',
  'Abobo',
  'Bingerville',
];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('Toutes les communes');
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  useEffect(() => {
    const loadProviders = async () => {
      setLoading(true);
      try {
        let endpoint = '/services/providers';
        const params = new URLSearchParams();
        if (selectedDistrict !== 'Toutes les communes') {
          params.append('district', selectedDistrict);
        }
        if (emergencyOnly) {
          params.append('emergency_only', 'true');
        }
        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }

        const data = await fetchApi(endpoint);
        setProviders(data);
      } catch (err) {
        console.error('Erreur chargement prestataires:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [selectedDistrict, emergencyOnly]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Prestataires & Dépanneurs à Abidjan
        </h1>
        <p className="text-slate-600 mt-1">
          Découvrez nos professionnels de l'automobile vérifiés et géolocalisés.
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-orange-600" />
          <span>Filtrer par :</span>
        </div>

        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {ABIDJAN_COMMUNES.map((com) => (
            <option key={com} value={com}>{com}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={emergencyOnly}
            onChange={(e) => setEmergencyOnly(e.target.checked)}
            className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
          />
          <span className="font-medium">Disponible pour urgence immédiate (24/7)</span>
        </label>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Recherche des dépanneurs dans votre zone...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">Aucun prestataire trouvé pour ces critères</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Essayez de réinitialiser le filtre de commune ou lancez directement une demande d'assistance automatique.
          </p>
          <Link
            href="/assistance"
            className="inline-flex items-center gap-2 bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
          >
            Lancer un appel d'urgence
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => (
            <div
              key={p.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-900">
                    {p.business_name || `${p.first_name} ${p.last_name}`}
                  </h3>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{parseFloat(p.rating || 0).toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  <span>{p.district ? `${p.district}, Abidjan` : 'Grand Abidjan'}</span>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2">
                  {p.bio || 'Professionnel de l’assistance mécanique et du dépannage automobile d’urgence.'}
                </p>

                <div className="flex items-center gap-2 mt-4 text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Profil Vérifié
                  </span>
                  {p.emergency_ready && (
                    <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md font-semibold">
                      SOS 24/7
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tarif indicatif</span>
                  <span className="text-sm font-bold text-slate-800">
                    {p.hourly_rate ? `${p.hourly_rate} FCFA` : 'Sur devis'}
                  </span>
                </div>

                <Link
                  href={`/assistance?provider_id=${p.id}`}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition"
                >
                  Solliciter
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

