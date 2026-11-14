'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { categoryIcon, type Category } from '../lib/categoryIcons';

const STEPS = [
  { title: 'Décrivez votre besoin', desc: 'Service, détail et position.' },
  { title: 'Comparez les profils', desc: 'Vérification, avis, disponibilité.' },
  { title: 'Suivez et évaluez', desc: 'Statut de la demande, avis après intervention.' },
];

export default function HomePage() {
  const router = useRouter();
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchApi('/services/categories')
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]));

    const params = new URLSearchParams(window.location.search);
    if (params.has('service')) setService(params.get('service') || '');
    if (params.has('location')) setLocation(params.get('location') || '');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (service.trim()) params.set('q', service.trim());
    if (location.trim()) params.set('district', location.trim());
    router.push(`/providers?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-[1120px] mx-auto px-6">
          <h1 className="m-0 text-[44px] leading-[1.1] font-extrabold max-w-[760px]">
            Tous vos services en Côte d’Ivoire. Trouvez, demandez, faites confiance.
          </h1>
          <p className="max-w-[640px] text-lg mt-4 mb-7 text-[#E2E8F0]">
            Dépannage auto, plomberie, électricité, ménage, jardinage et plus : comparez des
            professionnels de proximité, demandez une intervention et suivez-la au même endroit.
          </p>

          <form
            onSubmit={handleSearch}
            className="bg-white text-navy rounded-card p-5 flex gap-3 flex-wrap items-end"
          >
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="font-bold text-sm">Quel service ?</label>
              <input
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="Ex. : plomberie, batterie, ménage"
                className="field"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="font-bold text-sm">Où ?</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Quartier ou ma position"
                className="field"
              />
            </div>
            <button type="submit" className="btn-primary min-w-[160px]">
              <Search className="w-4 h-4 mr-2" />
              Rechercher
            </button>
          </form>

          <p className="mt-4 text-[#E2E8F0]">
            Besoin immédiat ?{' '}
            <Link href="/assistance" className="text-white font-extrabold underline">
              Lancer une demande maintenant
            </Link>
          </p>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-14">
        <div className="max-w-[1120px] mx-auto px-6">
          <h2 className="section-title mb-1">Nos services</h2>
          <p className="text-muted text-sm mb-5">
            Choisissez une catégorie pour trouver les professionnels disponibles près de vous.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => {
              const Icon = categoryIcon(c.icon_name);
              return (
                <Link
                  key={c.id}
                  href={`/providers?q=${encodeURIComponent(c.name)}`}
                  className="card flex gap-3.5 items-start hover:border-accent border border-transparent transition"
                >
                  <span className="w-11 h-11 rounded-card bg-accent-light text-accent-dark flex items-center justify-center flex-none">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span>
                    <span className="font-extrabold text-lg block">{c.name}</span>
                    <span className="text-muted text-sm block mt-0.5">{c.description}</span>
                  </span>
                </Link>
              );
            })}
            {categories.length === 0 && (
              <div className="card text-muted text-sm">Chargement des services…</div>
            )}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="py-8">
        <div className="max-w-[1120px] mx-auto px-6">
          <h2 className="section-title mb-5">Comment ça marche</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="card flex flex-col gap-3">
                <div className="text-[28px] font-extrabold text-accent">{i + 1}</div>
                <div className="font-extrabold text-lg">{step.title}</div>
                <div className="text-muted text-sm">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Confiance */}
      <section className="py-8">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="card">
            <h2 className="section-title mb-1">La confiance, étape par étape</h2>
            <p className="text-muted text-sm mb-5">
              Chaque prestataire a un niveau de vérification affiché clairement. Un badge n’est pas
              une garantie absolue : vous pouvez toujours signaler un problème.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <b>Vérification progressive</b>
                <div className="text-muted text-sm mt-1">Identité, activité, visite terrain.</div>
              </div>
              <div>
                <b>Avis après intervention</b>
                <div className="text-muted text-sm mt-1">Notes et commentaires des clients.</div>
              </div>
              <div>
                <b>Réclamation simple</b>
                <div className="text-muted text-sm mt-1">Un canal pour signaler et suivre un litige.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA prestataires */}
      <section className="py-8 pb-14">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="bg-accent text-white rounded-card p-8 flex gap-4 justify-between items-center flex-wrap">
            <div>
              <h2 className="text-[26px] font-extrabold m-0">Vous proposez un service ?</h2>
              <p className="mt-1.5">Artisan, dépanneur, garage, maison… gagnez en visibilité auprès de nouveaux clients.</p>
            </div>
            <Link href="/register?role=provider" className="btn bg-white text-accent hover:bg-white/90">
              Rejoindre ASSISTCI
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}