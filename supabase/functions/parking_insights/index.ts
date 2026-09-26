import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Call get_parking_statistics
    const { data: stats, error } = await supabaseClient.rpc('get_parking_statistics', { p_days: 7 });
    if (error) throw error;

    // Call Gemini
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY');

    let aiInsights = "";

    const prompt = `You are a campus parking intelligence system. Given these stats for the last 7 days:
Total Capacity: ${stats.total_capacity}
Current Occupancy: ${stats.current_occupancy}
Avg Booking Duration (mins): ${stats.avg_booking_duration_mins}
Cancellation Rate: ${stats.cancellation_rate_pct}%
Most heavily used zone: ${stats.most_heavily_used_zone}
Underutilized zone: ${stats.underutilized_zone}

Provide 3 concise, actionable bullet points explaining these insights and suggesting improvements to campus administrators. Do not invent numbers. Return only the bullet points.`;

    if (geminiKey) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (resp.ok) {
           const json = await resp.json();
           aiInsights = json.candidates[0].content.parts[0].text;
        }
      } catch (e) { console.error("Gemini failed:", e); }
    } 
    
    if (!aiInsights && groqKey) {
       try {
         const resp = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
           body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'user', content: prompt }] })
         });
         if (resp.ok) {
           const json = await resp.json();
           aiInsights = json.choices[0].message.content;
         }
       } catch (e) { console.error("Groq failed:", e); }
    }

    if (!aiInsights) {
       // Fallback deterministic
       aiInsights = `• Zone ${stats.most_heavily_used_zone} experiences the highest demand.\n• Consider directing arriving vehicles toward ${stats.underutilized_zone} during peak hours.\n• The current cancellation rate is ${stats.cancellation_rate_pct}%.`;
    }

    return new Response(JSON.stringify({ stats, insights: aiInsights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
