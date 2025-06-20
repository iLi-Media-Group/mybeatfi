import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const resendApiKey = Deno.env.get('RESEND_API_KEY');
const siteUrl = Deno.env.get('PUBLIC_SITE_URL');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  try {
    const { producerName, producerEmail, primaryGenre } = await req.json();

    const emailBody = `
      <p>Hi ${producerName},</p>
      <p>Congratulations! You've been approved for the MyBeatFi Sync producer roster based on your application.</p>
      <p><strong>Next Steps:</strong>  
      You're currently in our onboarding queue. We will notify you as soon as a new onboarding phase opens, or if we urgently need more music in your genre (<strong>${primaryGenre}</strong>).</p>
      <p>Stay tuned for further updates.</p>
      <hr/>
      <p>If you have questions, you can <a href="${siteUrl}/contact">contact our team here</a>.</p>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MyBeatFi Sync <noreply@yourdomain.com>",
        to: producerEmail,
        subject: `You're Approved! Next Steps for Joining MyBeatFi Sync`,
        html: emailBody,
      }),
    });

    if (!resendRes.ok) throw new Error('Failed to send producer approval email');

    return new Response(JSON.stringify({ message: 'Producer email sent successfully' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    });
  }
});
