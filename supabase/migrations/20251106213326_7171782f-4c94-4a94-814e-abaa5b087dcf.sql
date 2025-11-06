-- Create notifications table for Twitter-like notification system
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_gist', 'new_news', 'followed_entity_update', 'like', 'comment')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE CASCADE,
  gist_id UUID REFERENCES public.gists(id) ON DELETE CASCADE,
  entity_name TEXT,
  entity_image TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert notifications for users
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to send notification when new gist is published
CREATE OR REPLACE FUNCTION notify_followers_new_gist()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if gist is published and has a topic
  IF NEW.status = 'published' AND NEW.topic IS NOT NULL THEN
    -- Insert notifications for all users following entities related to this topic
    INSERT INTO public.notifications (user_id, type, title, message, gist_id, entity_name, created_at)
    SELECT DISTINCT 
      ff.user_id,
      'new_gist',
      'New gist from Fluxa',
      'Hey bestie 👀 ' || NEW.headline || ' — I got the gist 💅',
      NEW.id,
      NEW.topic,
      now()
    FROM public.fan_follows ff
    JOIN public.fan_entities fe ON ff.entity_id = fe.id
    WHERE LOWER(fe.name) = LOWER(NEW.topic) 
       OR LOWER(NEW.topic) LIKE '%' || LOWER(fe.name) || '%';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new gists
DROP TRIGGER IF EXISTS trigger_notify_new_gist ON public.gists;
CREATE TRIGGER trigger_notify_new_gist
AFTER INSERT OR UPDATE ON public.gists
FOR EACH ROW
EXECUTE FUNCTION notify_followers_new_gist();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER update_notifications_timestamp
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION update_notification_timestamp();