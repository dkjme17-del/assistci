'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Bell, Check } from 'lucide-react';
import { fetchApi } from '../../lib/api';

export default function NotificationsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetchApi('/notifications');
      setItems(res.notifications || []);
      setUnread(res.unread_count || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    await fetchApi('/notifications/read-all', { method: 'PATCH' }).catch(() => {});
    load();
  };

  const markOne = async (id: number) => {
    await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
    load();
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-2" />
        Chargement des notifications…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <p className="text-muted text-sm">
          {unread > 0 ? `${unread} notification(s) non lue(s)` : 'Tout est à jour.'}
        </p>
        {unread > 0 && (
          <button onClick={markAll} className="btn-outline min-h-[40px] text-sm">
            Tout marquer comme lu
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-muted">
          <Bell className="w-8 h-8 mx-auto mb-2 text-line" />
          <p className="text-sm">Aucune notification pour le moment.</p>
        </div>
      ) : (
        items.map((n) => (
          <div key={n.id} className={`card flex justify-between gap-3 items-start ${n.is_read ? '' : 'border-l-4 border-l-accent'}`}>
            <div>
              <div className="font-bold">{n.title}</div>
              <div className="text-muted text-sm mt-0.5">{n.message}</div>
              <div className="text-xs text-muted mt-1">
                {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              {n.link && (
                <Link href={n.link} className="text-accent text-sm font-bold hover:underline mt-1 inline-block">
                  Voir
                </Link>
              )}
            </div>
            {!n.is_read && (
              <button onClick={() => markOne(n.id)} className="text-muted hover:text-navy p-1" title="Marquer comme lu">
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}