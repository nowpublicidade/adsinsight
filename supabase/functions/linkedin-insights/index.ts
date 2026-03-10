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
      .select('linkedin_access_token, linkedin_org_id')
      .eq('id', client_id)
      .single();

    if (clientError || !client?.linkedin_access_token || !client?.linkedin_org_id) {
      return new Response(JSON.stringify({ error: 'LinkedIn not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { linkedin_access_token, linkedin_org_id } = client;
    const headers = {
      Authorization: `Bearer ${linkedin_access_token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
    };

    // Get follower count
    const statsRes = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${linkedin_org_id}`,
      { headers }
    );
    const statsData = await statsRes.json();
    
    let followers = 0;
    if (statsData.elements && statsData.elements.length > 0) {
      followers = statsData.elements[0].followerCounts?.organicFollowerCount || 0;
    }

    // Get posts (shares)
    const sinceMs = Date.now() - parseInt(period) * 86400 * 1000;
    const postsRes = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:organization:${linkedin_org_id})&sortBy=LAST_MODIFIED&count=50`,
      { headers }
    );
    const postsData = await postsRes.json();

    // Process posts
    const posts = (postsData.elements || [])
      .filter((p: any) => p.created?.time && p.created.time >= sinceMs)
      .map((p: any) => {
        const text = p.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '(sem texto)';
        const media = p.specificContent?.['com.linkedin.ugc.ShareContent']?.media;
        const image = media?.[0]?.thumbnails?.[0]?.url || null;
        
        return {
          id: p.id,
          message: text.substring(0, 200),
          createdTime: new Date(p.created.time).toISOString(),
          image,
          permalink: `https://www.linkedin.com/feed/update/${p.id}`,
          likes: 0,
          comments: 0,
          shares: 0,
          engagement: 0,
          channel: 'feed',
        };
      });

    // Try to get social actions for each post (likes, comments)
    for (const post of posts.slice(0, 10)) {
      try {
        const socialRes = await fetch(
          `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(post.id)}`,
          { headers }
        );
        if (socialRes.ok) {
          const socialData = await socialRes.json();
          post.likes = socialData.likesSummary?.totalLikes || 0;
          post.comments = socialData.commentsSummary?.totalFirstLevelComments || 0;
          post.engagement = post.likes + post.comments;
        }
      } catch {
        // ignore individual post errors
      }
    }

    const topPosts = posts
      .sort((a: any, b: any) => b.engagement - a.engagement)
      .slice(0, 10);

    const totalLikes = topPosts.reduce((s: number, p: any) => s + p.likes, 0);
    const totalComments = topPosts.reduce((s: number, p: any) => s + p.comments, 0);

    return new Response(JSON.stringify({
      metrics: {
        followers,
        impressions: 0,
        reach: 0,
        likes: totalLikes,
        comments: totalComments,
      },
      topPosts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in linkedin-insights:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
