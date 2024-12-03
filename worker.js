export default {
  async fetch(request, env, ctx) {
    // CORS configuration
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method Not Allowed' 
      }), { 
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    try {
      // Parse request JSON
      const payload = await request.json();
      const { commitmentCapacity, region } = payload;

      // Pricing data structure
      const PRICE_DATA = {
        regions: {
          'us-east-1': {
            baseRate: 0.08,
            volumeDiscounts: [
              { threshold: 100, discountRate: 0.07 },
              { threshold: 500, discountRate: 0.06 },
              { threshold: 1000, discountRate: 0.05 }
            ]
          },
          'us-west-2': {
            baseRate: 0.09,
            volumeDiscounts: [
              { threshold: 100, discountRate: 0.08 },
              { threshold: 500, discountRate: 0.07 },
              { threshold: 1000, discountRate: 0.06 }
            ]
          },
          'eu-west-1': {
            baseRate: 0.10,
            volumeDiscounts: [
              { threshold: 100, discountRate: 0.09 },
              { threshold: 500, discountRate: 0.08 },
              { threshold: 1000, discountRate: 0.07 }
            ]
          }
        }
      };

      // Validate inputs
      if (!commitmentCapacity || typeof commitmentCapacity !== 'number' || commitmentCapacity <= 0) {
        return new Response(JSON.stringify({ 
          error: 'Invalid commitment capacity. Must be a positive number.' 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Check region support
      if (!PRICE_DATA.regions[region]) {
        return new Response(JSON.stringify({ 
          error: `Unsupported region: ${region}. Supported regions are: ${Object.keys(PRICE_DATA.regions).join(', ')}` 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Price estimation logic
      const regionData = PRICE_DATA.regions[region];
      let finalRate = regionData.baseRate;

      // Apply volume discounts
      for (const discount of regionData.volumeDiscounts) {
        if (commitmentCapacity >= discount.threshold) {
          finalRate = discount.discountRate;
        } else {
          break;
        }
      }

      // Prepare response
      const result = {
        region: region,
        commitmentCapacity: commitmentCapacity,
        pricePerMbps: finalRate,
        estimatedTotalCost: Number((finalRate * commitmentCapacity).toFixed(2))
      };

      // Return JSON response
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      // Handle any parsing or unexpected errors
      return new Response(JSON.stringify({ 
        error: 'Invalid request: ' + error.message 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};
