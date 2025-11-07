import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Twitter, Facebook, Instagram, Link2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gist: {
    id: string;
    headline: string;
    context: string;
    image_url: string | null;
  };
}

export const ShareDialog = ({ open, onOpenChange, gist }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/feed?gist=${gist.id}`;
  const shareText = `Check out "${gist.headline}" on Fluxa! 🎧`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: string) => {
    let url = "";
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "instagram":
        toast.info("Copy the link and share it in your Instagram story or bio!");
        handleCopyLink();
        return;
      default:
        return;
    }

    window.open(url, "_blank", "width=600,height=400");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Gist</DialogTitle>
        </DialogHeader>

        {/* Preview Card */}
        <Card className="overflow-hidden border shadow-sm bg-card">
          {gist.image_url && (
            <img 
              src={gist.image_url} 
              alt={gist.headline}
              className="w-full h-40 object-cover"
            />
          )}
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{gist.headline}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{gist.context}</p>
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full"
              onClick={() => window.open(shareUrl, "_blank")}
            >
              Read more on Fluxa
            </Button>
          </div>
        </Card>

        {/* Share Options */}
        <div className="space-y-3 mt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => handleShare("twitter")}
          >
            <Twitter className="w-5 h-5 text-blue-400" />
            Share on Twitter
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => handleShare("facebook")}
          >
            <Facebook className="w-5 h-5 text-blue-600" />
            Share on Facebook
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => handleShare("instagram")}
          >
            <Instagram className="w-5 h-5 text-pink-500" />
            Share on Instagram
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                Link Copied!
              </>
            ) : (
              <>
                <Link2 className="w-5 h-5" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
