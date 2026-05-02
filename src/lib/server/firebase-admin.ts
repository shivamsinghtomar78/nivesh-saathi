import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

import {
  hasFirebaseAdminConfig,
  serverEnv,
} from "@/lib/server/env";

type FirebaseServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function getFirebaseAdminCredential() {
  if (serverEnv.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(
      serverEnv.FIREBASE_SERVICE_ACCOUNT_JSON
    ) as FirebaseServiceAccountJson;

    return cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key?.replace(/\\n/g, "\n"),
    });
  }

  return cert({
    projectId: serverEnv.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: serverEnv.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  });
}

export function getFirebaseAdminApp() {
  if (!hasFirebaseAdminConfig) {
    return null;
  }

  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  return initializeApp({
    credential: getFirebaseAdminCredential(),
  });
}

export function getFirebaseAdminDb() {
  const app = getFirebaseAdminApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseAdminAuth() {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseMessaging() {
  const app = getFirebaseAdminApp();
  return app ? getMessaging(app) : null;
}
