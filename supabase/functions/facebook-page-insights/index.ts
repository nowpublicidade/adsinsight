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
      .select('fb_page_id, fb_page_token')
      .eq('id', client_id)
      .single();

    if (clientError || !client?.fb_page_id || !client?.fb_page_token) {
      return new Response(JSON.stringify({ error: 'Facebook Page not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { fb_page_id, fb_page_token } = client;
    const since = Math.floor(Date.now() / 1000) - parseInt(period) * 86400;
    const until = Math.floor(Date.now() / 1000);

    // Get page insights
    const metricsToFetch = [
      'page_impressions',
      'page_post_engagements',
      'page_fan_adds',
      'page_views_total',
    ].join(',');

    const insightsRes = await fetch(
      `https://graph.facebook.com/v24.0/${fb_page_id}/insights?metric=${metricsToFetch}&period=day&since=${since}&until=${until}&access_token=${fb_page_token}`
    );
    const insightsData = await insightsRes.json();

    // Get page followers count
    const pageRes = await fetch(
      `https://graph.facebook.com/v24.0/${fb_page_id}?fields=followers_count,fan_count&access_token=${fb_page_token}`
    );
    const pageData = await pageRes.json();

    // Get top posts
    const postsRes = await fetch(
      `https://graph.facebook.com/v24.0/${fb_page_id}/posts?fields=id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares&limit=50&since=${since}&access_token=${fb_page_token}`
    );
    const postsData = await postsRes.json();

    // Process insights
    let reach = 0, engagements = 0, newFollowers = 0, views = 0;

    if (insightsData.data) {
      for (const metric of insightsData.data) {
        const total = metric.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0;
        switch (metric.name) {
          case 'page_impressions': reach = total; break;
          case 'page_post_engagements': engagements = total; break;
          case 'page_fan_adds': newFollowers = total; break;
          case 'page_views_total': views = total; break;
        }
      }
    }

    // Process top posts — sort by engagement
    const topPosts = (postsData.data || [])
      .map((post: any) => ({
        id: post.id,
        message: post.message || '(sem texto)',
        createdTime: post.created_time,
        image: post.full_picture || null,
        permalink: post.permalink_url,
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
        engagement: (post.likes?.summary?.total_count || 0) + (post.comments?.summary?.total_count || 0) + (post.shares?.count || 0),
        channel: 'feed',
      }))
      .sort((a: any, b: any) => b.engagement - a.engagement)
      .slice(0, 10);

    return new Response(JSON.stringify({
      metrics: {
        reach,
        views,
        followers: pageData.followers_count || pageData.fan_count || 0,
        newFollowers,
        engagements,
        likes: topPosts.reduce((s: number, p: any) => s + p.likes, 0),
        comments: topPosts.reduce((s: number, p: any) => s + p.comments, 0),
      },
      topPosts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in facebook-page-insights:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
