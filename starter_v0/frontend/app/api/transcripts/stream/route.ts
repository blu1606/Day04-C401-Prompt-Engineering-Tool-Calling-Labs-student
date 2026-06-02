import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const responseStream = new ReadableStream({
    start(controller) {
      controller.enqueue("data: {\"message\":\"Stream disabled for cloud compatibility\"}\n\n");
      controller.close();
    }
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

