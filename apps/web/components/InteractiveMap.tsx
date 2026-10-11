'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface MarkerData {
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type?: 'incident' | 'provider';
}

interface InteractiveMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: MarkerData[];
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
}

export default function InteractiveMap({
  centerLat = 5.3484, // Abidjan par défaut
  centerLng = -4.0305,
  zoom = 13,
  markers = [],
  onLocationSelect,
  height = '360px',
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = await import('leaflet');

      // Nettoyer l'ancienne instance si elle existe
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Création de la carte
      const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], zoom);
      mapInstanceRef.current = map;

      // Fond de carte OpenStreetMap haute performance
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Définition des icônes SVG personnalisées
      const incidentIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="background-color: #ea580c; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: bold; font-size: 16px;">
            ⚠️
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const providerIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="background-color: #16a34a; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: bold; font-size: 16px;">
            🔧
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Ajout des marqueurs
      markers.forEach((m) => {
        const icon = m.type === 'provider' ? providerIcon : incidentIcon;
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        if (m.title) {
          marker.bindPopup(`
            <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4;">
              <strong style="color: #0f172a; font-size: 13px;">${m.title}</strong>
              ${m.description ? `<p style="margin: 4px 0 0; color: #475569;">${m.description}</p>` : ''}
            </div>
          `);
        }
      });

      // Écouter le clic pour sélectionner une position
      if (onLocationSelect) {
        map.on('click', (e: any) => {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLng, zoom, markers, onLocationSelect]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
    </div>
  );
}

