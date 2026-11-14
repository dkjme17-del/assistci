export interface BrowserPosition {
  latitude: number;
  longitude: number;
}

export function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Autorisation refusée. Autorisez la localisation dans votre navigateur puis réessayez.';
    case error.POSITION_UNAVAILABLE:
      return 'Position indisponible. Vérifiez votre connexion GPS puis réessayez.';
    case error.TIMEOUT:
      return 'La localisation a pris trop de temps. Réessayez.';
    default:
      return 'Impossible de récupérer votre position.';
  }
}

export function getBrowserPosition(options?: PositionOptions): Promise<BrowserPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => reject(new Error(geolocationErrorMessage(error))),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000, ...options }
    );
  });
}
