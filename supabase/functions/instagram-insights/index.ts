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

async function fetchInsights(igId: string, token: string, since: number, until: number) {
  // Split into two calls: period=day metrics and metric_type=total_value metrics
  const [dailyRes, totalRes] = await Promise.all([
    fetch(`https://graph.facebook.com/v21.0/${igId}/insights?metric=reach,follower_count&period=day&since=${since}&until=${until}&access_token=${token}`),
    fetch(`https://graph.facebook.com/v21.0/${igId}/insights?metric=views,follows_and_unfollows&metric_type=total_value&period=day&since=${since}&until=${until}&access_token=${token}`),
  ]);

  const dailyData = await dailyRes.json();
  const totalData = await totalRes.json();

  if (dailyData.error) console.error('[IG] Daily insights error:', JSON.stringify(dailyData.error));
  if (totalData.error) console.error('[IG] Total insights error:', JSON.stringify(totalData.error));
  console.log('[IG] Total data:', JSON.stringify(totalData).substring(0, 1000));

  let reach = 0, views = 0, newFollowers = 0;
  const dailyReach: { date: string; value: number }[] = [];
  const dailyViews: { date: string; value: number }[] = [];
  const dailyNewFollowers: { date: string; value: number }[] = [];

  // Process daily metrics (reach, follower_count)
  if (dailyData.data) {
    for (const metric of dailyData.data) {
      if (!metric.values) continue;
      if (metric.name === 'reach') {
        for (const v of metric.values) {
          reach += v.value || 0;
          dailyReach.push({ date: v.end_time?.split('T')[0] || '', value: v.value || 0 });
        }
      }
    }
  }

  // Process total_value metrics (views, follows_and_unfollows)
  if (totalData.data) {
    for (const metric of totalData.data) {
      if (!metric.total_value && !metric.values) continue;

      if (metric.name === 'views') {
        // total_value metrics may return { total_value: { value: N } } or daily breakdowns
        if (metric.total_value?.value != null) {
          views = metric.total_value.value;
        }
        if (metric.values) {
          for (const v of metric.values) {
            dailyViews.push({ date: v.end_time?.split('T')[0] || '', value: v.value || 0 });
          }
        }
      }

      if (metric.name === 'follows_and_unfollows') {
        if (metric.total_value?.value != null) {
          // Can be { follows: N, unfollows: N } or just a number
          const val = metric.total_value.value;
          if (typeof val === 'object') {
            newFollowers = val.follows || 0;
          } else {
            newFollowers = val || 0;
          }
        }
        if (metric.total_value?.breakdowns) {
          // Extract daily from breakdowns if available
          for (const br of metric.total_value.breakdowns) {
            if (br.results) {
              for (const r of br.results) {
                const follows = r.value || 0;
                dailyNewFollowers.push({ date: r.end_time?.split('T')[0] || '', value: follows });
              }
            }
          }
        }
        if (metric.values) {
          for (const v of metric.values) {
            const val = v.value;
            const follows = typeof val === 'object' ? (val?.follows || 0) : (val || 0);
            if (dailyNewFollowers.length === 0) {
              dailyNewFollowers.push({ date: v.end_time?.split('T')[0] || '', value: follows });
            }
          }
        }
      }
    }
  }

  // If views didn't come from total_value, sum from daily
  if (views === 0 && dailyViews.length > 0) {
    views = dailyViews.reduce((s, d) => s + d.value, 0);
  }

  return { reach, views, newFollowers, dailyReach, dailyViews, dailyNewFollowers };
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
      .select('ig_account_id, fb_page_token')
      .eq('id', client_id)
      .single();

    if (clientError || !client?.ig_account_id || !client?.fb_page_token) {
      return new Response(JSON.stringify({ error: 'Instagram not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ig_account_id, fb_page_token } = client;
    const { since, until, prevSince, prevUntil } = parseDateParams(body);

    const [currentInsights, prevInsights, accountRes, mediaRes] = await Promise.all([
      fetchInsights(ig_account_id, fb_page_token, since, until),
      fetchInsights(ig_account_id, fb_page_token, prevSince, prevUntil),
      fetch(`https://graph.facebook.com/v21.0/${ig_account_id}?fields=followers_count,media_count,name,username&access_token=${fb_page_token}`),
      fetch(`https://graph.facebook.com/v21.0/${ig_account_id}/media?fields=id,caption,timestamp,media_type,media_url,thumbnail_url,permalink,like_count,comments_count,media_product_type&limit=50&access_token=${fb_page_token}`),
    ]);

    const accountData = await accountRes.json();
    const mediaData = await mediaRes.json();

    const sinceDate = new Date(since * 1000);
    const allMedia = (mediaData.data || []).filter((m: any) => new Date(m.timestamp) >= sinceDate);

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

    const prevSinceDate = new Date(prevSince * 1000);
    const prevUntilDate = new Date(prevUntil * 1000);
    const prevMedia = (mediaData.data || []).filter((m: any) => {
      const d = new Date(m.timestamp);
      return d >= prevSinceDate && d <= prevUntilDate;
    });
    const prevLikes = prevMedia.reduce((s: number, m: any) => s + (m.like_count || 0), 0);
    const prevComments = prevMedia.reduce((s: number, m: any) => s + (m.comments_count || 0), 0);

    // Build daily engagement from media
    const engagementByDate: Record<string, number> = {};
    for (const m of allMedia) {
      const date = m.timestamp?.split('T')[0] || '';
      engagementByDate[date] = (engagementByDate[date] || 0) + (m.like_count || 0) + (m.comments_count || 0);
    }
    const dailyEngagement = Object.entries(engagementByDate)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return new Response(JSON.stringify({
      metrics: {
        reach: currentInsights.reach,
        impressions: currentInsights.views, // 'views' replaces deprecated 'impressions'
        followers: accountData.followers_count || 0,
        newFollowers: currentInsights.newFollowers,
        likes: totalLikes,
        comments: totalComments,
      },
      comparison: {
        reach: prevInsights.reach,
        impressions: prevInsights.views,
        newFollowers: prevInsights.newFollowers,
        likes: prevLikes,
        comments: prevComments,
      },
      daily: {
        reach: currentInsights.dailyReach,
        impressions: currentInsights.dailyViews,
        newFollowers: currentInsights.dailyNewFollowers,
        engagement: dailyEngagement,
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
