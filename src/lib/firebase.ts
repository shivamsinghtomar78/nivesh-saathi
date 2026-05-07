import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import { env } from "@/env";

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const hasFirebaseClientConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

export const firebaseApp = hasFirebaseClientConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

export async function getFirebaseAnalytics() {
  if (
    typeof window === "undefined" ||
    !firebaseApp ||
    !firebaseConfig.measurementId
  ) {
    return null;
  }

  const { getAnalytics, isSupported } = await import("firebase/analytics");
  return (await isSupported()) ? getAnalytics(firebaseApp) : null;
}

export async function getFirebaseMessagingClient() {
  if (typeof window === "undefined" || !firebaseApp) {
    return null;
  }

  const { getMessaging, isSupported } = await import("firebase/messaging");
  return (await isSupported()) ? getMessaging(firebaseApp) : null;
}
