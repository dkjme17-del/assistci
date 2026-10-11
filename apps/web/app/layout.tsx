import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ASSISTCI',
  description: 'Plateforme de services de proximité'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
