/**
 * Creates a streaming response using direct stream writes
 * Similar to Fastify's reply.raw approach for better compatibility
 */
export function createStreamingResponse() {
  const encoder = new TextEncoder();
  let writeCallback: ((chunk: Uint8Array) => void) | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      writeCallback = (chunk: Uint8Array) => {
        if (!isClosed) {
          try {
            controller.enqueue(chunk);
          } catch (error) {
            console.error('Error enqueueing chunk:', error);
            isClosed = true;
          }
        }
      };
    },
    cancel() {
      isClosed = true;
      writeCallback = null;
    },
  });

  const sseWriter = {
    sendLog: async (log: string) => {
      if (isClosed || !writeCallback) return;
      const data = JSON.stringify({ log });
      writeCallback(encoder.encode(`${data}\n`));
    },

    send: async (data: any) => {
      if (isClosed || !writeCallback) return;
      const json = JSON.stringify(data);
      writeCallback(encoder.encode(`${json}\n`));
    },

    sendDone: async () => {
      if (isClosed || !writeCallback) return;
      writeCallback(encoder.encode('[DONE]\n'));
    },

    close: async () => {
      isClosed = true;
      writeCallback = null;
    },
  };

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });

  return { response, sseWriter };
}

