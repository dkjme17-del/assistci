'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  defaultMode?: '2d' | '3d';
  showModeToggle?: boolean;
}

const LIGHT_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const CAMERA_3D = { pitch: 55, bearing: -20 };

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function styleFor(theme: Theme) {
  return theme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
}

function parseDashArray(dashArray?: string): number[] | undefined {
  if (!dashArray) return undefined;
  const values = dashArray
    .split(/[ ,]+/)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0);
  return values.length >= 2 ? values : undefined;
}

function add3DBuildings(map: any, theme: Theme) {
  const style = map.getStyle?.();
  if (!style?.layers || !style.sources?.openmaptiles) return;
  if (style.layers.some((layer: any) => layer.type === 'fill-extrusion')) return;

  const firstSymbol = style.layers.find((layer: any) => layer.type === 'symbol');
  map.addLayer(
    {
      id: 'assistci-3d-buildings',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': theme === 'dark' ? '#33434f' : '#d8d2c6',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.9,
      },
    },
    firstSymbol?.id
  );
}

function removePaths(map: any, pathIds: string[]) {
  pathIds.forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
  });
  pathIds.length = 0;
}

function syncPaths(map: any, paths: MapPathData[], pathIds: string[]) {
  removePaths(map, pathIds);
  paths.forEach((path, index) => {
    if (!path.positions || path.positions.length < 2) return;
    const id = `assistci-path-${index}`;
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: path.positions.map(([lat, lng]) => [lng, lat]),
        },
      },
    });
    const dash = parseDashArray(path.dashArray);
    map.addLayer({
      id,
      type: 'line',
      source: id,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': path.color || '#155e63',
        'line-width': path.weight || 4,
        'line-opacity': 0.85,
        ...(dash ? { 'line-dasharray': dash } : {}),
      },
    });
    pathIds.push(id);
  });
}

function buildIconElement(type?: MarkerData['type']) {
  const element = document.createElement('div');
  element.className = ['assistci-map-icon']
    .concat(type === 'incident' ? ['assistci-map-icon-incident'] : [])
    .concat(type === 'client' ? ['assistci-map-icon-client'] : [])
    .join(' ');
  const label = document.createElement('span');
  label.textContent = type === 'incident' ? '!' : type === 'client' ? 'C' : 'P';
  element.appendChild(label);
  return element;
}

function buildPopupContent(markerData: MarkerData) {
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
  return popup;
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
  defaultMode = '3d',
  showModeToggle = true,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const maplibreRef = useRef<any>(null);
  const markerInstancesRef = useRef<any[]>([]);
  const pathIdsRef = useRef<string[]>([]);
  const markerSignatureRef = useRef('');
  const pathSignatureRef = useRef('');
  const hasFitMarkersRef = useRef(false);
  const locationSelectRef = useRef(onLocationSelect);
  const pathsRef = useRef(paths);
  const is3DRef = useRef(defaultMode === '3d');
  const themeRef = useRef<Theme>('light');
  const [is3D, setIs3D] = useState(defaultMode === '3d');
  const [mapReady, setMapReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    locationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    is3DRef.current = is3D;
  }, [is3D]);

  useEffect(() => {
    let disposed = false;
    let observer: MutationObserver | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      try {
        const maplibregl = (await import('maplibre-gl')).default;
        if (disposed || !mapContainerRef.current) return;
        maplibreRef.current = maplibregl;

        const theme = currentTheme();
        themeRef.current = theme;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: styleFor(theme),
          center: [centerLng, centerLat],
          zoom,
          pitch: is3DRef.current ? CAMERA_3D.pitch : 0,
          bearing: is3DRef.current ? CAMERA_3D.bearing : 0,
          attributionControl: { compact: true },
        });
        mapInstanceRef.current = map;

        map.addControl(
          new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }),
          'top-right'
        );
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

        const applyOverlays = () => {
          if (disposed) return;
          add3DBuildings(map, themeRef.current);
          syncPaths(map, pathsRef.current, pathIdsRef.current);
          pathSignatureRef.current = JSON.stringify(pathsRef.current);
        };

        map.on('style.load', applyOverlays);
        map.on('load', () => {
          if (!disposed) setMapReady(true);
        });
        map.on('click', (event: any) => {
          locationSelectRef.current?.(event.lngLat.lat, event.lngLat.lng);
        });

        observer = new MutationObserver(() => {
          const next = currentTheme();
          if (next === themeRef.current) return;
          themeRef.current = next;
          map.setStyle(styleFor(next));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      } catch (error) {
        console.error('Impossible de charger la carte 3D', error);
        if (!disposed) setFailed(true);
      }
    }

    initMap();

    return () => {
      disposed = true;
      observer?.disconnect();
      setMapReady(false);
      hasFitMarkersRef.current = false;
      markerSignatureRef.current = '';
      pathSignatureRef.current = '';
      pathIdsRef.current = [];
      markerInstancesRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLng, zoom]);

  useEffect(() => {
    let cancelled = false;

    async function updateMarkers() {
      const map = mapInstanceRef.current;
      if (!map || !mapReady) return;

      const maplibregl = maplibreRef.current ?? (await import('maplibre-gl')).default;
      if (cancelled || mapInstanceRef.current !== map) return;

      const signature = JSON.stringify(markers);
      if (signature === markerSignatureRef.current) return;
      markerSignatureRef.current = signature;

      markerInstancesRef.current.forEach((marker) => marker.remove());
      markerInstancesRef.current = [];

      const validMarkers = markers.filter(
        (marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng)
      );

      validMarkers.forEach((markerData) => {
        const marker = new maplibregl.Marker({
          element: buildIconElement(markerData.type),
          anchor: 'center',
        }).setLngLat([markerData.lng, markerData.lat]);

        marker.setPopup(
          new maplibregl.Popup({ offset: 20, closeButton: false }).setDOMContent(
            buildPopupContent(markerData)
          )
        );
        marker.addTo(map);
        markerInstancesRef.current.push(marker);
      });

      if (fitMarkers && !hasFitMarkersRef.current) {
        const bounds = new maplibregl.LngLatBounds();
        validMarkers.forEach((marker) => bounds.extend([marker.lng, marker.lat]));
        paths.forEach((path) =>
          path.positions.forEach(([lat, lng]) => bounds.extend([lng, lat]))
        );
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
          hasFitMarkersRef.current = true;
        }
      }
    }

    updateMarkers();
    return () => {
      cancelled = true;
    };
  }, [mapReady, markers, paths, fitMarkers]);

  useEffect(() => {
    let cancelled = false;

    async function updatePaths() {
      const map = mapInstanceRef.current;
      if (!map || !mapReady) return;
      if (cancelled || mapInstanceRef.current !== map) return;

      const signature = JSON.stringify(paths);
      if (signature === pathSignatureRef.current) return;
      pathSignatureRef.current = signature;
      syncPaths(map, paths, pathIdsRef.current);
    }

    updatePaths();
    return () => {
      cancelled = true;
    };
  }, [mapReady, paths]);

  function toggleMode() {
    const next = !is3D;
    setIs3D(next);
    const map = mapInstanceRef.current;
    if (!map) return;
    map.easeTo({
      pitch: next ? CAMERA_3D.pitch : 0,
      bearing: next ? CAMERA_3D.bearing : 0,
      duration: 700,
    });
  }

  return (
    <div className="assistci-map-shell relative overflow-hidden rounded-2xl border border-line shadow-sm z-0">
      {showModeToggle && (
        <button
          type="button"
          onClick={toggleMode}
          className="assistci-map-mode-toggle"
          aria-pressed={is3D}
          title={is3D ? 'Revenir à la vue 2D' : 'Passer en vue 3D'}
        >
          <span className="assistci-map-mode-dot" />
          {is3D ? 'Vue 3D' : 'Vue 2D'}
        </button>
      )}
      <div ref={mapContainerRef} className="assistci-map" style={{ height, width: '100%' }} />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-4 text-center text-sm text-muted">
          La carte 3D n&apos;est pas disponible sur cet appareil.
        </div>
      )}
    </div>
  );
}
