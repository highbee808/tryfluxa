import { toast } from "sonner";

/**
 * Share a post using Web Share API with fallback to clipboard
 */
export async function sharePost(options: {
  title: string;
  text: string;
  url: string;
}): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
    } catch (error) {
      // User cancelled or share failed
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Share failed:", error);
        // Fall through to clipboard fallback
      } else {
        return; // User cancelled, don't show error
      }
    }
  }

  // Fallback to clipboard
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(options.url);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy link");
    }
  }
}

