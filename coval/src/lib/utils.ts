/**
 * Creates a Server-Sent Events (SSE) streaming response for real-time updates
 */
export function createStreamingResponse() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel() {
      // Cleanup if needed
    },
  });

  const sseWriter = {
    /**
     * Send a log message to the client
     */
    sendLog: async (log: string) => {
      const data = JSON.stringify({ log });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    },

    /**
     * Send structured data to the client
     */
    send: async (data: any) => {
      const json = JSON.stringify(data);
      controller.enqueue(encoder.encode(`data: ${json}\n\n`));
    },

    /**
     * Send the done signal
     */
    sendDone: async () => {
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    },

    /**
     * Close the stream
     */
    close: async () => {
      controller.close();
    },
  };

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });

  return { response, sseWriter };
}

