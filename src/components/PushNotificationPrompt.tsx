import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Bell, X } from "lucide-react";
import { subscribeToPushNotifications } from "@/lib/pushNotifications";
import { toast } from "sonner";

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user has already made a decision
    const hasDecided = localStorage.getItem('push-notification-decided');
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    if (!hasDecided && isSupported && Notification.permission === 'default') {
      // Show prompt after a short delay
      const timer = setTimeout(() => {
        setShow(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const success = await subscribeToPushNotifications();
      if (success) {
        toast.success("Push notifications enabled!");
        localStorage.setItem('push-notification-decided', 'true');
        setShow(false);
      } else {
        toast.error("Failed to enable push notifications");
      }
    } catch (error) {
      console.error("Error enabling push notifications:", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push-notification-decided', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 max-w-sm">
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 hover:bg-accent rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Stay Updated</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Get notified when someone replies to your comments, mentions you, or follows you.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleEnable}
                  disabled={loading}
                  size="sm"
                  className="flex-1"
                >
                  {loading ? "Enabling..." : "Enable Notifications"}
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                >
                  Not Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
