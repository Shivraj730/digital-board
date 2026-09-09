const ALLOWED_ORIGIN = "https://shivraj730.github.io";
const API_BASE = "https://vyansmun.gov.np";

const API_PATHS = {
  notices: "/digital-board-api",
  staff: "/staff-api",
  officials: "/elected-officials-api",
  gallery: "/slider-api"
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    const apiName = url.searchParams.get("api");

    if (!apiName || !API_PATHS[apiName]) {
      return new Response(
        JSON.stringify({
          error: "Invalid API",
          available: Object.keys(API_PATHS)
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders()
          }
        }
      );
    }

    try {
      const response = await fetch(
        API_BASE + API_PATHS[apiName],
        {
          headers: {
            "Accept": "application/json"
          }
        }
      );

      const data = await response.text();

      return new Response(data, {
        status: response.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...corsHeaders()
        }
      });

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Drupal API request failed",
          message: error.message
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders()
          }
        }
      );
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
