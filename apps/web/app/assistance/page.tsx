'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
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
  ImagePlus,
  X,
} from 'lucide-react';
import { fetchApi, getCurrentUser } from '../../lib/api';
import { fileUrl, uploadImage } from '../../lib/media';

const BREAKDOWN_TYPES = [
  { id: 'battery', name: 'Batterie à plat', icon: BatteryCharging, desc: 'Besoin d’un booster ou remplacement' },
  { id: 'flat_tire', name: 'Pneu crevé', icon: Disc, desc: 'Changement de roue ou réparation sur place' },
  { id: 'towing', name: 'Remorquage', icon: Truck, desc: 'Transport du véhicule vers un garage' },
  { id: 'engine_failure', name: 'Panne Moteur', icon: Wrench, desc: 'Moteur calé, bruit anormal, surchauffe' },
  { id: 'fuel', name: 'Panne de carburant', icon: Fuel, desc: 'Livraison de carburant d’urgence' },
  { id: 'lockout', name: 'Clés oubliées / Bloquées', icon: Key, desc: 'Ouverture de portière sécurisée' },
];

const IVORIAN_CITIES = [
  'Abidjan',
  'Yamoussoukro',
  'Bouaké',
  'San-Pédro',
  'Korhogo',
  'Daloa',
  'Man',
  'Gagnoa',
  'Abengourou',
  'Grand-Bassam',
  'Dabou',
  'Soubré',
  'Divo',
  'Agboville',
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

const HIGHWAY_AXES = [
  'Autoroute du Nord (A3 : Abidjan - Singrobo - Yamoussoukro - Bouaké)',
  'La Côtière (A10 : Abidjan - Dabou - Grand-Lahou - San-Pédro)',
  'Route de l’Est (A1 : Abidjan - Adzopé - Abengourou)',
  'Axe Ouest (A6 : Yamoussoukro - Daloa - Man)',
  'Axe Sud-Est (Abidjan - Grand-Bassam - Bonoua - Noé)',
];

function AssistanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [breakdownType, setBreakdownType] = useState('battery');
  const [vehicleType, setVehicleType] = useState('Berline');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [locationType, setLocationType] = useState<'city' | 'highway'>('city');
  const [city, setCity] = useState('Abidjan');
  const [district, setDistrict] = useState('Cocody');
  const [highwayAxis, setHighwayAxis] = useState(HIGHWAY_AXES[0]);
  const [highwayMilestone, setHighwayMilestone] = useState('');
  const [addressText, setAddressText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('high');
  const [requestImages, setRequestImages] = useState<{ id: string; file: File; preview: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (requestImages.length + files.length > 8) {
      setError('Vous pouvez joindre jusqu’à 8 photos.');
      return;
    }
    const additions = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setRequestImages((current) => [...current, ...additions]);
    setError(null);
  };

  const removeRequestImage = (id: string) => {
    setRequestImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.preview);
      return current.filter((item) => item.id !== id);
    });
  };

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && BREAKDOWN_TYPES.some((b) => b.id === typeParam)) {
      setBreakdownType(typeParam);
    }

    const promptParam = searchParams.get('prompt');
    if (promptParam) {
      setDescription(promptParam);
      const lower = promptParam.toLowerCase();
      if (lower.includes('batterie')) setBreakdownType('battery');
      else if (lower.includes('pneu') || lower.includes('roue')) setBreakdownType('flat_tire');
      else if (lower.includes('remorquage') || lower.includes('remorque')) setBreakdownType('towing');
      else if (lower.includes('moteur')) setBreakdownType('engine_failure');

      // Détection autoroute vs ville
      if (lower.includes('autoroute') || lower.includes('singrobo') || lower.includes('cotiere') || lower.includes('côtière') || lower.includes('péage') || lower.includes('pk ')) {
        setLocationType('highway');
        setUrgency('critical');
      }

      // Détection villes de province
      for (const c of IVORIAN_CITIES) {
        if (lower.includes(c.toLowerCase())) {
          setCity(c);
          setDistrict(c);
          break;
        }
      }

      // Détection commune Abidjan si pertinent
      for (const com of ABIDJAN_COMMUNES) {
        if (lower.includes(com.toLowerCase())) {
          setCity('Abidjan');
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
        alert('Impossible de récupérer la position GPS. Vous pouvez préciser votre position manuellement.');
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = getCurrentUser();
    if (!user) {
      router.push('/login?redirect=/assistance');
      return;
    }

    setLoading(true);

    try {
      const selectedTypeObj = BREAKDOWN_TYPES.find((b) => b.id === breakdownType);
      const title = locationType === 'highway'
        ? `SOS ${selectedTypeObj?.name || 'Panne'} sur ${highwayAxis.split('(')[0].trim()}`
        : `Assistance ${selectedTypeObj?.name || 'Panne'} à ${city === 'Abidjan' ? district : city}`;

      const media = await Promise.all(
        requestImages.map(async ({ file }) => ({ url: await uploadImage(file, 'request'), type: 'image' }))
      );

      const res = await fetchApi('/requests', {
        method: 'POST',
        body: JSON.stringify({
          category_id: 1, // Assistance Auto
          title,
          description: description || `Besoin d'assistance pour véhicule ${vehicleBrand || vehicleType} en panne.`,
          breakdown_type: breakdownType,
          vehicle_type: vehicleType,
          vehicle_brand: vehicleBrand,
          location_type: locationType,
          highway_axis: locationType === 'highway' ? highwayAxis : null,
          highway_milestone: locationType === 'highway' ? (highwayMilestone || addressText) : null,
          city,
          district: locationType === 'city' ? district : highwayAxis.split('(')[0].trim(),
          address_text: addressText || highwayMilestone,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          urgency: locationType === 'highway' && urgency === 'normal' ? 'high' : urgency,
          media,
        }),
      });

      requestImages.forEach((image) => URL.revokeObjectURL(image.preview));
      setRequestImages([]);
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
        <h2 className="text-3xl font-extrabold text-navy">Demande d'intervention transmise !</h2>
        <p className="text-muted">
          Votre demande #{success.id} ({success.title}) a bien été enregistrée à <strong>{success.district}</strong>.
          Les dépanneurs disponibles dans votre secteur reçoivent votre alerte.
        </p>

        <div className="bg-white p-6 rounded-2xl border border-line text-left space-y-3 shadow-sm">
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="text-muted">Statut :</span>
            <span className="font-semibold text-accent uppercase tracking-wide">{success.status}</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="text-muted">Urgence :</span>
            <span className="font-semibold text-navy">{success.urgency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Véhicule :</span>
            <span className="font-semibold text-navy">{success.vehicle_brand || success.vehicle_type}</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            Suivre mon intervention
          </button>
          <button
            onClick={() => {
              setSuccess(null);
              setDescription('');
            }}
            className="bg-line hover:bg-line text-navy font-semibold px-6 py-3 rounded-xl transition"
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
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-wider bg-orange-100/70 px-3 py-1 rounded-full mb-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Urgence Dépannage Automobile
        </div>
        <h1 className="text-3xl font-extrabold text-navy">
          Déclencher une demande d'assistance
        </h1>
        <p className="text-muted mt-1">
          Renseignez le problème de votre véhicule pour être mis en relation avec les dépanneurs les plus proches à Abidjan.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-line shadow-sm">
        {/* 1. Type de panne */}
        <div>
          <label className="block text-sm font-bold text-navy mb-3">
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
                      ? 'border-orange-600 bg-accent-light/50 text-navy ring-2 ring-accent/30'
                      : 'border-line hover:border-input text-navy'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-accent' : 'text-muted'}`} />
                  <div>
                    <div className="font-bold text-sm">{b.name}</div>
                    <div className="text-xs text-muted mt-0.5 line-clamp-1">{b.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Véhicule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-navy mb-1.5">
              2. Type de véhicule
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="Berline">Berline / Citadine</option>
              <option value="SUV / 4x4">SUV / 4x4</option>
              <option value="Moto">Deux roues / Moto</option>
              <option value="Camion / Utilitaire">Camion / Utilitaire</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-navy mb-1.5">
              Marque et Modèle
            </label>
            <input
              type="text"
              value={vehicleBrand}
              onChange={(e) => setVehicleBrand(e.target.value)}
              placeholder="Ex: Toyota RAV4, Hyundai Tucson..."
              className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* 3. Localisation Nationale & Autoroutes */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-bold text-navy">
              3. Où se trouve le véhicule ? *
            </label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent-light hover:bg-orange-100 px-3 py-1.5 rounded-lg transition"
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              <span>{coords ? 'Position GPS enregistrée ✓' : 'Détecter ma position GPS'}</span>
            </button>
          </div>

          {/* Toggle Type d'environnement */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-line rounded-2xl">
            <button
              type="button"
              onClick={() => setLocationType('city')}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                locationType === 'city'
                  ? 'bg-white text-accent shadow-sm'
                  : 'text-muted hover:text-navy'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>En Ville / Commune</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLocationType('highway');
                setUrgency('critical');
              }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                locationType === 'highway'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-muted hover:text-navy'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Sur Autoroute / Axe Routier</span>
            </button>
          </div>

          {/* Alerte Sécurité spécifique Autoroute */}
          {locationType === 'highway' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Consignes de sécurité d'urgence sur autoroute :</span>
              </div>
              <p>
                Allumez immédiatement vos feux de détresse, placez le triangle à 100m en amont et <strong>abritez-vous impérativement derrière la glissière de sécurité</strong> avec vos passagers.
              </p>
            </div>
          )}

          {locationType === 'highway' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs text-muted mb-1 font-medium">Axe autoroutier ou national</span>
                <select
                  value={highwayAxis}
                  onChange={(e) => setHighwayAxis(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                >
                  {HIGHWAY_AXES.map((axis) => (
                    <option key={axis} value={axis}>{axis}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-xs text-muted mb-1 font-medium">Point kilométrique (PK) ou repère péage</span>
                <input
                  type="text"
                  required={locationType === 'highway'}
                  value={highwayMilestone}
                  onChange={(e) => setHighwayMilestone(e.target.value)}
                  placeholder="Ex: PK 145 vers Toumodi, 5km après péage Singrobo"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="block text-xs text-muted mb-1 font-medium">Ville de Côte d'Ivoire</span>
                <select
                  value={city}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCity(c);
                    if (c !== 'Abidjan') setDistrict(c);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                >
                  {IVORIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {city === 'Abidjan' ? (
                <div>
                  <span className="block text-xs text-muted mb-1 font-medium">Commune d'Abidjan</span>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  >
                    {ABIDJAN_COMMUNES.map((com) => (
                      <option key={com} value={com}>{com}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <span className="block text-xs text-muted mb-1 font-medium">Quartier ou Secteur</span>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Ex: Dioulakro, Koko, Séwéké..."
                    className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  />
                </div>
              )}

              <div>
                <span className="block text-xs text-muted mb-1 font-medium">Repère précis ou rue</span>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="Ex: Face station Total, carrefour..."
                  className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Description détaillée & Urgence */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-navy mb-1.5">
              4. Détails du problème (optionnel)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les symptômes : fumée blanche, voyant allumé, bruit suspect..."
              className="w-full px-4 py-3 rounded-xl border border-input bg-white text-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy mb-2">Photos du problème ({requestImages.length}/8)</label>
            <label className="btn-outline inline-flex cursor-pointer">
              <ImagePlus className="w-4 h-4 mr-2" />
              Ajouter des photos
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleImagesSelected} className="sr-only" />
            </label>
            {requestImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {requestImages.map((image) => (
                  <div key={image.id} className="relative overflow-hidden rounded-xl border border-line">
                    <Image src={image.preview} alt={image.file.name} width={640} height={640} unoptimized className="w-full aspect-square object-cover" />
                    <button type="button" onClick={() => removeRequestImage(image.id)} className="absolute top-2 right-2 bg-white p-2 rounded-full shadow" title="Retirer la photo" aria-label="Retirer la photo">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-navy mb-2">
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
                      ? 'border-orange-600 bg-accent text-white'
                      : 'border-line text-navy hover:border-input'
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
        <div className="pt-4 border-t border-line">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 text-base"
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
          <p className="text-center text-xs text-muted mt-3">
            Vous pourrez consulter les propositions de devis et contacter directement les prestataires.
          </p>
        </div>
      </form>
    </div>
  );
}

export default function AssistancePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Chargement du formulaire d'assistance...</div>}>
      <AssistanceContent />
    </Suspense>
  );
}

