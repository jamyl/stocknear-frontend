import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  const { apiURL, apiKey, user } = locals;

  if (user?.tier !== 'Pro') {
    return new Response(
      JSON.stringify({ error: "This feature is available exclusively for Pro members." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = await request.json();
  const postData = { 'optionsData': data?.optionsData };

  try {
    const upstream = await fetch(apiURL + "/options-insight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(postData),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text();
      console.error("Upstream error:", errText);
      return new Response(errText, { status: upstream.status });
    }

    const decoder = new TextDecoder();
    const upstreamReader = upstream.body.getReader();

    let controllerClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Only enqueue if controller is not closed
            if (!controllerClosed) {
              controller.enqueue(chunk);
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          if (!controllerClosed) {
            controller.error(err);
          }
        } finally {
          if (!controllerClosed) {
            controllerClosed = true;
            controller.close();
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to proxy stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};