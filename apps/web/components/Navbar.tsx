'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wrench, Car, User, LogOut, ShieldAlert, Menu, X } from 'lucide-react';
import { getCurrentUser, removeAuthToken } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Marque */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-orange-600 text-white p-2 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                <Car className="w-5 h-5 mr-1" />
                <span>ASSIST</span><span className="text-orange-200">CI</span>
              </div>
            </Link>
          </div>

          {/* Navigation Desktop */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/assistance"
              className="flex items-center gap-1.5 text-orange-600 font-semibold px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition"
            >
              <ShieldAlert className="w-4 h-4 text-orange-600" />
              SOS Assistance Auto
            </Link>
            <Link
              href="/providers"
              className="text-slate-600 hover:text-slate-900 font-medium transition"
            >
              Prestataires
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/kyc"
                  className="text-slate-600 hover:text-slate-900 font-medium text-sm transition"
                >
                  KYC
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-red-600 hover:text-red-700 font-bold text-sm transition"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium text-sm transition"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{user.first_name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-slate-700 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg transition"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-sm transition"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Bouton Hamburger Mobile */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          <Link
            href="/assistance"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-orange-600 font-bold p-2 rounded-lg bg-orange-50"
          >
            <ShieldAlert className="w-5 h-5 text-orange-600" />
            SOS Assistance Auto
          </Link>
          <Link
            href="/providers"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-700 font-medium p-2 hover:bg-slate-50 rounded-lg"
          >
            Trouver un dépanneur
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-700 font-medium p-2 hover:bg-slate-50 rounded-lg"
              >
                Mon Tableau de Bord ({user.first_name})
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 text-red-600 font-medium p-2 w-full text-left hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-slate-700 border border-slate-300 py-2 rounded-lg font-medium"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center bg-orange-600 text-white py-2 rounded-lg font-medium"
              >
                Créer un compte
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

