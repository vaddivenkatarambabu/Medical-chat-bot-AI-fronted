import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const backendUrl = process.env.BACKEND_URL;

        if (!backendUrl) {
          return new Response(
            JSON.stringify({
              error: "Missing BACKEND_URL",
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const guestSessionId =
            request.headers.get("x-guest-session-id") ?? "";

          const body = await request.json();

          const response = await fetch(`${backendUrl.replace(/\/$/, "")}/get`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authHeader
                ? {
                    Authorization: authHeader,
                  }
                : {}),
              ...(guestSessionId
                ? {
                    "X-Guest-Session-Id": guestSessionId,
                  }
                : {}),
            },
            body: JSON.stringify({
              message: body?.message ?? body?.input ?? body?.prompt ?? "",
              conversation_id: body?.conversation_id ?? body?.conversationId,
              client_message_id:
                body?.client_message_id ?? body?.clientMessageId,
              guest_session_id:
                body?.guest_session_id ??
                body?.guestSessionId ??
                guestSessionId,
            }),
          });

          const text = await response.text();

          return new Response(text, {
            status: response.status,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }
      },
    },
  },
});
