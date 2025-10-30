import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Room {
  id: string;
  name: string;
  icon: string;
}

interface Sponsorship {
  id: string;
  brand_name: string;
  room_id: string;
  ad_copy: string;
  start_date: string;
  end_date: string;
  impressions: number;
  rooms?: { name: string; icon: string };
}

const AdminSponsors = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    brand_name: "",
    room_id: "",
    ad_copy: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      fetchRooms();
      fetchSponsorships();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('id, name, icon')
      .eq('is_active', true);
    
    if (data) setRooms(data);
  };

  const fetchSponsorships = async () => {
    const { data } = await supabase
      .from('sponsorships')
      .select('*, rooms(name, icon)')
      .order('created_at', { ascending: false });
    
    if (data) setSponsorships(data as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('sponsorships')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sponsorship added successfully",
      });

      setFormData({
        brand_name: "",
        room_id: "",
        ad_copy: "",
        start_date: "",
        end_date: "",
      });
      setShowForm(false);
      fetchSponsorships();
    } catch (error) {
      console.error('Error adding sponsorship:', error);
      toast({
        title: "Error",
        description: "Failed to add sponsorship",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sponsorships')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sponsorship deleted",
      });
      fetchSponsorships();
    } catch (error) {
      console.error('Error deleting sponsorship:', error);
      toast({
        title: "Error",
        description: "Failed to delete sponsorship",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Sponsorship Management</h1>
              <p className="text-muted-foreground">Manage brand partnerships</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Sponsor
          </Button>
        </div>

        {showForm && (
          <Card className="p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="brand_name">Brand Name</Label>
                <Input
                  id="brand_name"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="room_id">Room</Label>
                <Select
                  value={formData.room_id}
                  onValueChange={(value) => setFormData({ ...formData, room_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.icon} {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ad_copy">Ad Copy</Label>
                <Textarea
                  id="ad_copy"
                  value={formData.ad_copy}
                  onChange={(e) => setFormData({ ...formData, ad_copy: e.target.value })}
                  placeholder="This gist drop is powered by..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Add Sponsorship</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {sponsorships.map((sponsor) => (
            <Card key={sponsor.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">{sponsor.brand_name}</h3>
                    {sponsor.rooms && (
                      <span className="text-sm text-muted-foreground">
                        {sponsor.rooms.icon} {sponsor.rooms.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-2">{sponsor.ad_copy}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Start: {new Date(sponsor.start_date).toLocaleDateString()}</span>
                    <span>End: {new Date(sponsor.end_date).toLocaleDateString()}</span>
                    <span>{sponsor.impressions} impressions</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(sponsor.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {sponsorships.length === 0 && (
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Sponsorships Yet</h2>
            <p className="text-muted-foreground">Add your first brand partnership</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSponsors;
