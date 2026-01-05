
import { SYSTEM_PROMPT } from "./prompts";
import { ChatSessionDO } from "./do/ChatSessionDO";
import { QuizWorkflow } from "./workflows/QuizWorkflow";


interface Env {
  AI: any;
  CHAT_SESSION: DurableObjectNamespace;
  QUIZ_WORKFLOW: Workflow;
  QUIZ_RESULTS: KVNamespace;
  ASSETS: Fetcher;
}

export { ChatSessionDO, QuizWorkflow };


export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Try serving API routes first
    if (url.pathname.startsWith("/api")) {
        try {
          if (request.method === "POST" && url.pathname === "/api/chat") {
            const body = await request.json() as { sessionId: string; message: string };
            if (!body.sessionId || !body.message) {
              return new Response("Missing sessionId or message", { status: 400, headers: corsHeaders });
            }
    
            // Use idFromName because client uses randomUUID() which is not a 64-char hex ID
            const id = env.CHAT_SESSION.idFromName(body.sessionId);
            const stub = env.CHAT_SESSION.get(id);
    
            await stub.fetch("http://do/addMessage", {
              method: "POST",
              body: JSON.stringify({ role: "user", content: body.message }),
            });
    
            const historyRes = await stub.fetch("http://do/getHistory");
            const history = await historyRes.json() as { messages: any[] };
    
            const messages = [
                { role: "system", content: SYSTEM_PROMPT },
                ...history.messages.slice(-10)
            ];
    
            const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
                messages,
                max_tokens: 2000
            });
    
            const assistantText = aiResponse.response || JSON.stringify(aiResponse);
            
            await stub.fetch("http://do/addMessage", {
                 method: "POST",
                 body: JSON.stringify({ role: "assistant", content: assistantText }),
            });
    
            return Response.json({ response: assistantText }, { headers: corsHeaders });
          }
    
          if (request.method === "POST" && url.pathname === "/api/quiz") {
            const body = await request.json() as { sessionId: string };
            if (!body.sessionId) {
                 return new Response("Missing sessionId", { status: 400, headers: corsHeaders });
            }
    
            const instance = await env.QUIZ_WORKFLOW.create({
                params: { sessionId: body.sessionId }
            });
    
            return Response.json({ jobId: instance.id }, { headers: corsHeaders });
          }
    
          if (request.method === "GET" && url.pathname.startsWith("/api/quiz/")) {
            const jobId = url.pathname.split("/").pop();
            if (!jobId) return new Response("Missing Job ID", { status: 400, headers: corsHeaders });
    
            const result = await env.QUIZ_RESULTS.get(jobId);
            
            if (!result) {
                return Response.json({ status: "pending" }, { headers: corsHeaders });
            }
    
            return Response.json({ status: "completed", result: JSON.parse(result) }, { headers: corsHeaders });
          }
          
          return new Response("Not Found", { status: 404, headers: corsHeaders });

        } catch (e: any) {
             return new Response(e.message, { status: 500, headers: corsHeaders });
        }
    }

    // Serve static assets
    if (env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
           // Fallback to index.html for SPA
           return await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
        }
        return response;
      } catch (e) {
        // Unexpected error
      }
    }
    return new Response("Not Found", { status: 404 });
  },
};
