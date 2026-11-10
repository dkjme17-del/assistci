'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MarkerData {
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type?: 'incident' | 'provider' | 'client';
  linkUrl?: string;
}

export interface MapPathData {
  positions: [number, number][];
  color?: string;
  weight?: number;
  dashArray?: string;
}

interface InteractiveMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: MarkerData[];
  paths?: MapPathData[];
  fitMarkers?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
}

export default function InteractiveMap({
  centerLat = 5.3484, // Abidjan par défaut
  centerLng = -4.0305,
  zoom = 13,
  markers = [],
  paths = [],
  fitMarkers = true,
  onLocationSelect,
  height = '360px',
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const pathLayerRef = useRef<any>(null);
  const hasFitMarkersRef = useRef(false);
  const locationSelectRef = useRef(onLocationSelect);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    locationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = await import('leaflet');
      if (disposed || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], zoom);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (event: any) => {
        locationSelectRef.current?.(event.latlng.lat, event.latlng.lng);
      });
      setMapReady(true);
    }

    initMap();

    return () => {
      disposed = true;
      setMapReady(false);
      hasFitMarkersRef.current = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerLayerRef.current = null;
      pathLayerRef.current = null;
    };
  }, [centerLat, centerLng, zoom]);

  useEffect(() => {
    let cancelled = false;

    async function updateMarkers() {
      const map = mapInstanceRef.current;
      if (!map || !mapReady) return;
      const L = await import('leaflet');
      if (cancelled || mapInstanceRef.current !== map) return;

      if (markerLayerRef.current) markerLayerRef.current.remove();
      const layer = L.featureGroup();
      const providerIcon = L.divIcon({
        className: 'assistci-map-icon',
        html: '<span>P</span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const incidentIcon = L.divIcon({
        className: 'assistci-map-icon assistci-map-icon-incident',
        html: '<span>!</span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const clientIcon = L.divIcon({
        className: 'assistci-map-icon assistci-map-icon-client',
        html: '<span>C</span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      if (pathLayerRef.current) pathLayerRef.current.remove();
      const pathLayer = L.featureGroup();
      paths.forEach((path) => {
        if (path.positions.length < 2) return;
        L.polyline(path.positions, {
          color: path.color || '#155e63',
          weight: path.weight || 4,
          opacity: 0.8,
          dashArray: path.dashArray,
        }).addTo(pathLayer);
      });
      pathLayerRef.current = pathLayer.addTo(map);

      markers.forEach((markerData) => {
        if (!Number.isFinite(markerData.lat) || !Number.isFinite(markerData.lng)) return;
        const marker = L.marker([markerData.lat, markerData.lng], {
          icon: markerData.type === 'incident'
            ? incidentIcon
            : markerData.type === 'client'
              ? clientIcon
              : providerIcon,
        });
        const popup = document.createElement('div');
        popup.className = 'assistci-map-popup';
        const title = document.createElement('strong');
        title.textContent = markerData.title;
        popup.appendChild(title);
        if (markerData.description) {
          const description = document.createElement('p');
          description.textContent = markerData.description;
          popup.appendChild(description);
        }
        if (markerData.linkUrl?.startsWith('/providers/')) {
          const link = document.createElement('a');
          link.href = markerData.linkUrl;
          link.textContent = 'Voir le profil';
          popup.appendChild(link);
        }
        marker.bindPopup(popup);
        marker.addTo(layer);
      });

      markerLayerRef.current = layer.addTo(map);
      if (fitMarkers && !hasFitMarkersRef.current) {
        const bounds = L.featureGroup([layer, pathLayer]).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
          hasFitMarkersRef.current = true;
        }
      }
    }

    updateMarkers();
    return () => {
      cancelled = true;
    };
  }, [mapReady, markers, paths, fitMarkers]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-line shadow-sm z-0">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
    </div>
  );
}
