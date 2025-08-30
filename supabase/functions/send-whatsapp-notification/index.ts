const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface WhatsAppNotificationRequest {
  manufacturerPhone: string;
  workerName: string;
  jobTitle: string;
  applicationMessage?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: WhatsAppNotificationRequest = await req.json();
    const { manufacturerPhone, workerName, jobTitle, applicationMessage } = requestBody;

    console.log('WhatsApp notification request received:', {
      manufacturerPhone: manufacturerPhone?.substring(0, 5) + '***', // Log partial phone for privacy
      workerName,
      jobTitle,
      hasMessage: !!applicationMessage
    });

    // Validate required fields
    if (!manufacturerPhone || !workerName || !jobTitle) {
      console.error('Missing required fields:', { manufacturerPhone: !!manufacturerPhone, workerName: !!workerName, jobTitle: !!jobTitle });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: manufacturerPhone, workerName, or jobTitle' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Format phone number - ensure it has country code and remove any spaces/special chars
    let formattedPhone = manufacturerPhone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Add +91 if no country code present
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('91')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        formattedPhone = '+91' + formattedPhone;
      }
    }

    console.log('Formatted phone number:', formattedPhone.substring(0, 5) + '***');

    // Prepare WhatsApp message
    const message = `🔔 *New Job Application Alert!*

👤 *Worker:* ${workerName}
📋 *Job:* ${jobTitle}
💬 *Message:* ${applicationMessage || 'No additional message provided'}

Please check your GigWork dashboard to review this application and contact the worker directly.

---
*GigWork Platform*`;

    // Check if WhatsApp token is available
    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '827674170422720';

    if (!whatsappToken) {
      console.warn('WhatsApp API token not configured - running in demo mode');
      
      // Return success in demo mode but log the message that would be sent
      console.log('Demo mode - WhatsApp message that would be sent:', {
        to: formattedPhone,
        message: message
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Notification processed successfully (demo mode - WhatsApp not configured)',
        demo: true,
        formattedPhone: formattedPhone.substring(0, 5) + '***',
        messagePreview: message.substring(0, 100) + '...'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Send WhatsApp message using Cloud API
    console.log('Attempting to send WhatsApp message via Cloud API...');
    
    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: message
      }
    };

    console.log('WhatsApp API payload:', {
      ...whatsappPayload,
      to: formattedPhone.substring(0, 5) + '***'
    });

    const whatsappResponse = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload),
    });

    const responseText = await whatsappResponse.text();
    console.log('WhatsApp API response status:', whatsappResponse.status);
    console.log('WhatsApp API response:', responseText);

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', {
        status: whatsappResponse.status,
        statusText: whatsappResponse.statusText,
        response: responseText
      });

      // Return detailed error information
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'WhatsApp API error',
        status: whatsappResponse.status,
        details: responseText,
        formattedPhone: formattedPhone.substring(0, 5) + '***'
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let whatsappData;
    try {
      whatsappData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse WhatsApp response:', parseError);
      whatsappData = { raw: responseText };
    }

    console.log('WhatsApp message sent successfully:', whatsappData);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'WhatsApp notification sent successfully',
      messageId: whatsappData?.messages?.[0]?.id,
      formattedPhone: formattedPhone.substring(0, 5) + '***'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-whatsapp-notification function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      message: error.message,
      demo: !Deno.env.get('WHATSAPP_API_TOKEN')
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});