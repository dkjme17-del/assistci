'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, Navigation, ShieldCheck, Square } from 'lucide-react';
import { fetchApi } from '../lib/api';
import InteractiveMap, { type MapPathData, type MarkerData } from './InteractiveMap';

interface LiveLocation {
  latitude: number;
  longitude: number;
  updated_at: string;
}

interface LocationSnapshot {
  client: LiveLocation | null;
  provider: LiveLocation | null;
  expires_after_seconds: number;
}

type Participant = 'client' | 'provider';
type Coordinates = [number, number];

const EMPTY_SNAPSHOT: LocationSnapshot = {
  client: null,
  provider: null,
  expires_after_seconds: 90,
};

function isValidLocation(location: LiveLocation | null): location is LiveLocation {
  return Boolean(
    location &&
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude))
  );
}

function distanceMeters(first: Coordinates, second: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const [lat1, lon1] = first.map(radians);
  const [lat2, lon2] = second.map(radians);
  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;
  const value = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function appendPoint(path: Coordinates[], point: Coordinates): Coordinates[] {
  const last = path[path.length - 1];
  if (last && distanceMeters(last, point) < 5) return path;
  return [...path, point].slice(-300);
}

function formatUpdatedAt(location: LiveLocation | null): string {
  if (!location) return 'Pas de position partagée';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(location.updated_at).getTime()) / 1000));
  if (seconds < 10) return 'À l’instant';
  if (seconds < 60) return `Mise à jour il y a ${seconds} s`;
  return `Mise à jour il y a ${Math.floor(seconds / 60)} min`;
}

export default function LiveLocationTracker({
  requestId,
  participant,
}: {
  requestId: string;
  participant: Participant;
}) {
  const [snapshot, setSnapshot] = useState<LocationSnapshot>(EMPTY_SNAPSHOT);
  const [ownLocation, setOwnLocation] = useState<LiveLocation | null>(null);
  const [clientTrail, setClientTrail] = useState<Coordinates[]>([]);
  const [providerTrail, setProviderTrail] = useState<Coordinates[]>([]);
  const [sharing, setSharing] = useState(false);
  const [polling, setPolling] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSentRef = useRef<{ at: number; point: Coordinates } | null>(null);
  const pendingPublishRef = useRef<Promise<void> | null>(null);
  const sendInProgressRef = useRef(false);
  const previousRemotePointRef = useRef<Partial<Record<Participant, Coordinates>>>({});
  const currentCoordinatesRef = useRef<Coordinates | null>(null);
  const sharingSessionRef = useRef(false);
  const [mapCenter, setMapCenter] = useState<Coordinates | null>(null);
  const ownSnapshot = snapshot[participant];
  const remoteParticipant: Participant = participant === 'client' ? 'provider' : 'client';
  const remoteSnapshot = snapshot[remoteParticipant];
  const ownPoint = useMemo(() => (
    ownLocation
      ? [ownLocation.latitude, ownLocation.longitude] as Coordinates
      : isValidLocation(ownSnapshot)
        ? [Number(ownSnapshot.latitude), Number(ownSnapshot.longitude)] as Coordinates
        : null
  ), [ownLocation, ownSnapshot]);
  const remotePoint = useMemo(() => (
    isValidLocation(remoteSnapshot)
      ? [Number(remoteSnapshot.latitude), Number(remoteSnapshot.longitude)] as Coordinates
      : null
  ), [remoteSnapshot]);

  const refreshLocations = useCallback(async () => {
    try {
      const current = await fetchApi(`/requests/${requestId}/live-location`) as LocationSnapshot;
      setSnapshot(current);
      (['client', 'provider'] as const).forEach((role) => {
        const location = current[role];
        if (!isValidLocation(location)) {
          previousRemotePointRef.current[role] = undefined;
          return;
        }
        const point: Coordinates = [Number(location.latitude), Number(location.longitude)];
        const previous = previousRemotePointRef.current[role];
        if (!previous || distanceMeters(previous, point) >= 5) {
          const setter = role === 'client' ? setClientTrail : setProviderTrail;
          setter((path) => appendPoint(path, point));
          previousRemotePointRef.current[role] = point;
        }
      });
      setError(null);
    } catch (locationError) {
      console.error('Erreur de suivi GPS:', locationError);
      setError(locationError instanceof Error ? locationError.message : 'Le suivi GPS est indisponible.');
    } finally {
      setPolling(false);
    }
  }, [requestId]);

  useEffect(() => {
    void refreshLocations();
    const interval = window.setInterval(() => void refreshLocations(), 5000);
    return () => window.clearInterval(interval);
  }, [refreshLocations]);

  const publishLocation = useCallback((point: Coordinates) => {
    const previous = lastSentRef.current;
    if (
      sendInProgressRef.current ||
      (previous && Date.now() - previous.at < 10_000 && distanceMeters(previous.point, point) < 20)
    ) return;

    sendInProgressRef.current = true;
    setSaving(true);
    lastSentRef.current = { at: Date.now(), point };
    const publish = fetchApi(`/requests/${requestId}/live-location`, {
      method: 'PUT',
      body: JSON.stringify({ latitude: point[0], longitude: point[1] }),
    }).then(({ location }: { location: LiveLocation }) => {
      setOwnLocation(location);
      setSnapshot((currentSnapshot) => ({ ...currentSnapshot, [participant]: location }));
      setError(null);
    }).catch((saveError: unknown) => {
      console.error('Erreur de partage de la position:', saveError);
      lastSentRef.current = null;
      setError(saveError instanceof Error ? saveError.message : 'La position n’a pas pu être partagée.');
    }).finally(() => {
      sendInProgressRef.current = false;
      setSaving(false);
    });
    pendingPublishRef.current = publish;
    void publish.finally(() => {
      if (pendingPublishRef.current === publish) pendingPublishRef.current = null;
    });
  }, [requestId, participant]);

  useEffect(() => {
    if (!sharing) return;
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur cet appareil.');
      setSharing(false);
      return;
    }
    sharingSessionRef.current = true;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!sharingSessionRef.current) return;
        const point: Coordinates = [position.coords.latitude, position.coords.longitude];
        currentCoordinatesRef.current = point;
        const current: LiveLocation = {
          latitude: point[0],
          longitude: point[1],
          updated_at: new Date().toISOString(),
        };
        setOwnLocation(current);
        if (participant === 'client') setClientTrail((path) => appendPoint(path, point));
        else setProviderTrail((path) => appendPoint(path, point));
        publishLocation(point);
      },
      (locationError) => {
        sharingSessionRef.current = false;
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? 'Autorisez la géolocalisation dans votre navigateur pour partager votre position.'
            : 'Position GPS indisponible. Vérifiez le signal et réessayez.'
        );
        setSharing(false);
        void (async () => {
          await pendingPublishRef.current;
          await fetchApi(`/requests/${requestId}/live-location`, { method: 'DELETE' });
          setOwnLocation(null);
          setSnapshot((current) => ({ ...current, [participant]: null }));
        })().catch(() => setError('Impossible d’arrêter le partage GPS. Réessayez depuis cette page.'));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    const heartbeat = window.setInterval(() => {
      if (currentCoordinatesRef.current) publishLocation(currentCoordinatesRef.current);
    }, 20_000);

    return () => {
      sharingSessionRef.current = false;
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(heartbeat);
      currentCoordinatesRef.current = null;
    };
  }, [sharing, participant, requestId, publishLocation]);

  const startSharing = () => {
    setError(null);
    lastSentRef.current = null;
    setSharing(true);
  };

  const stopSharing = async () => {
    sharingSessionRef.current = false;
    setSharing(false);
    setError(null);
    setSaving(true);
    try {
      await pendingPublishRef.current;
      await fetchApi(`/requests/${requestId}/live-location`, { method: 'DELETE' });
      setOwnLocation(null);
      setSnapshot((current) => ({ ...current, [participant]: null }));
      setClientTrail((path) => participant === 'client' ? [] : path);
      setProviderTrail((path) => participant === 'provider' ? [] : path);
      lastSentRef.current = null;
    } catch (stopError) {
      console.error('Erreur d’arrêt du partage GPS:', stopError);
      setError(stopError instanceof Error ? stopError.message : 'Impossible d’arrêter le partage GPS.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const firstAvailablePoint = ownPoint || remotePoint;
    if (!mapCenter && firstAvailablePoint) setMapCenter(firstAvailablePoint);
  }, [mapCenter, ownPoint, remotePoint]);

  const markers: MarkerData[] = [];
  if (ownPoint) {
    markers.push({
      lat: ownPoint[0],
      lng: ownPoint[1],
      type: participant,
      title: participant === 'client' ? 'Client (vous)' : 'Prestataire (vous)',
      description: formatUpdatedAt(ownLocation || ownSnapshot),
    });
  }
  if (remotePoint) {
    markers.push({
      lat: remotePoint[0],
      lng: remotePoint[1],
      type: remoteParticipant,
      title: remoteParticipant === 'client' ? 'Client' : 'Prestataire choisi',
      description: formatUpdatedAt(remoteSnapshot),
    });
  }

  const paths = useMemo(() => {
    const result: MapPathData[] = [];
    if (clientTrail.length > 1) result.push({ positions: clientTrail, color: '#c2410c', weight: 4 });
    if (providerTrail.length > 1) result.push({ positions: providerTrail, color: '#155e63', weight: 4 });
    if (ownPoint && remotePoint) {
      result.push({
        positions: [ownPoint, remotePoint],
        color: '#334155',
        weight: 2,
        dashArray: '6 8',
      });
    }
    return result;
  }, [clientTrail, providerTrail, ownPoint, remotePoint]);

  const directDistance = ownPoint && remotePoint ? distanceMeters(ownPoint, remotePoint) / 1000 : null;
  const ownHasSharedLocation = Boolean(ownLocation || ownSnapshot);

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-7" aria-labelledby="live-location-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="live-location-title" className="m-0 flex items-center gap-2 text-lg font-extrabold text-navy">
            <Navigation className="h-5 w-5 text-accent" />
            Suivi GPS de l’intervention
          </h2>
          <p className="mt-1 text-sm text-muted">
            Partage facultatif, visible uniquement par le client et le prestataire assigné.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          Accès privé
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-page p-3 text-sm text-muted">
        Seule la dernière position est conservée. Elle est supprimée quand vous arrêtez le partage,
        après 90 secondes sans mise à jour ou à la fin de l’intervention. Gardez cette page ouverte
        pour actualiser votre position.
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3">
          <div className="font-bold">{participant === 'client' ? 'Votre position (client)' : 'Position du client'}</div>
          <div className="mt-1 text-xs text-muted">
            {participant === 'client' && sharing ? 'Partage GPS actif' : formatUpdatedAt(participant === 'client' ? ownLocation || ownSnapshot : snapshot.client)}
          </div>
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="font-bold">{participant === 'provider' ? 'Votre position (prestataire)' : 'Prestataire choisi'}</div>
          <div className="mt-1 text-xs text-muted">
            {participant === 'provider' && sharing ? 'Partage GPS actif' : formatUpdatedAt(participant === 'provider' ? ownLocation || ownSnapshot : snapshot.provider)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {sharing ? (
          <button type="button" className="btn-outline" onClick={() => void stopSharing()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
            Arrêter le partage
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={startSharing} disabled={saving}>
            {ownHasSharedLocation ? <Navigation className="mr-2 h-4 w-4" /> : <MapPin className="mr-2 h-4 w-4" />}
            {ownHasSharedLocation ? 'Reprendre le partage GPS' : 'Partager ma position'}
          </button>
        )}
        {sharing && (
          <span className="text-xs text-muted" aria-live="polite">
            {saving ? 'Enregistrement de la position…' : 'Actualisation automatique'}
          </span>
        )}
        {polling && !sharing && <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Chargement des positions" />}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-sm font-bold">Positions et trace en direct</h3>
          {directDistance !== null && (
            <span className="text-xs text-muted">Distance directe : {directDistance.toFixed(1)} km</span>
          )}
        </div>
        <InteractiveMap
          centerLat={mapCenter?.[0]}
          centerLng={mapCenter?.[1]}
          markers={markers}
          paths={paths}
          fitMarkers={markers.length > 1}
          height="clamp(280px, 45vh, 440px)"
          zoom={12}
        />
        <p className="mt-2 text-xs text-muted">
          Les lignes colorées montrent le déplacement observé pendant cette session. La ligne pointillée
          relie les deux positions à vol d’oiseau ; elle n’est pas un itinéraire routier.
        </p>
        {!remotePoint && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5" />
            L’autre participant doit aussi choisir « Partager ma position » pour apparaître sur la carte.
          </p>
        )}
      </div>
    </section>
  );
}
