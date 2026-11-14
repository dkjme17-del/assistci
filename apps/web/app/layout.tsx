import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const themeBootstrap = `try { const saved = localStorage.getItem('assistci_theme'); const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; } catch {}`;

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'ASSISTCI - Dépannage auto & services de proximité en Côte d’Ivoire',
  description:
    'Trouver. Être dépanné. Faire confiance. Dépanneurs et garages de proximité en Côte d’Ivoire : comparez, demandez une intervention et suivez-la au même endroit.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={`font-sans flex flex-col min-h-screen bg-canvas text-navy antialiased`}>
        <Navbar />
        <div className="flex-grow">{children}</div>
        <Footer />
      </body>
    </html>
  );
}