import { getAuthToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export type UploadScope = 'avatar' | 'logo' | 'portfolio' | 'request' | 'brand';

export function fileUrl(url?: string | null): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function uploadImage(file: File, scope: UploadScope): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const response = await fetch(`${API_URL}/uploads/image?scope=${encodeURIComponent(scope)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Le téléversement a échoué');
  }
  if (typeof data?.url !== 'string') {
    throw new Error('Le serveur n’a pas renvoyé l’URL du fichier');
  }

  return data.url;
}

export async function download(url: string, filename: string): Promise<void> {
  const response = await fetch(fileUrl(url));
  if (!response.ok) throw new Error('Impossible de télécharger ce fichier');

  const blob = await response.blob();
  const extension: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  const downloadName = /\.[a-z0-9]{2,5}$/i.test(filename) ? filename : `${filename}${extension[blob.type] || ''}`;
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
}

function colorIndex(name: string): number {
  return name.split('').reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7) % 6;
}

const AVATAR_COLORS = ['#155e63', '#b94f27', '#3264a8', '#55723a', '#8a4c37', '#315a70'];

export function initialsAvatarSvg(name: string): string {
  const background = AVATAR_COLORS[colorIndex(name || 'ASSISTCI')];
  const text = initials(name).replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${background}"/><text x="64" y="70" fill="#fff" font-family="Arial,sans-serif" font-size="48" font-weight="700" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function generateLogoFile(name: string): Promise<File> {
  if (typeof document === 'undefined') throw new Error('La création du logo nécessite un navigateur');

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Le canvas n’est pas disponible dans ce navigateur');

  const colors = ['#155e63', '#b94f27', '#3264a8', '#55723a', '#8a4c37', '#315a70'];
  const color = colors[colorIndex(name || 'ASSISTCI')];
  context.fillStyle = '#f4f5ef';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(40, 40, 432, 432, 96);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '700 188px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(initials(name), 256, 250, 360);
  context.fillStyle = '#f2a34a';
  context.beginPath();
  context.arc(410, 410, 24, 0, Math.PI * 2);
  context.fill();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Impossible de créer le logo')), 'image/png');
  });
  const safeName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'assistci-logo';
  return new File([blob], `${safeName}-logo.png`, { type: 'image/png' });
}

type ReceiptRequest = {
  id: number | string;
  title: string;
  status: string;
  description?: string;
  district?: string;
  city?: string;
  vehicle_brand?: string;
  vehicle_type?: string;
  breakdown_type?: string;
  urgency?: string;
  created_at?: string;
  completed_at?: string;
};

export async function downloadMissionReceipt(request: ReceiptRequest, proposals: any[]): Promise<void> {
  if (typeof document === 'undefined') throw new Error('Le reçu nécessite un navigateur');

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Le canvas n’est pas disponible dans ce navigateur');

  context.fillStyle = '#f5f6f1';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#155e63';
  context.fillRect(0, 0, canvas.width, 210);
  context.fillStyle = '#ffffff';
  context.font = '700 44px Arial, sans-serif';
  context.fillText('ASSISTCI', 72, 88);
  context.font = '400 24px Arial, sans-serif';
  context.fillText('REÇU D’INTERVENTION', 72, 145);
  context.textAlign = 'right';
  context.font = '700 28px Arial, sans-serif';
  context.fillText(`#${request.id}`, 1128, 92);
  context.textAlign = 'left';

  const accepted = proposals.find((proposal) => proposal.status === 'accepted');
  const lines: [string, string][] = [
    ['Intervention', request.title],
    ['Prestataire', accepted?.business_name || 'Non renseigné'],
    ['Lieu', [request.district, request.city].filter(Boolean).join(', ') || 'Non renseigné'],
    ['Véhicule', request.vehicle_brand || request.vehicle_type || 'Non renseigné'],
    ['Type de panne', request.breakdown_type || 'Non renseigné'],
    ['Urgence', request.urgency || 'Non renseignée'],
    ['Montant convenu', accepted?.proposed_price != null ? `${Number(accepted.proposed_price).toLocaleString('fr-FR')} FCFA` : 'Non renseigné'],
    ['Créée le', request.created_at ? new Date(request.created_at).toLocaleString('fr-FR') : 'Non renseigné'],
    ['Terminée le', request.completed_at ? new Date(request.completed_at).toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR')],
  ];

  let y = 270;
  for (const [label, value] of lines) {
    context.fillStyle = '#64706f';
    context.font = '600 19px Arial, sans-serif';
    context.fillText(label.toUpperCase(), 72, y);
    context.fillStyle = '#173535';
    context.font = '600 25px Arial, sans-serif';
    let displayValue = value;
    while (context.measureText(displayValue).width > 760 && displayValue.length > 3) {
      displayValue = `${displayValue.slice(0, -4)}…`;
    }
    context.fillText(displayValue, 390, y);
    context.strokeStyle = '#d9dfd9';
    context.beginPath();
    context.moveTo(72, y + 22);
    context.lineTo(1128, y + 22);
    context.stroke();
    y += 60;
  }

  context.fillStyle = '#55723a';
  context.font = '700 20px Arial, sans-serif';
  context.fillText(`Statut : ${request.status === 'completed' ? 'Terminée' : request.status}`, 72, 820);
  context.textAlign = 'right';
  context.fillStyle = '#64706f';
  context.font = '400 17px Arial, sans-serif';
  context.fillText('ASSISTCI · Abidjan, Côte d’Ivoire', 1128, 820);
  context.textAlign = 'left';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Impossible de créer le reçu')), 'image/png');
  });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `assistci-mission-${request.id}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}