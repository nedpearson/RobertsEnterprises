import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function NotificationPermissionToggle() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Web Notifications are not supported in this browser.');
      return;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications enabled!', {
          description: 'You will now receive real-time operational updates.',
        });
        // Trigger a test notification locally
        try {
          new Notification('The Boutique Mobile', {
            body: 'Real-time notifications are active!',
            icon: '/icons/pwa-192x192.png',
          });
        } catch (e) {
          // Some browsers only allow notifications from Service Worker registration
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('The Boutique Mobile', {
              body: 'Real-time notifications are active!',
              icon: '/icons/pwa-192x192.png',
            });
          }
        }
      } else if (result === 'denied') {
        toast.error('Notifications blocked', {
          description: 'Please enable notifications in your browser settings to receive updates.',
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to request permission.');
    } finally {
      setLoading(false);
    }
  };

  if (!('Notification' in window)) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 relative overflow-hidden transition-all duration-300 border-stone-200/60 dark:border-stone-800 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow"
      onClick={requestPermission}
      disabled={loading || permission === 'denied' || permission === 'granted'}
    >
      {permission === 'granted' ? (
        <>
          <BellRing className="h-4 w-4 text-emerald-500 animate-pulse" />
          <span className="text-xs text-stone-600 font-medium">Notifications Active</span>
        </>
      ) : permission === 'denied' ? (
        <>
          <BellOff className="h-4 w-4 text-rose-500" />
          <span className="text-xs text-stone-500 font-medium">Blocked</span>
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 text-stone-500" />
          <span className="text-xs text-stone-700 font-medium">Enable Alerts</span>
        </>
      )}
    </Button>
  );
}
