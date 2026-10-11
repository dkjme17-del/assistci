'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Car,
  BatteryCharging,
  Disc,
  Truck,
  Wrench,
  ShieldCheck,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState('');

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    router.push(`/assistance?prompt=${encodeURIComponent(aiPrompt)}`);
  };

  const quickBreakdowns = [
    {
      id: 'battery',
      title: 'Batterie à plat',
      desc: 'Booster ou changement de batterie',
      icon: BatteryCharging,
      color: 'bg-amber-100 text-amber-700 hover:border-amber-400',
    },
    {
      id: 'flat_tire',
      title: 'Crevaison',
      desc: 'Remplacement de roue ou gonflage',
      icon: Disc,
      color: 'bg-blue-100 text-blue-700 hover:border-blue-400',
    },
    {
      id: 'towing',
      title: 'Remorquage Express',
      desc: 'Treuil et transport vers un garage',
      icon: Truck,
      color: 'bg-red-100 text-red-700 hover:border-red-400',
    },
    {
      id: 'engine_failure',
      title: 'Panne Moteur',
      desc: 'Diagnostic mécanique et réparation',
      icon: Wrench,
      color: 'bg-emerald-100 text-emerald-700 hover:border-emerald-400',
    },
  ];

  const popularDistricts = [
    'Cocody (Angré, Riviera)',
    'Yopougon',
    'Marcory (Zone 4)',
    'Plateau',
    'Koumassi',
    'Treichville',
    'Adjamé',
    'Bingerville',
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 via-white to-slate-50 pt-12 pb-20 border-b border-orange-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold tracking-wide uppercase">
              <span className="flex h-2 w-2 rounded-full bg-orange-600 animate-pulse" />
              Assistance Automobile 24/7 à Abidjan
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              En panne à Abidjan ? <br />
              <span className="text-orange-600">Un dépanneur qualifié</span> en quelques minutes.
            </h1>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Mise en relation instantanée avec des mécaniciens, dépanneurs et remorqueurs vérifiés 
              à proximité de votre position. Simple, rapide et transparent.
            </p>

            {/* Barre d'assistance IA */}
            <form onSubmit={handleAiSearch} className="pt-4 max-w-2xl mx-auto">
              <div className="relative flex items-center shadow-lg rounded-2xl bg-white border-2 border-orange-200 focus-within:border-orange-500 transition overflow-hidden p-1.5">
                <div className="pl-3 text-orange-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex : « Ma Toyota ne démarre plus devant le centre commercial à Cocody... »"
                  className="w-full px-3 py-3 text-sm sm:text-base outline-none text-slate-800 placeholder-slate-400"
                />
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-3 rounded-xl text-sm flex items-center gap-1.5 transition flex-shrink-0"
                >
                  <span>Trouver</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-left sm:text-center">
                💡 Notre IA analyse votre problème, localise le quartier et alerte les bons intervenants.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Accès rapide aux types de pannes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Quel est votre problème ?
          </h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Sélectionnez votre type d'urgence pour une prise en charge prioritaire
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickBreakdowns.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={`/assistance?type=${item.id}`}
                className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-500 transition flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-orange-600 transition">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-orange-600">
                  <span>Demander</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pourquoi choisir ASSISTCI */}
      <section className="bg-white py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Prestataires Vérifiés (KYC)</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Chaque artisan dépanneur fournit sa pièce d'identité et ses qualifications avant validation.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Proximité Géolocalisée</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Identification des professionnels les plus proches de vous pour minimiser le temps d'attente à Abidjan.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Tarifs Transparents</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Devis clair avant intervention. Possibilité de paiement sécurisé via Mobile Money (Wave, Orange, MTN).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quartiers couverts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-orange-400">
              Couverture Grand Abidjan
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Une assistance disponible dans toutes les communes
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Que vous soyez bloqué sur le pont Henri Konan Bédié, sur la voie express de Yopougon, 
              ou au cœur du Plateau, nos dépanneurs partenaires interviennent rapidement.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {popularDistricts.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700"
                >
                  <MapPin className="w-3 h-3 text-orange-400" />
                  {d}
                </span>
              ))}
            </div>

            <div className="pt-6">
              <Link
                href="/assistance"
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition"
              >
                <span>Déclencher une assistance maintenant</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
