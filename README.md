# Cloudflare AI Stateful Tutor

A Cloudflare-native AI chat application that functions as a personal tutor. It maintains conversation state across sessions and generates personalized quizzes based on what you've learned.

## Architecture

-   **Frontend**: Cloudflare Pages (Single Page App, Vanilla JS/CSS).
-   **Backend**: Cloudflare Workers (API Gateway).
-   **AI Inference**: Cloudflare Workers AI (Llama 3.3).
-   **State Management**: Cloudflare Durable Objects (`ChatSessionDO`) store chat history and manage context.
-   **Async Tasks**: Cloudflare Workflows (`QuizWorkflow`) generate comprehensive quizzes specifically tailored to the session content without blocking the chat.
-   **Storage**: Cloudflare KV (`QUIZ_RESULTS`) stores the generated quizzes for retrieval.

## Prerequisites

-   Node.js & npm
-   Cloudflare Wrangler CLI (`npm install -g wrangler`)
-   A Cloudflare account with Workers AI enabled.

### How to Run Locally

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    This starts the full local stack (Worker + Static Frontend + AI) on `http://localhost:8787`.

3.  **Open the App**:
    Simply visit **[http://localhost:8787](http://localhost:8787)** in your browser. The frontend is served directly by the Worker.

### How to Deploy

1.  **Login to Cloudflare**:
    ```bash
    npx wrangler login
    ```

2.  **Deploy**:
    ```bash
    npx wrangler deploy
    ```
    This command deploys the Worker, Durable Objects, and uploads the `public/` directory as static assets automatically.

## Memory & Summarization
-   **Storage**: Chat history is stored in the `ChatSessionDO` Durable Object.
-   **Context**: The Durable Object keeps a rolling window of recent messages.
-   **Summarization**: (Architecture designed) When the message count exceeds a threshold (e.g., 50), the system truncates old messages to keep the context window for Llama 3.3 efficient.

## Demo Script

1.  **Start a Chat**: Open the app and ask "Teach me about the main differences between TCP and UDP."
2.  **Verify Memory**: Follow up with "Which one is better for video streaming and why?" (The AI should know you are referring to TCP/UDP).
3.  **Build Context**: Ask a few more questions to fill up the session history.
4.  **Generate Quiz**: Click the **Generate Quiz** button. The button will disable and say "Generating...".
5.  **View Result**: Wait a few seconds for the Workflow to complete. A modal will appear with a JSON quiz based *specifically* on your discussion about networking protocols.
