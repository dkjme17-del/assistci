'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Car,
  BatteryCharging,
  Disc,
  Truck,
  Wrench,
  Fuel,
  Key,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Loader2,
} from 'lucide-react';
import { fetchApi, getCurrentUser } from '../../lib/api';

const BREAKDOWN_TYPES = [
  { id: 'battery', name: 'Batterie à plat', icon: BatteryCharging, desc: 'Besoin d’un booster ou remplacement' },
  { id: 'flat_tire', name: 'Pneu crevé', icon: Disc, desc: 'Changement de roue ou réparation sur place' },
  { id: 'towing', name: 'Remorquage', icon: Truck, desc: 'Transport du véhicule vers un garage' },
  { id: 'engine_failure', name: 'Panne Moteur', icon: Wrench, desc: 'Moteur calé, bruit anormal, surchauffe' },
  { id: 'fuel', name: 'Panne de carburant', icon: Fuel, desc: 'Livraison de carburant d’urgence' },
  { id: 'lockout', name: 'Clés oubliées / Bloquées', icon: Key, desc: 'Ouverture de portière sécurisée' },
];

const ABIDJAN_COMMUNES = [
  'Cocody',
  'Yopougon',
  'Marcory',
  'Plateau',
  'Koumassi',
  'Treichville',
  'Port-Bouët',
  'Attécoubé',
  'Adjamé',
  'Abobo',
  'Bingerville',
  'Songon',
  'Anyama',
];

function AssistanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [breakdownType, setBreakdownType] = useState('battery');
  const [vehicleType, setVehicleType] = useState('Berline');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [district, setDistrict] = useState('Cocody');
  const [addressText, setAddressText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('high');

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && BREAKDOWN_TYPES.some((b) => b.id === typeParam)) {
      setBreakdownType(typeParam);
    }

    const promptParam = searchParams.get('prompt');
    if (promptParam) {
      setDescription(promptParam);
      // Détection rapide dans le prompt
      const lower = promptParam.toLowerCase();
      if (lower.includes('batterie')) setBreakdownType('battery');
      else if (lower.includes('pneu') || lower.includes('roue')) setBreakdownType('flat_tire');
      else if (lower.includes('remorquage') || lower.includes('remorque')) setBreakdownType('towing');
      else if (lower.includes('moteur')) setBreakdownType('engine_failure');

      // Détection commune
      for (const com of ABIDJAN_COMMUNES) {
        if (lower.includes(com.toLowerCase())) {
          setDistrict(com);
          break;
        }
      }
    }
  }, [searchParams]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n’est pas supportée par votre navigateur');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        console.error('Erreur géolocalisation:', err);
        setLocating(false);
        alert('Impossible de récupérer la position GPS. Vous pouvez préciser votre commune manuellement.');
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = getCurrentUser();
    if (!user) {
      // Rediriger vers login avec rappel
      router.push('/login?redirect=/assistance');
      return;
    }

    setLoading(true);

    try {
      const selectedTypeObj = BREAKDOWN_TYPES.find((b) => b.id === breakdownType);
      const title = `Assistance ${selectedTypeObj?.name || 'Panne'} à ${district}`;

      const res = await fetchApi('/requests', {
        method: 'POST',
        body: JSON.stringify({
          category_id: 1, // Assistance Auto
          title,
          description: description || `Besoin d'assistance pour véhicule ${vehicleBrand || vehicleType} en panne.`,
          breakdown_type: breakdownType,
          vehicle_type: vehicleType,
          vehicle_brand: vehicleBrand,
          city: 'Abidjan',
          district,
          address_text: addressText,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          urgency,
        }),
      });

      setSuccess(res.request);
    } catch (err: any) {
      setError(err.message || 'Impossible d’envoyer la demande');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900">Demande d'intervention transmise !</h2>
        <p className="text-slate-600">
          Votre demande #{success.id} ({success.title}) a bien été enregistrée à <strong>{success.district}</strong>.
          Les dépanneurs disponibles dans votre secteur reçoivent votre alerte.
        </p>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-3 shadow-sm">
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="text-slate-500">Statut :</span>
            <span className="font-semibold text-orange-600 uppercase tracking-wide">{success.status}</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="text-slate-500">Urgence :</span>
            <span className="font-semibold text-slate-800">{success.urgency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Véhicule :</span>
            <span className="font-semibold text-slate-800">{success.vehicle_brand || success.vehicle_type}</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            Suivre mon intervention
          </button>
          <button
            onClick={() => {
              setSuccess(null);
              setDescription('');
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl transition"
          >
            Nouvelle demande
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-100/70 px-3 py-1 rounded-full mb-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Urgence Dépannage Automobile
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Déclencher une demande d'assistance
        </h1>
        <p className="text-slate-600 mt-1">
          Renseignez le problème de votre véhicule pour être mis en relation avec les dépanneurs les plus proches à Abidjan.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        {/* 1. Type de panne */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-3">
            1. Quel est le problème constaté ? *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BREAKDOWN_TYPES.map((b) => {
              const Icon = b.icon;
              const isSelected = breakdownType === b.id;
              return (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => setBreakdownType(b.id)}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-orange-600 bg-orange-50/50 text-orange-950 ring-2 ring-orange-500/30'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-orange-600' : 'text-slate-500'}`} />
                  <div>
                    <div className="font-bold text-sm">{b.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{b.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Véhicule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              2. Type de véhicule
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="Berline">Berline / Citadine</option>
              <option value="SUV / 4x4">SUV / 4x4</option>
              <option value="Moto">Deux roues / Moto</option>
              <option value="Camion / Utilitaire">Camion / Utilitaire</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              Marque et Modèle
            </label>
            <input
              type="text"
              value={vehicleBrand}
              onChange={(e) => setVehicleBrand(e.target.value)}
              placeholder="Ex: Toyota RAV4, Hyundai Tucson..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* 3. Localisation */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-bold text-slate-900">
              3. Où se trouve le véhicule ? *
            </label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition"
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              <span>{coords ? 'Position GPS enregistrée ✓' : 'Détecter ma position GPS'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs text-slate-500 mb-1 font-medium">Commune d'Abidjan</span>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {ABIDJAN_COMMUNES.map((com) => (
                  <option key={com} value={com}>{com}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs text-slate-500 mb-1 font-medium">Repère ou rue précise</span>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="Ex: Carrefour la Vie, face station Total"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Description détaillée & Urgence */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-1.5">
              4. Détails du problème (optionnel)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les symptômes : fumée blanche, voyant allumé, bruit suspect..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Niveau d'urgence
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'normal', label: 'Normal', desc: 'Pas d’urgence vitale' },
                { id: 'high', label: 'Urgent', desc: 'Véhicule immobilisé' },
                { id: 'critical', label: 'Critique', desc: 'Gêne la circulation' },
              ].map((u) => (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => setUrgency(u.id)}
                  className={`p-3 rounded-xl border text-center text-xs font-semibold transition ${
                    urgency === u.id
                      ? 'border-orange-600 bg-orange-600 text-white'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div>{u.label}</div>
                  <div className={`text-[10px] mt-0.5 ${urgency === u.id ? 'text-orange-100' : 'text-slate-400'}`}>
                    {u.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Envoi de votre demande en cours...</span>
              </>
            ) : (
              <>
                <Car className="w-5 h-5" />
                <span>Confirmer et alerter les dépanneurs à proximité</span>
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-500 mt-3">
            Vous pourrez consulter les propositions de devis et contacter directement les prestataires.
          </p>
        </div>
      </form>
    </div>
  );
}

export default function AssistancePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Chargement du formulaire d'assistance...</div>}>
      <AssistanceContent />
    </Suspense>
  );
}

