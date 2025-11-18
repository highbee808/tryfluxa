import { supabase } from "@/integrations/supabase/client";

interface RequestGistAudioResponse {
  audioUrl?: string | null;
  explanation?: string | null;
}

export async function requestGistAudio(gistId: string): Promise<RequestGistAudioResponse> {
  const { data, error } = await supabase.functions.invoke("request-gist-audio", {
    body: { gistId },
  });

  if (error) {
    throw error;
  }

  return data as RequestGistAudioResponse;
}
