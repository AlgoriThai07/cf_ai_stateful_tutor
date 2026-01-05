import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { QUIZ_GENERATION_PROMPT } from "../prompts";
import { ChatSessionDO } from "../do/ChatSessionDO";

interface Env {
  AI: any;
  QUIZ_RESULTS: KVNamespace;
  CHAT_SESSION: DurableObjectNamespace;
}

interface QuizParams {
  sessionId: string;
}

export class QuizWorkflow extends WorkflowEntrypoint<Env, QuizParams> {
  async run(event: WorkflowEvent<QuizParams>, step: WorkflowStep) {
    const { sessionId } = event.payload;

    // Step 1: Fetch session context
    const context = await step.do("fetch-context", async () => {
        const id = this.env.CHAT_SESSION.idFromName(sessionId);
        const stub = this.env.CHAT_SESSION.get(id);
        // We need to cast the stub to our ChatSessionDO type or use fetch
        // Since we didn't export the type for the stub properly, let's use fetch which is safer across boundaries
        const response = await stub.fetch("http://do/getHistory");
        if (!response.ok) {
            throw new Error("Failed to fetch session history");
        }
        return await response.json() as { messages: any[], summary: string };
    });

    if (!context.messages || context.messages.length === 0) {
        // Handle empty session
         await step.do("save-empty-result", async () => {
             await this.env.QUIZ_RESULTS.put(sessionId, JSON.stringify({ error: "Not enough chat history to generate a quiz." }));
         });
         return;
    }

    // Step 2: Generate Quiz using AI
    const quizResult = await step.do("generate-quiz", async () => {
        // Construct the prompt with context
        const contextString = JSON.stringify(context.messages.slice(-10)); // Use last 10 messages
        const response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
                { role: "system", content: QUIZ_GENERATION_PROMPT },
                { role: "user", content: `Context: ${contextString}` }
            ],
            max_tokens: 2000
        });
        
        // Parse the JSON output from AI (it usually returns a string, we might need to clean it)
        const text = (response as any).response || JSON.stringify(response);
        return text;
    });

    // Step 3: Verify/store result
    await step.do("store-result", async () => {
        // In a real app we'd validate the JSON.
        // We use the event.instanceId or the sessionId as the key? 
        // usage: GET /api/quiz/:jobId -> checks KV. 
        // We will store it under the Workflow Instance ID.
        // wait, the user instructions said "GET /api/quiz/:jobId".
        // The jobId is the Workflow Instance ID. 
        
        let result = quizResult;
        // Attempt to parse to ensure it is valid JSON if possible, if not wrap it
        if (typeof quizResult === 'string') {
             try {
                // Try to parse to see if it is valid, but we mainly want to return the raw string 
                // if it's not valid so the frontend can handle it (or show error).
                // Actually, if we just return the string, the frontend handles parsing.
                JSON.parse(quizResult);
             } catch(e) {
                // If it fails to parse here, just return the raw string. 
                // The frontend has logic to clean/parse it.
                result = quizResult;
             }
        }
        
        await this.env.QUIZ_RESULTS.put(event.instanceId, JSON.stringify(result));
    });

    return { jobId: event.instanceId, status: "completed" };
  }
}
