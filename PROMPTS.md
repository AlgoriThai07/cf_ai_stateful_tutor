# PROMPTS.md

## 1. Initial User Instruction (The Prompt Used to Generate This Project)
Optional Assignment: See instructions below for Cloudflare AI app assignment. SUBMIT GitHub repo URL for the AI project here. (Please do not submit irrelevant repositories.) Optional Assignment Instructions: We plan to fast track review of candidates who complete an assignment to build a type of AI-powered application on Cloudflare. An AI-powered application should include the following components: LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice Workflow / coordination (recommend using Workflows, Workers or Durable Objects) User input via chat or voice (recommend using Pages or Realtime) Memory or state Find additional documentation here. IMPORTANT NOTE: To be considered, your repository name must be prefixed with cf_ai_, must include a README.md file with project documentation and clear running instructions to try out components (either locally or via deployed link). AI-assisted coding is encouraged, but you must include AI prompts used in PROMPTS.md All work must be original; copying from other submissions is strictly prohibited. 
What are the requirements and what should I build?

------------------------------------------------------

You are my senior Cloudflare engineer. Build an ORIGINAL AI-powered app on Cloudflare and generate the full codebase + docs.

GOAL
Create a repo named: cf_ai_stateful_tutor
A Cloudflare-native AI chat web app that:
1) Uses an LLM: Cloudflare Workers AI (Llama 3.3 recommended).
2) Uses workflow/coordination: Cloudflare Workflows for a multi-step “Quiz Generator” job (and optionally Durable Objects for session coordination).
3) Accepts user input via chat UI: Cloudflare Pages (frontend) + Worker API backend. Responses should stream if feasible (SSE or fetch streaming).
4) Has memory/state: Durable Objects store per-session conversation history + a rolling summary (so memory doesn’t grow unbounded). Responses must reference prior context.
5) Includes README.md with clear running instructions (local + deploy).
6) Includes PROMPTS.md with ALL AI prompts used to build this project (include prompts for generating code, architecture, and in-app system prompts). AI-assisted coding is encouraged, but PROMPTS.md is required.

FUNCTIONAL REQUIREMENTS
- Frontend (Cloudflare Pages):
  - Simple chat UI with message list, input box, send button.
  - “New session” button (creates a new sessionId).
  - “Generate Quiz” button that triggers a workflow job using current session memory.
  - A “Jobs” panel showing quiz job status and result when ready.
- Backend (Cloudflare Worker):
  - Endpoint: POST /api/chat { sessionId, message } -> returns streamed or normal response.
  - Endpoint: POST /api/quiz { sessionId } -> triggers Cloudflare Workflow; returns { jobId }.
  - Endpoint: GET /api/quiz/:jobId -> returns { status, result }.
  - Durable Object: ChatSessionDO
    - Stores messages (bounded) + rolling summary + user preferences.
    - Exposes methods for: addUserMessage, addAssistantMessage, getContext(), updateSummary().
    - Summarization happens when message count exceeds a threshold.
  - Workers AI:
    - Use Llama 3.3 (or closest available on Workers AI) for chat and summarization.
    - Use a strong system prompt that makes the assistant act as a concise tutor.
- Workflow:
  - Name: QuizWorkflow
  - Steps:
    1) Fetch session context from DO
    2) Generate 8–10 question quiz (mix MCQ + short answer) from context
    3) Generate answer key + brief explanations
    4) Store result with jobId so GET /api/quiz/:jobId can retrieve it
  - Keep workflow outputs deterministic enough for demo (temperature low).

TECH / STACK
- Use Cloudflare Wrangler.
- Use TypeScript for Worker, DO, Workflow.
- Use a minimal frontend (vanilla JS + HTML/CSS) or a lightweight framework; prefer simplest that works with Pages.
- Use Cloudflare KV or D1 only if needed. Prefer Durable Objects for memory; store workflow results in KV (jobId -> result) or in a separate DO.
- Provide wrangler.toml with correct bindings for AI, Durable Objects, Workflows, and KV (if used).
- Provide package.json scripts: dev, deploy, format, lint (keep tooling minimal).
- Include .gitignore.

DELIVERABLES
Output the complete repository structure and provide the content of each file.
At minimum include:
- README.md
- PROMPTS.md
- wrangler.toml
- worker/src/index.ts (routes)
- worker/src/do/ChatSessionDO.ts
- worker/src/prompts.ts (system prompts + templates)
- worker/src/workflows/QuizWorkflow.ts
- pages/ (frontend) with index.html, app.js, styles.css
- Any types/utils needed

README MUST INCLUDE
- What it does (1 paragraph)
- Architecture (bullets)
- How to run locally (exact commands)
- How to deploy (exact commands)
- How to test quickly (example prompts)
- Where memory is stored and how summarization works

PROMPTS.MD MUST INCLUDE
- The exact system prompt used in the app
- The summarization prompt
- The quiz generation prompt
- The prompts I used to ask Copilot to generate code (include this entire instruction as the first entry)
- Any follow-up prompts you used

CONSTRAINTS / QUALITY BAR
- The code must be original and not copied from other repos.
- Make it production-ish: validation, error handling, clean structure.
- Keep it small and reviewable.
- Use environment bindings correctly and keep secrets out of repo.
- If streaming is hard, implement non-streaming but keep endpoints stable.
- Include a short “Demo script” section in README with 5 steps to show off memory + workflow.

Now generate the full repo.

------------------------------------------------------

What are some technical problems may occur in this app? How to fix them?

------------------------------------------------------

Fix the first problem according to your plan.
Fix the second problem by no streaming but return the json text and store it immediately.

------------------------------------------------------

The generated quiz output is currently in the form of a json object. Create an interactive UI for it.
------------------------------------------------------

Error parsing quiz: Unterminated string in JSON at position 880 (line 32 column 23). Investigate the cause and give me a fix plan.
------------------------------------------------------

The markdown answer from the chatbot is currently not rendered correctly. Investigate the cause and give me a fix plan.
------------------------------------------------------
Here are the solutions to the 3 AP Calculus BC questions:

Find the derivative: If f(x) = 3x^2 sin(x), find f'(x).
Using the product rule, which states that if f(x) = u(x)v(x), then f'(x) = u'(x)v(x) + u(x)v'(x), we can find the derivative of f(x).

Let u(x) = 3x^2 and v(x) = sin(x). Then, u'(x) = 6x and v'(x) = cos(x).

f'(x) = u'(x)v(x) + u(x)v'(x) = (6x)sin(x) + (3x^2)cos(x) = 6x sin(x) + 3x^2 cos(x)

So, f'(x) = 6x sin(x) + 3x^2 cos(x).

Evaluate the integral: Evaluate the definite integral ∫(2x^3 + 5x^2) dx from x = 0 to x = 2.
To evaluate the integral, we can use the power rule of integration, which states that ∫x^n dx =

why the chatbot answer suddenly stop? Is this because of the token limit? If so, how to fix it?

------------------------------------------------------


## 2. In-App System Prompts

### Chat System Prompt
Used in `src/prompts.ts` for the main chat interaction:
```text
You are a helpful and clear AI Tutor.
Your goal is to help the user learn by answering their questions concisely and accurately.
You should adjust your explanations based on the user's apparent knowledge level.
If the user asks for a quiz, encourage them to use the "Generate Quiz" button, but you can also quiz them informally in chat.
Always maintain a helpful, encouraging tone.
```

### Quiz Generation Prompt
Used in `src/workflows/QuizWorkflow.ts` to generate structured JSON quizzes:
```text
Based on the following conversation context, generate a quiz with 8-10 questions.
The questions should specific to what the user has been learning about.
Mix multiple choice (MCQ) and short answer questions.
Return the output EXACTLY as a JSON object with this structure:
{
  "title": "Quiz Title",
  "questions": [
    { "id": 1, "type": "mcq", "question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..." },
    { "id": 2, "type": "short_answer", "question": "...", "answer": "Key phrase", "explanation": "..." }
  ]
}
```

## 3. Summarization Strategy (Implicit)
While we did not implement a separate "Summarizer" worker call for this MVP (using a sliding window instead), the strategy designed was:
```text
You are an expert summarizer. 
Your goal is to condense the conversation history into a concise summary that retains key facts, user preferences, and the current topic of study.
Discard trivial pleasantries.
```
