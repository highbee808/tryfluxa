import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export const DeleteAccountDialog = ({ open, onOpenChange, userEmail }: DeleteAccountDialogProps) => {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      // Call delete-account edge function
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Delete account error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out (account already deleted)
      await supabase.auth.signOut();

      toast.success("Account deleted successfully", {
        description: "All your data has been permanently removed.",
      });

      // Redirect to home
      navigate("/");
      onOpenChange(false);
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error("Failed to delete account", {
        description: error instanceof Error ? error.message : "Please try again or contact support.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account Permanently
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <p className="font-medium text-foreground">
              This action cannot be undone. This will permanently delete:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Your profile and account data</li>
              <li>All your favorites and follows</li>
              <li>Your posts and reactions</li>
              <li>Your Fluxa memory and history</li>
              <li>All notifications and activity</li>
              <li>Your avatar and uploaded files</li>
            </ul>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="font-mono"
                disabled={isDeleting}
              />
              <p className="text-xs text-muted-foreground">
                Account: {userEmail}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== "DELETE" || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};