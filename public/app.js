const API_URL = "http://127.0.0.1:8787/api"; // Dev URL

// State
let sessionId = localStorage.getItem("sessionId");
if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("sessionId", sessionId);
}

// Elements
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const newSessionBtn = document.getElementById("new-session-btn");
const quizBtn = document.getElementById("generate-quiz-btn");
const quizPanel = document.getElementById("quiz-panel");
const quizRenderArea = document.getElementById("quiz-render-area");
const closeQuizBtn = document.getElementById("close-quiz-btn");

// Initialization
console.log("Current Session:", sessionId);

// Event Listeners
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

newSessionBtn.addEventListener("click", () => {
    if (confirm("Start new session? This will clear history.")) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("sessionId", sessionId);
        messagesDiv.innerHTML = '<div class="message system">Session reset.</div>';
        console.log("New Session:", sessionId);
    }
});

quizBtn.addEventListener("click", async () => {
    // 1. Trigger Quiz
    quizBtn.disabled = true;
    quizBtn.innerText = "Generating...";
    
    try {
        const res = await fetch(`${API_URL}/quiz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId })
        });
        
        if (!res.ok) throw new Error("Failed to start quiz");
        
        const { jobId } = await res.json();
        console.log("Quiz Job Started:", jobId);
        
        // 2. Poll for results
        pollQuizStatus(jobId);
        
    } catch (err) {
        alert("Error starting quiz: " + err.message);
        quizBtn.disabled = false;
        quizBtn.innerText = "Generate Quiz";
    }
});

closeQuizBtn.addEventListener("click", () => {
    quizPanel.classList.add("hidden");
});

// Functions
async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
    // Add user message to UI
    appendMessage("user", text);
    input.value = "";
    input.disabled = true;
    
    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, message: text })
        });
        
        if (!res.ok) {
            throw new Error("API Error: " + res.statusText);
        }
        
        const data = await res.json();
        appendMessage("assistant", data.response);
        
    } catch (err) {
        appendMessage("system", "Error: " + err.message);
    } finally {
        input.disabled = false;
        input.focus();
    }
}

function appendMessage(role, text) {
    const div = document.createElement("div");
    div.classList.add("message", role);
    // div.textContent = text; // Safe text
    div.innerHTML = marked.parse(text); // Render Markdown
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Polling Logic
async function pollQuizStatus(jobId) {
    let attempts = 0;
    const maxAttempts = 30; // 30s timeout approx if 1s interval
    
    const interval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(interval);
            quizBtn.disabled = false;
            quizBtn.innerText = "Generate Quiz";
            alert("Quiz generation timed out.");
            return;
        }
        
        try {
            const res = await fetch(`${API_URL}/quiz/${jobId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === "completed") {
                    clearInterval(interval);
                    showQuiz(data.result);
                }
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }, 1000);
}



function showQuiz(result) {
    quizBtn.disabled = false;
    quizBtn.innerText = "Generate Quiz";
    quizRenderArea.innerHTML = ""; // Clear previous
    quizPanel.classList.remove("hidden");

    let data = result;
    if (typeof result === 'string') {
        // Clean markdown code blocks if present (case insensitive, various formats)
        let cleanResult = result.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        try {
            data = JSON.parse(cleanResult);
        } catch(e) {
            console.error("JSON Parse Error:", e, cleanResult);
            quizRenderArea.innerHTML = `<div class="message system">Error parsing quiz: ${e.message}</div><pre>${cleanResult}</pre>`;
            return;
        }
    }

    if (!data.questions || !Array.isArray(data.questions)) {
         quizRenderArea.innerHTML = `<div class="message system">Error: Result does not contain 'questions' array.</div><pre>${JSON.stringify(data, null, 2)}</pre>`;
         return;
    }


    // Title
    const title = document.createElement("h2");
    title.className = "quiz-title";
    title.textContent = data.title || "Your Quiz";
    quizRenderArea.appendChild(title);

    // Questions
    if (Array.isArray(data.questions)) {
        data.questions.forEach((q, index) => {
            const card = document.createElement("div");
            card.className = "quiz-card";

            const questionText = document.createElement("div");
            questionText.className = "quiz-question";
            questionText.textContent = `${index + 1}. ${q.question}`;
            card.appendChild(questionText);

            const feedback = document.createElement("div");
            feedback.className = "quiz-feedback";

            if (q.type === "mcq" && q.options) {
                const optionsDiv = document.createElement("div");
                optionsDiv.className = "quiz-options";

                q.options.forEach(opt => {
                    const label = document.createElement("label");
                    label.className = "quiz-option";
                    
                    const radio = document.createElement("input");
                    radio.type = "radio";
                    radio.name = `q-${q.id}`;
                    radio.value = opt;
                    
                    label.appendChild(radio);
                    label.appendChild(document.createTextNode(opt));
                    
                    // Interaction
                    label.addEventListener("click", () => {
                        // Reset styles
                        optionsDiv.querySelectorAll(".quiz-option").forEach(el => el.classList.remove("selected"));
                        label.classList.add("selected");
                        radio.checked = true;

                        // Check answer
                        const isCorrect = opt.trim().charAt(0).toLowerCase() === q.answer.trim().charAt(0).toLowerCase() || opt === q.answer;
                        
                        feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
                        feedback.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong> ${q.explanation || ''}`;
                    });

                    optionsDiv.appendChild(label);
                });
                card.appendChild(optionsDiv);

            } else {
                // Short answer
                const group = document.createElement("div");
                group.className = "quiz-input-group";
                
                const input = document.createElement("input");
                input.placeholder = "Type your answer...";
                
                const checkBtn = document.createElement("button");
                checkBtn.className = "quiz-check-btn";
                checkBtn.textContent = "Check";
                
                checkBtn.addEventListener("click", () => {
                     const val = input.value.trim();
                     if (!val) return;
                     
                     // Simple loose comparison
                     const isCorrect = val.toLowerCase().includes(q.answer.toLowerCase()) || q.answer.toLowerCase().includes(val.toLowerCase());
                     
                     feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
                     feedback.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong> <br>Answer: ${q.answer}<br>${q.explanation || ''}`;
                });
                
                group.appendChild(input);
                group.appendChild(checkBtn);
                card.appendChild(group);
            }

            card.appendChild(feedback);
            quizRenderArea.appendChild(card);
        });
    }
}
