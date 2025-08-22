import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const { apiURL, apiKey, user } = locals;

  let output = []
  if (user?.tier === 'Pro') {

  
  const data = await request.json();

  const postData = {'optionsData': data?.optionsData}
   const response = await fetch(apiURL + "/options-insight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(postData),

    });

     output = await response.json() || [];

    }

  return new Response(JSON.stringify(output));
};
