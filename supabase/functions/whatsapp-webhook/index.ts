const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle GET request for webhook verification
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Webhook verification request:', { mode, token, challenge });

      // Verify token - you can set this to any string you want
      const VERIFY_TOKEN = 'gigwork_webhook_verify_token_2025';
      
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain', ...corsHeaders },
        });
      } else {
        console.error('Webhook verification failed:', { mode, token, expectedToken: VERIFY_TOKEN });
        return new Response('Forbidden', {
          status: 403,
          headers: { 'Content-Type': 'text/plain', ...corsHeaders },
        });
      }
    }

    // Handle POST request for webhook notifications
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('WhatsApp webhook notification received:', JSON.stringify(body, null, 2));

      // Process webhook data here
      // This is where you would handle message status updates, delivery receipts, etc.
      
      // For now, just log and return success
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in whatsapp-webhook function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});