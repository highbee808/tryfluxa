-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  topic_category TEXT NOT NULL,
  description TEXT,
  active_listeners INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create room_hosts table for moderators and hosts
CREATE TABLE public.room_hosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('host', 'moderator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create sponsorships table
CREATE TABLE public.sponsorships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  ad_copy TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  impressions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_vip table for VIP status
CREATE TABLE public.user_vip (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  vip_status BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create room_stats table for analytics
CREATE TABLE public.room_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_listeners INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,
  session_length INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, date)
);

-- Create fluxa_awards table
CREATE TABLE public.fluxa_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  top_gister_id UUID,
  fluxa_fan_id UUID,
  hot_topic_room_id UUID REFERENCES public.rooms(id),
  announced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxa_awards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Anyone can view active rooms"
ON public.rooms FOR SELECT
USING (is_active = true);

CREATE POLICY "Only admins can manage rooms"
ON public.rooms FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for room_hosts
CREATE POLICY "Anyone can view room hosts"
ON public.room_hosts FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage room hosts"
ON public.room_hosts FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for sponsorships
CREATE POLICY "Anyone can view active sponsorships"
ON public.sponsorships FOR SELECT
USING (start_date <= now() AND end_date >= now());

CREATE POLICY "Only admins can manage sponsorships"
ON public.sponsorships FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_vip
CREATE POLICY "Users can view own VIP status"
ON public.user_vip FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage VIP status"
ON public.user_vip FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for room_stats
CREATE POLICY "Anyone can view room stats"
ON public.room_stats FOR SELECT
USING (true);

CREATE POLICY "Service role can manage stats"
ON public.room_stats FOR ALL
USING (true);

-- RLS Policies for fluxa_awards
CREATE POLICY "Anyone can view awards"
ON public.fluxa_awards FOR SELECT
USING (true);

CREATE POLICY "Service role can manage awards"
ON public.fluxa_awards FOR ALL
USING (true);

-- Insert default rooms
INSERT INTO public.rooms (name, icon, topic_category, description) VALUES
  ('Fluxa Music', '🎤', 'music', 'All the latest music gist, tea, and drama'),
  ('Fluxa Sports', '⚽', 'sports', 'Athletic tea and sports world gossip'),
  ('Fluxa Celebs', '💅', 'celebrity', 'Celebrity drama and entertainment news'),
  ('Fluxa Tech', '💻', 'technology', 'Tech world gist and startup drama'),
  ('Fluxa Fashion', '👗', 'fashion', 'Style gist and fashion week tea');

-- Enable realtime for rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_stats;