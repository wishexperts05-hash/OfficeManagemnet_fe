export async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });
  });
}

export function startLocationWatch(
  onPoint: (lat: number, lng: number, accuracy?: number, speed?: number | null) => void,
): number {
  if (!navigator.geolocation) return -1;
  return navigator.geolocation.watchPosition(
    (pos) => {
      onPoint(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy,
        pos.coords.speed,
      );
    },
    () => undefined,
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
  );
}
