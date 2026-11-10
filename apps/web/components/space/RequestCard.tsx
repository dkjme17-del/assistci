'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Calendar, AlertCircle, ArrowRight, Check } from 'lucide-react';

const STEPS = ['Envoyée', 'Acceptée', 'En cours', 'Terminée'] as const;

export function stepIndex(status: string): number {
  switch (status) {
    case 'created':
    case 'matching':
      return 0;
    case 'proposal_received':
    case 'accepted':
      return 1;
    case 'in_progress':
      return 2;
    case 'completed':
      return 3;
    default:
      return -1;
  }
}

export function isDone(status: string): boolean {
  return status === 'completed' || status === 'cancelled';
}

const STATUS_LABEL: Record<string, string> = {
  created: 'Envoyée',
  matching: 'Recherche',
  proposal_received: 'Proposition reçue',
  accepted: 'Acceptée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

function ProgressSteps({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-0 mt-4">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        const colour = done ? 'bg-emerald-600' : current ? 'bg-accent' : 'bg-line';
        return (
          <li key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${colour}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className={`text-[11px] font-bold ${current ? 'text-accent' : done ? 'text-emerald-600' : 'text-muted'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mb-4 ${i < step ? 'bg-emerald-600' : 'bg-line'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function RequestCard({ req, showClient = false }: { req: any; showClient?: boolean }) {
  const step = stepIndex(req.status);
  return (
    <div className="card gap-3">
      <div className="flex justify-between gap-3 flex-wrap items-start">
        <div>
          <div className="font-extrabold text-lg">
            #{req.id} · {req.title}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1.5">
            <span className="badge badge-gray">{req.category_name}</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              {req.district || req.city || 'Abidjan'}
              {req.address_text ? ` (${req.address_text})` : ''}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {showClient && req.client_first_name && <span>Client : {req.client_first_name}</span>}
            {req.urgency === 'critical' && (
              <span className="flex items-center gap-1 text-accent-dark font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                Urgence critique
              </span>
            )}
          </div>
        </div>
        <span className="badge badge-gray">{STATUS_LABEL[req.status] || req.status}</span>
      </div>

      {step >= 0 && <ProgressSteps step={step} />}

      <div className="flex justify-end">
        <Link href={`/requests/${req.id}`} className="btn-navy min-h-[40px] text-sm">
          Détails & Chat
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
}