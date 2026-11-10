'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, Menu, X, ChevronDown, LayoutGrid, IdCard, Moon, Sun } from 'lucide-react';
import { getCurrentUser, removeAuthToken, fetchApi } from '../lib/api';
import { categoryIcon, type Category } from '../lib/categoryIcons';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    setUser(getCurrentUser());
    setMobileOpen(false);
    setServicesOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    fetchApi('/services/categories')
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    try {
      localStorage.setItem('assistci_theme', nextTheme);
    } catch {}
    setTheme(nextTheme);
  };

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
      title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-canvas text-navy transition hover:bg-line"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );

  const linkState = (href: string) => pathname === href ? 'nav-link text-teal-800' : 'nav-link';

  return (
    <header className="bg-white border-b border-line sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 min-h-[72px]">
        <Link href="/" aria-label="ASSISTCI, accueil" className="flex items-center gap-2 font-extrabold text-[22px] tracking-wide">
          <Image src="/icon.svg" alt="" width={32} height={32} />
          <span>ASSIST<span className="text-accent">CI</span></span>
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden xl:flex gap-6 items-center">
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              className="flex items-center min-h-[44px] font-semibold gap-1"
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              onClick={() => setServicesOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setServicesOpen(false);
              }}
            >
              Services
              <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
            </button>
            {servicesOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[560px]">
                <div className="bg-white rounded-card shadow-card border border-line p-3 grid grid-cols-2 gap-0.5">
                  {categories.map((c) => {
                    const Icon = categoryIcon(c.icon_name);
                    return (
                      <Link
                        key={c.id}
                        href={`/providers?q=${encodeURIComponent(c.name)}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-btn hover:bg-canvas transition"
                      >
                        <span className="w-8 h-8 rounded-lg bg-accent-light text-accent-dark flex items-center justify-center flex-none">
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-semibold">{c.name}</span>
                      </Link>
                    );
                  })}
                  {categories.length === 0 && (
                    <span className="text-sm text-muted p-2">Chargement des services…</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <Link href="/#comment" className="nav-link flex items-center min-h-[44px] font-semibold">
            Comment ça marche
          </Link>
          <Link href="/register?role=provider" aria-current={pathname === '/register' ? 'page' : undefined} className={`${linkState('/register')} flex items-center min-h-[44px] font-semibold`}>
            Devenir prestataire
          </Link>
        </nav>

        {/* Actions desktop */}
        <div className="hidden xl:flex items-center gap-2.5">
          {themeButton}
          {user ? (
            <div
              className="relative"
              onMouseEnter={() => setProfileMenuOpen(true)}
              onMouseLeave={() => setProfileMenuOpen(false)}
            >
              <button
                className="flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-badge bg-line text-navy hover:bg-navy hover:text-white transition"
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
                onClick={() => setProfileMenuOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setProfileMenuOpen(false);
                }}
              >
                <User className="w-4 h-4" />
                {user.first_name}
                <ChevronDown className={`w-4 h-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`absolute right-0 top-full pt-2 w-56 ${profileMenuOpen ? 'block' : 'hidden'}`}>
                <div className="bg-white rounded-card shadow-card border border-line p-1.5">
                  <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-btn text-sm font-semibold hover:bg-canvas">
                    <LayoutGrid className="w-4 h-4" />
                    Mon espace
                  </Link>
                  <Link href="/account" className="flex items-center gap-2 px-3 py-2.5 rounded-btn text-sm font-semibold hover:bg-canvas">
                    <IdCard className="w-4 h-4" />
                    Mon profil
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin" className="flex items-center gap-2 px-3 py-2.5 rounded-btn text-sm font-semibold hover:bg-canvas">
                      <LayoutGrid className="w-4 h-4" />
                      Administration
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-btn text-sm font-semibold text-accent hover:bg-canvas"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="min-h-[48px] inline-flex items-center rounded-btn font-bold text-base px-5 border-2 border-navy text-navy hover:bg-navy hover:text-white transition">
                Connexion
              </Link>
              <Link href="/assistance" className="min-h-[48px] inline-flex items-center rounded-btn font-bold text-base px-5 bg-accent text-white hover:bg-accent-dark transition">
                Demander un service
              </Link>
            </>
          )}
        </div>

        {/* Hamburger mobile */}
        <button
          className="flex items-center xl:hidden text-navy p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="xl:hidden">{themeButton}</span>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div id="mobile-navigation" className="xl:hidden border-t border-line bg-white px-6 py-4 space-y-1 max-h-[75vh] overflow-y-auto">
          <div className="font-bold text-xs uppercase tracking-wider text-muted py-1">Services</div>
          <div className="grid grid-cols-1 gap-0.5 pb-2">
            {categories.map((c) => {
              const Icon = categoryIcon(c.icon_name);
              return (
                <Link
                  key={c.id}
                  href={`/providers?q=${encodeURIComponent(c.name)}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 py-2 font-semibold text-sm"
                >
                  <Icon className="w-4 h-4 text-accent" />
                  {c.name}
                </Link>
              );
            })}
          </div>
          <Link href="/#comment" onClick={() => setMobileOpen(false)} className="block py-2 font-semibold border-t border-line">
            Comment ça marche
          </Link>
          <Link href="/register?role=provider" onClick={() => setMobileOpen(false)} className="block py-2 font-semibold">
            Devenir prestataire
          </Link>
          <div className="pt-3 flex flex-col gap-2 border-t border-line">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block py-2 font-bold">
                  Mon espace ({user.first_name})
                </Link>
                <Link href="/account" onClick={() => setMobileOpen(false)} className="block py-2 font-bold">
                  Mon profil
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="block py-2 font-bold">
                    Administration
                  </Link>
                )}
                <button onClick={handleLogout} className="text-left py-2 font-bold text-accent">
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-outline w-full">
                  Connexion
                </Link>
                <Link href="/assistance" onClick={() => setMobileOpen(false)} className="btn-primary w-full">
                  Demander un service
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}