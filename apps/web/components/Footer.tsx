import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy text-white/70 pt-12 pb-8 mt-16 border-t border-navy/40">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 font-extrabold text-xl text-white mb-4">
              <Image src="/icon.svg" alt="" width={28} height={28} />
              <span>ASSIST<span className="text-accent">CI</span></span>
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              La plateforme ivoirienne de mise en relation d'urgence et de services de proximité.
              Dépannage automobile rapide et géolocalisé à Abidjan.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/assistance" className="hover:text-white transition">Panne de batterie</Link></li>
              <li><Link href="/assistance" className="hover:text-white transition">Pneu crevé / Changement</Link></li>
              <li><Link href="/assistance" className="hover:text-white transition">Remorquage d'urgence</Link></li>
              <li><Link href="/assistance" className="hover:text-white transition">Mécanique & Moteur</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Zones couvertes</h4>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['Cocody', 'Yopougon', 'Marcory', 'Plateau', 'Treichville', 'Koumassi', 'Riviera', 'Bingerville'].map((z) => (
                <span key={z} className="bg-white/10 px-2.5 py-1 rounded">{z}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Sécurité & confiance</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Prestataires vérifiés (KYC)</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span>Abidjan, Côte d'Ivoire</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-400" />
                <span>Assistance client 24/7</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-white/40">
          <p>© {new Date().getFullYear()} ASSISTCI. Tous droits réservés. Conçu pour Abidjan et la Côte d'Ivoire.</p>
        </div>
      </div>
    </footer>
  );
}