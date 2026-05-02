"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteToken, getToken } from "firebase/messaging";

import { withCsrfHeaders } from "@/lib/csrf";
import { getFirebaseMessagingClient } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";

type NotificationState =
  | "checking"
  | "unsupported"
  | "blocked"
  | "ready"
  | "enabled"
  | "enabling"
  | "error";

async function getServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.getRegistration("/").then(
    (registration) =>
      registration ??
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
  );
}

export function useFdNotifications() {
  const user = useAuthStore((state) => state.user);
  const [state, setState] = useState<NotificationState>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!user) {
        setState("checking");
        return;
      }

      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator)
      ) {
        setState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }

      setState(Notification.permission === "granted" ? "enabled" : "ready");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user]);

  const enable = useCallback(async () => {
    if (!user) return false;

    try {
      setState("enabling");
      setError(null);

      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("blocked");
        return false;
      }

      if (permission !== "granted") {
        setState("ready");
        return false;
      }

      const [registration, messaging, tokenResponse] = await Promise.all([
        getServiceWorkerRegistration(),
        getFirebaseMessagingClient(),
        fetch("/api/fds/notifications/token"),
      ]);

      if (!registration || !messaging) {
        setState("unsupported");
        return false;
      }

      const tokenPayload = (await tokenResponse.json()) as {
        vapidKey?: string | null;
      };

      if (!tokenPayload.vapidKey) {
        throw new Error("Firebase VAPID key is not configured");
      }

      const token = await getToken(messaging, {
        vapidKey: tokenPayload.vapidKey,
        serviceWorkerRegistration: registration,
      });

      await fetch("/api/fds/notifications/token", {
        method: "POST",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ token }),
      });

      setState("enabled");
      return true;
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Unable to enable alerts");
      return false;
    }
  }, [user]);

  const disable = useCallback(async () => {
    if (!user) return false;

    try {
      const messaging = await getFirebaseMessagingClient();
      if (!messaging) return false;

      const registration = await getServiceWorkerRegistration();
      const tokenResponse = await fetch("/api/fds/notifications/token");
      const tokenPayload = (await tokenResponse.json()) as {
        vapidKey?: string | null;
      };

      if (!tokenPayload.vapidKey) return false;

      const token = await getToken(messaging, {
        vapidKey: tokenPayload.vapidKey,
        serviceWorkerRegistration: registration ?? undefined,
      }).catch(() => "");

      if (token) {
        await fetch("/api/fds/notifications/token", {
          method: "DELETE",
          headers: withCsrfHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ token }),
        });
      }

      await deleteToken(messaging).catch(() => undefined);
      setState("ready");
      return true;
    } catch {
      setState("error");
      return false;
    }
  }, [user]);

  return {
    disable,
    enable,
    error,
    isEnabled: state === "enabled",
    isReady: state === "ready" || state === "error",
    state,
  };
}
