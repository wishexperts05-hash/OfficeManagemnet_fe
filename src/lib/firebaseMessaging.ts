import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import { api } from "./api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    return null;
  }
  return getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
}

export async function registerWebPushToken(): Promise<string | null> {
  if (!(await isSupported())) return null;

  const app = getFirebaseApp();
  if (!app || !vapidKey) {
    console.warn("[fcm] Firebase web config / VAPID key missing");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging: Messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) return null;
  await api.post("/notifications/device-token", { token });
  return token;
}
