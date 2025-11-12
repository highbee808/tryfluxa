-- Create cost alert settings table
CREATE TABLE IF NOT EXISTS public.cost_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_limit numeric NOT NULL DEFAULT 50.00,
  current_month_cost numeric NOT NULL DEFAULT 0.00,
  alert_threshold numeric NOT NULL DEFAULT 0.80,
  last_reset timestamp with time zone NOT NULL DEFAULT date_trunc('month', now()),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user reading habits table for Fluxa Brain
CREATE TABLE IF NOT EXISTS public.fluxa_brain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_speed text NOT NULL DEFAULT 'medium', -- fast, medium, slow
  preferred_tone text NOT NULL DEFAULT 'casual', -- concise, casual, analytical
  topics_read jsonb NOT NULL DEFAULT '[]'::jsonb,
  engagement_score numeric NOT NULL DEFAULT 0.0,
  total_reads integer NOT NULL DEFAULT 0,
  avg_read_time integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create AI provider config table for resilient architecture
CREATE TABLE IF NOT EXISTS public.ai_provider_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL UNIQUE,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  cost_per_1k_tokens numeric NOT NULL DEFAULT 0.0,
  rate_limit integer NOT NULL DEFAULT 60,
  fallback_provider text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create API usage logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  endpoint text NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  estimated_cost numeric NOT NULL DEFAULT 0.0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluxa_brain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cost_alert_settings
CREATE POLICY "Only admins can view cost alerts"
  ON public.cost_alert_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update cost alerts"
  ON public.cost_alert_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage cost alerts"
  ON public.cost_alert_settings FOR ALL
  USING (true);

-- RLS Policies for fluxa_brain
CREATE POLICY "Users can view own brain data"
  ON public.fluxa_brain FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brain data"
  ON public.fluxa_brain FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brain data"
  ON public.fluxa_brain FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for ai_provider_config
CREATE POLICY "Anyone can view active providers"
  ON public.ai_provider_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage providers"
  ON public.ai_provider_config FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for api_usage_logs
CREATE POLICY "Only admins can view usage logs"
  ON public.api_usage_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert usage logs"
  ON public.api_usage_logs FOR INSERT
  WITH CHECK (true);

-- Insert default cost alert settings
INSERT INTO public.cost_alert_settings (monthly_limit, alert_threshold)
VALUES (50.00, 0.80)
ON CONFLICT DO NOTHING;

-- Insert default AI providers
INSERT INTO public.ai_provider_config (provider_name, priority, cost_per_1k_tokens, is_active) VALUES
  ('lovable-gemini-flash', 1, 0.000075, true),
  ('lovable-gpt-5-nano', 2, 0.0015, true),
  ('openai-fallback', 3, 0.002, false)
ON CONFLICT (provider_name) DO NOTHING;