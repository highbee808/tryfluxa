// Fluxa Push Notification System

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendFluxaAlert = (title: string, body: string) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/fluxa_icon.png",
      badge: "/fluxa_icon.png",
      tag: "fluxa-alert",
      requireInteraction: false,
    });
  }
};

// Notification templates
export const fluxaNotifications = {
  newGist: (headline: string) => ({
    title: "Hey bestie 👀",
    body: `${headline} — I got the gist 💅`,
  }),
  
  dailyDrop: () => ({
    title: "Fluxa here 😘",
    body: "Just dropped fresh gist for you ☕",
  }),
  
  trendingTopic: (topic: string) => ({
    title: "Quick update 💋",
    body: `Something wild about ${topic} — you'll love this one.`,
  }),
  
  newStories: () => ({
    title: "Fluxa Stories 📸",
    body: "5 gists you missed overnight — tap to catch up!",
  }),
};