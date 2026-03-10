import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseDateParams(body: any): { since: number; until: number; prevSince: number; prevUntil: number } {
  const now = new Date();
  let since: Date, until: Date;

  if (body.date_range?.start && body.date_range?.end) {
    since = new Date(body.date_range.start);
    until = new Date(body.date_range.end);
    until.setHours(23, 59, 59, 999);
  } else {
    const preset = body.date_preset || 'last_30d';
    until = new Date();
    switch (preset) {
      case 'today': since = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'yesterday':
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        until = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'last_7d': since = new Date(Date.now() - 7 * 86400000); break;
      case 'last_14d': since = new Date(Date.now() - 14 * 86400000); break;
      case 'last_30d': since = new Date(Date.now() - 30 * 86400000); break;
      case 'this_month': since = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'last_month':
        since = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        until = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      default: since = new Date(Date.now() - 30 * 86400000);
    }
  }

  if (body.period && !body.date_preset && !body.date_range) {
    const days = parseInt(body.period);
    since = new Date(Date.now() - days * 86400000);
    until = new Date();
  }

  const diffMs = until.getTime() - since.getTime();
  const prevUntil = new Date(since.getTime() - 1);
  const prevSince = new Date(prevUntil.getTime() - diffMs);

  return {
    since: Math.floor(since.getTime() / 1000),
    until: Math.floor(until.getTime() / 1000),
    prevSince: Math.floor(prevSince.getTime() / 1000),
    prevUntil: Math.floor(prevUntil.getTime() / 1000),
  };
}

async function fetchPageInsights(pageId: string, token: string, since: number, until: number) {
  const metrics = 'page_impressions,page_post_engagements,page_fan_adds,page_views_total';
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/insights?metric=${metrics}&period=day&since=${since}&until=${until}&access_token=${token}`
  );
  const data = await res.json();

  let impressions = 0, engagements = 0, newFollowers = 0, views = 0;
  const dailyImpressions: { date: string; value: number }[] = [];
  const dailyEngagement: { date: string; value: number }[] = [];
  const dailyNewFollowers: { date: string; value: number }[] = [];

  if (data.data) {
    for (const metric of data.data) {
      if (!metric.values) continue;
      for (const v of metric.values) {
        const date = v.end_time?.split('T')[0] || '';
        const val = v.value || 0;
        switch (metric.name) {
          case 'page_impressions':
            impressions += val;
            dailyImpressions.push({ date, value: val });
            break;
          case 'page_post_engagements':
            engagements += val;
            dailyEngagement.push({ date, value: val });
            break;
          case 'page_fan_adds':
            newFollowers += val;
            dailyNewFollowers.push({ date, value: val });
            break;
          case 'page_views_total':
            views += val;
            break;
        }
      }
    }
  }

  return { impressions, engagements, newFollowers, views, dailyImpressions, dailyEngagement, dailyNewFollowers };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { client_id } = body;
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
    const { since, until, prevSince, prevUntil } = parseDateParams(body);

    // Fetch current + previous + page info + posts in parallel
    const [current, prev, pageRes, postsRes] = await Promise.all([
      fetchPageInsights(fb_page_id, fb_page_token, since, until),
      fetchPageInsights(fb_page_id, fb_page_token, prevSince, prevUntil),
      fetch(`https://graph.facebook.com/v21.0/${fb_page_id}?fields=followers_count,fan_count,name&access_token=${fb_page_token}`),
      fetch(`https://graph.facebook.com/v21.0/${fb_page_id}/posts?fields=id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares&limit=50&since=${since}&access_token=${fb_page_token}`),
    ]);

    const pageData = await pageRes.json();
    const postsData = await postsRes.json();

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
      .slice(0, 20);

    const totalLikes = topPosts.reduce((s: number, p: any) => s + p.likes, 0);
    const totalComments = topPosts.reduce((s: number, p: any) => s + p.comments, 0);

    return new Response(JSON.stringify({
      metrics: {
        reach: current.impressions, // page_impressions = reach on FB
        views: current.views,
        followers: pageData.followers_count || pageData.fan_count || 0,
        newFollowers: current.newFollowers,
        engagements: current.engagements,
        likes: totalLikes,
        comments: totalComments,
      },
      comparison: {
        reach: prev.impressions,
        views: prev.views,
        newFollowers: prev.newFollowers,
        engagements: prev.engagements,
      },
      daily: {
        impressions: current.dailyImpressions,
        engagement: current.dailyEngagement,
        newFollowers: current.dailyNewFollowers,
      },
      pageName: pageData.name || '',
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
