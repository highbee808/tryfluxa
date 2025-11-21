import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Bell, Moon, Sun, User, Shield, Trash2 } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { DesktopNavigationWidget } from "@/components/DesktopNavigationWidget";
import { DesktopRightWidgets } from "@/components/DesktopRightWidgets";

const Settings = () => {
  const navigate = useNavigate();
  const { isDark, toggleDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setBio(profile.bio || "");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          display_name: displayName,
          bio: bio,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
      <div className="container mx-auto px-4 lg:pt-10">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px] items-start">
          <DesktopNavigationWidget />

          <div className="w-full max-w-2xl mx-auto lg:mx-0 border-x border-border min-h-screen pb-24">
            {/* Header */}
            <div className="sticky top-0 z-50 px-4 pt-4 pb-2 bg-transparent">
              <div className="frosted-nav flex items-center gap-4 px-5 py-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="frosted-icon-button"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center">
                  <h1 className="text-xl font-bold">Settings</h1>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="frosted-icon-button" aria-label="Notifications">
                    <Bell className="w-5 h-5" />
                  </button>
                  <button type="button" className="frosted-icon-button" aria-label="Privacy shortcuts">
                    <Shield className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 pt-10 pb-8 space-y-6">
              {/* Account Settings */}
              <Card className="glass border-glass-border-light rounded-3xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <CardTitle>Account Settings</CardTitle>
                  </div>
                  <CardDescription>Manage your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-secondary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself"
                    />
                  </div>

                  <Button onClick={handleSaveProfile} className="w-full">
                    Save Changes
                  </Button>

                  <Separator />

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate("/voice-history")}
                  >
                    <Bell className="w-4 h-4" />
                    Voice Chat History
                  </Button>
                </CardContent>
              </Card>

              {/* Appearance */}
              <Card className="glass border-glass-border-light rounded-3xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {isDark ? (
                      <Moon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Sun className="w-5 h-5 text-blue-600" />
                    )}
                    <CardTitle>Appearance</CardTitle>
                  </div>
                  <CardDescription>Customize how Fluxa looks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Switch between light and dark themes
                      </p>
                    </div>
                    <Switch checked={isDark} onCheckedChange={toggleDarkMode} />
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="glass border-glass-border-light rounded-3xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <CardTitle>Notifications</CardTitle>
                  </div>
                  <CardDescription>Control how you stay in the loop</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Turn on/off all notifications
                      </p>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive summary emails twice a week
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                      disabled={!notificationsEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get push notifications on this device
                      </p>
                    </div>
                    <Switch
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                      disabled={!notificationsEnabled}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Privacy & Security */}
              <Card className="glass border-glass-border-light">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <CardTitle>Privacy & Security</CardTitle>
                  </div>
                  <CardDescription>Manage your privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      supabase.auth.signOut();
                      navigate("/");
                    }}
                  >
                    Sign Out
                  </Button>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <Trash2 className="w-5 h-5" />
                      <h3 className="font-semibold">Danger Zone</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DesktopRightWidgets />
        </div>
      </div>

      <BottomNavigation />
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userEmail={email}
      />
    </div>
  );

};

export default Settings;
