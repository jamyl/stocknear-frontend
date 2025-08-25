import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const data = await request.json();
  const { apiURL, apiKey } = locals;

  const tickerList = data?.tickerList

  //promise all for each ticker to get quote data from api
    if (!tickerList || tickerList.length === 0) {
        return new Response(
        JSON.stringify({ error: "No ticker list provided" }),
        { status: 400 }
        );
    }
    const fetchPromises = tickerList.map(async (ticker: string) => {
        const postData = { ticker };
        const response = await fetch(apiURL + "/stock-quote", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": apiKey
            },
            body: JSON.stringify(postData)
        });
        return response.json();
    });
    const results = await Promise.all(fetchPromises);
    return new Response(JSON.stringify(results));
};
