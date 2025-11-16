import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDjtF7rCrZp7Yaq3c6f9pqYUq9J5FUQ9QLNS7YPnZNGs"; // You should generate your own VAPID keys

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications() {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      console.log('Service Worker registration failed');
      return false;
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in');
      return false;
    }

    // Save subscription to database
    const subscriptionJSON = subscription.toJSON();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscriptionJSON.endpoint!,
        auth_key: subscriptionJSON.keys!.auth,
        p256dh_key: subscriptionJSON.keys!.p256dh
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Error saving subscription:', error);
      return false;
    }

    console.log('Push notification subscription successful');
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

export async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    // Unsubscribe from push
    await subscription.unsubscribe();

    // Remove from database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
    }

    console.log('Unsubscribed from push notifications');
  } catch (error) {
    console.error('Error unsubscribing:', error);
  }
}
