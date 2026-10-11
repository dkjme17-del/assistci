import React from 'react';
import Link from 'next/link';
import { Car, MapPin, Phone, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 mt-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-orange-600 text-white p-1.5 rounded-lg flex items-center font-bold">
                <Car className="w-4 h-4 mr-1" />
                <span>ASSIST</span><span className="text-orange-200">CI</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              La plateforme ivoirienne de mise en relation d'urgence et de services de proximité. 
              Dépannage automobile rapide, sécurisé et géolocalisé à Abidjan.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/assistance" className="hover:text-white transition">Panne de batterie</Link></li>
              <li><Link href="/assistance" className="hover:text-white transition">Pneu crevé / Changement</Link></li>
              <li><Link href="/assistance" className="hover:text-white transition">Remorquage d urgence</Link></li>
              <li><Link href="/assistance" className="hover:text-white transition">Mécanique & Moteur</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Zones Couvertes</h4>
            <div className="flex flex-wrap gap-1.5 text-xs text-slate-400">
              <span className="bg-slate-800 px-2.5 py-1 rounded">Cocody</span>
              <span className="bg-slate-800 px-2.5 py-1 rounded">Yopougon</span>
              <span className="bg-slate-800 px-2.5 py-1 rounded">Marcory</span>
              <span className="bg-slate-800 px-2.5 py-1 rounded">Plateau</span>
              <span className="bg-slate-800 px-2.5 py-1 rounded">Treichville</span>
              <span className="bg-slate-800 px-2.5 py-1 rounded">Koumassi</span>
              <span className="bg-slate-800 px-2.5 py-1 rounded">Riviera</span>
              <span className="bg-slate-800 px-2.5 py-1 rounded">Bingerville</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Sécurité & Confiance</h4>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Prestataires vérifiés (KYC)</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span>Abidjan, Côte d Ivoire</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-400" />
                <span>Assistance client 24/7</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ASSISTCI. Tous droits réservés. Conçu pour Abidjan et la Côte d'Ivoire.</p>
        </div>
      </div>
    </footer>
  );
}

