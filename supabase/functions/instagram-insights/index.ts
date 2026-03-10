import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { client_id, period = '30' } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('ig_account_id, fb_page_token')
      .eq('id', client_id)
      .single();

    if (clientError || !client?.ig_account_id || !client?.fb_page_token) {
      return new Response(JSON.stringify({ error: 'Instagram not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ig_account_id, fb_page_token } = client;
    const since = Math.floor(Date.now() / 1000) - parseInt(period) * 86400;
    const until = Math.floor(Date.now() / 1000);

    // Get account info (followers)
    const accountRes = await fetch(
      `https://graph.facebook.com/v24.0/${ig_account_id}?fields=followers_count,media_count,name,username&access_token=${fb_page_token}`
    );
    const accountData = await accountRes.json();

    // Get account insights
    const insightsRes = await fetch(
      `https://graph.facebook.com/v24.0/${ig_account_id}/insights?metric=reach,impressions,follower_count&period=day&since=${since}&until=${until}&access_token=${fb_page_token}`
    );
    const insightsData = await insightsRes.json();

    // Get recent media (feed + stories via media_product_type)
    const mediaRes = await fetch(
      `https://graph.facebook.com/v24.0/${ig_account_id}/media?fields=id,caption,timestamp,media_type,media_url,thumbnail_url,permalink,like_count,comments_count,media_product_type&limit=50&access_token=${fb_page_token}`
    );
    const mediaData = await mediaRes.json();

    // Process insights
    let reach = 0, impressions = 0, newFollowers = 0;
    if (insightsData.data) {
      for (const metric of insightsData.data) {
        const total = metric.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0;
        switch (metric.name) {
          case 'reach': reach = total; break;
          case 'impressions': impressions = total; break;
          case 'follower_count': newFollowers = total; break;
        }
      }
    }

    // Filter media by period
    const sinceDate = new Date(since * 1000);
    const allMedia = (mediaData.data || []).filter((m: any) => new Date(m.timestamp) >= sinceDate);

    // Map to top posts
    const topPosts = allMedia
      .map((m: any) => {
        const isStory = m.media_product_type === 'STORY' || m.media_product_type === 'REELS';
        return {
          id: m.id,
          message: m.caption || '(sem legenda)',
          createdTime: m.timestamp,
          image: m.media_url || m.thumbnail_url || null,
          permalink: m.permalink,
          likes: m.like_count || 0,
          comments: m.comments_count || 0,
          shares: 0,
          engagement: (m.like_count || 0) + (m.comments_count || 0),
          channel: isStory ? 'stories' : 'feed',
          mediaType: m.media_type,
        };
      })
      .sort((a: any, b: any) => b.engagement - a.engagement)
      .slice(0, 20);

    const totalLikes = allMedia.reduce((s: number, m: any) => s + (m.like_count || 0), 0);
    const totalComments = allMedia.reduce((s: number, m: any) => s + (m.comments_count || 0), 0);

    return new Response(JSON.stringify({
      metrics: {
        reach,
        impressions,
        followers: accountData.followers_count || 0,
        newFollowers,
        likes: totalLikes,
        comments: totalComments,
      },
      username: accountData.username || '',
      topPosts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in instagram-insights:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
