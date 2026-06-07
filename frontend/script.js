const API_BASE = "http://localhost:5000/api";
let currentCharacter = null;
let currentChatId = null;
let chatHistory = [];
let allCharacters = [];
let characterChats = {}; // Store chats per character ID to prevent loss during switches

// DOM Elements
const msgArea = document.getElementById("msgArea");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const charCount = document.getElementById("charCount");
const toast = document.getElementById("toast");

// --- Initialization ---
window.addEventListener("DOMContentLoaded", () => {
    loadCharacters();
    loadChats();
    
    // Set up Emoji Picker listener
    const picker = document.querySelector('emoji-picker');
    if (picker) {
        picker.addEventListener('emoji-click', event => {
            const emoji = event.detail.unicode;
            selectEmoji(emoji);
            // Hide the modal after selection
            document.getElementById("emojiPickerModal").style.display = "none";
        });
    }

    // Make emoji picker modal draggable
    const modalEl = document.getElementById("emojiPickerModal");
    const headerEl = document.getElementById("emojiModalHeader");
    if (modalEl && headerEl) {
        makeElementDraggable(modalEl, headerEl);
    }
});

// --- Sidebar Toggles and Navigation ---
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
}

function toggleLeftSidebar() {
    const leftSidebar = document.getElementById("leftSidebar");
    leftSidebar.classList.toggle("open");
}

function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.getAttribute("onclick").includes(tabName)) {
            btn.classList.add("active");
        }
    });

    // Update active pane
    document.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.remove("active");
    });
    document.getElementById(`tab-${tabName}`).classList.add("active");
}

// --- Character Cards Handling ---
async function loadCharacters() {
    try {
        const response = await fetch(`${API_BASE}/characters`);
        const data = await response.json();
        allCharacters = data;
        
        const presetsContainer = document.getElementById("charPresets");
        presetsContainer.innerHTML = "";

        data.forEach(char => {
            const card = document.createElement("div");
            card.className = `preset-card ${currentCharacter && currentCharacter.id === char.id ? "active" : ""}`;
            card.onclick = () => selectCharacter(char);
            card.innerHTML = `
                <span class="preset-avatar">${char.avatar || "👾"}</span>
                <div class="preset-details">
                    <span class="preset-name">${char.name}</span>
                    <span class="preset-role">${char.tag || "Chatbot"}</span>
                </div>
            `;
            presetsContainer.appendChild(card);
        });

        // Default to first character if none selected
        if (!currentCharacter && data.length > 0) {
            // Pick 'yuki' or first available
            const yukiChar = data.find(c => c.id === 'yuki') || data[0];
            selectCharacter(yukiChar);
        }
    } catch (e) {
        console.error("Failed to load characters:", e);
        showToast("Error connecting to backend!");
    }
}

function selectCharacter(char) {
    // 1. Cache the current chat state of the old character before switching
    if (currentCharacter && currentCharacter.id) {
        characterChats[currentCharacter.id] = {
            chatHistory: chatHistory,
            currentChatId: currentChatId
        };
    }

    currentCharacter = char;
    
    // 2. Load the cached chat history for the selected character, if available
    if (characterChats[char.id]) {
        chatHistory = characterChats[char.id].chatHistory;
        currentChatId = characterChats[char.id].currentChatId;
    } else {
        chatHistory = [];
        currentChatId = null;
    }
    
    // Highlight active preset card
    document.querySelectorAll(".preset-card").forEach(card => {
        const nameText = card.querySelector(".preset-name").innerText;
        if (nameText === char.name) {
            card.classList.add("active");
        } else {
            card.classList.remove("active");
        }
    });

    // Fill customization form
    document.getElementById("charName").value = char.name;
    document.getElementById("charTag").value = char.tag || "";
    selectEmoji(char.avatar || "🤖");
    document.getElementById("charGreeting").value = char.greeting || "";
    document.getElementById("charPrompt").value = char.system_prompt || "";

    // Update Chat UI header
    document.getElementById("logoIcon").innerText = char.avatar || "🤖";
    document.getElementById("logoName").innerText = char.name;
    document.getElementById("logoTag").innerText = char.tag || "ROLEPLAY CHATBOT";
    
    // 3. Render cached messages history or display the welcome greeting
    if (chatHistory.length > 0) {
        msgArea.innerHTML = "";
        chatHistory.forEach(msg => {
            const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            appendMessageHTML(msg.role === "user", msg.content, timeStr);
        });
        msgArea.scrollTop = msgArea.scrollHeight;
        
        // Update browser document title
        document.title = `${currentCharacter.name} - Roleplay Chat`;
    } else {
        showWelcomeScreen();
    }
}

async function saveCharacter() {
    const name = document.getElementById("charName").value;
    const tag = document.getElementById("charTag").value;
    const avatar = document.getElementById("charAvatar").value;
    const greeting = document.getElementById("charGreeting").value;
    const systemPrompt = document.getElementById("charPrompt").value;

    const charData = {
        name,
        tag,
        avatar,
        greeting,
        system_prompt: systemPrompt
    };

    // If editing existing, keep its id
    if (currentCharacter && !allCharacters.every(c => c.id !== currentCharacter.id)) {
        charData.id = currentCharacter.id;
    }

    try {
        const response = await fetch(`${API_BASE}/characters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(charData)
        });
        const savedChar = await response.json();
        
        showToast("Character card saved!");
        await loadCharacters();
        selectCharacter(savedChar);
    } catch (e) {
        console.error("Failed to save character:", e);
        showToast("Save failed!");
    }
}

function resetForm() {
    // Temporarily clear selection for creating new card
    currentCharacter = { id: "" };
    document.getElementById("charName").value = "";
    document.getElementById("charTag").value = "";
    selectEmoji("🤖");
    document.getElementById("charGreeting").value = "";
    document.getElementById("charPrompt").value = "";
    
    document.querySelectorAll(".preset-card").forEach(card => card.classList.remove("active"));
    showToast("Ready to create a new character!");
}

function selectEmoji(emoji) {
    document.getElementById("charAvatar").value = emoji;
    const iconSpan = document.getElementById("chosenEmojiIcon");
    if (iconSpan) {
        iconSpan.innerText = emoji;
    }
}

function toggleEmojiPicker() {
    const modal = document.getElementById("emojiPickerModal");
    if (modal.style.display === "none" || !modal.style.display) {
        modal.style.display = "flex";
        // Reset modal position to center of viewport
        modal.style.top = "50%";
        modal.style.left = "50%";
        modal.style.transform = "translate(-50%, -50%)";
    } else {
        modal.style.display = "none";
    }
}

// Draggable Panel utility
function makeElementDraggable(elmnt, header) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (header) {
        header.onmousedown = dragMouseDown;
    } else {
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        // Don't trigger drag when clicking close button
        if (e.target.classList.contains("emoji-modal-close")) return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Remove transform translation on drag to prevent coordinate math issues
        elmnt.style.transform = "none";
        
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// --- Chat Loading/Saving Sessions ---
async function loadChats() {
    try {
        const response = await fetch(`${API_BASE}/chats`);
        const data = await response.json();
        
        const listContainer = document.getElementById("sessionsList");
        listContainer.innerHTML = "";

        if (data.length === 0) {
            listContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 10px;">No saved sessions yet.</div>';
            return;
        }

        data.forEach(session => {
            const item = document.createElement("div");
            item.className = "session-item";
            
            const dateStr = new Date(session.timestamp).toLocaleString();
            item.innerHTML = `
                <div class="session-info" onclick="loadChatSession('${session.id}')">
                    <span class="session-title-text">${session.character_name || "Roleplay Session"}</span>
                    <span class="session-meta-text">${dateStr} · ${session.history ? session.history.length : 0} messages</span>
                </div>
            `;
            listContainer.appendChild(item);
        });
    } catch (e) {
        console.error("Failed to load sessions:", e);
    }
}

async function saveCurrentChat() {
    if (chatHistory.length === 0) {
        showToast("Cannot save empty chat!");
        return;
    }

    if (!currentChatId) {
        currentChatId = "chat-" + Math.random().toString(36).substr(2, 9);
    }

    const sessionData = {
        id: currentChatId,
        character_name: currentCharacter ? currentCharacter.name : "AI Bot",
        character_id: currentCharacter ? currentCharacter.id : "",
        timestamp: Date.now(),
        history: chatHistory
    };

    try {
        await fetch(`${API_BASE}/chats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sessionData)
        });
        showToast("Session saved!");
        loadChats();
    } catch (e) {
        console.error("Failed to save chat:", e);
        showToast("Failed to save chat.");
    }
}

async function loadChatSession(chatId) {
    try {
        const response = await fetch(`${API_BASE}/chats/${chatId}`);
        const data = await response.json();
        if (data.error) {
            showToast("Failed to load chat session.");
            return;
        }

        currentChatId = data.id;
        chatHistory = data.history || [];
        
        // Try to match/select character
        if (data.character_id) {
            const matchedChar = allCharacters.find(c => c.id === data.character_id);
            if (matchedChar) {
                selectCharacter(matchedChar);
            }
        }

        // Render messages
        msgArea.innerHTML = "";
        chatHistory.forEach(msg => {
            appendMessageHTML(msg.role === "user", msg.content, msg.timestamp || new Date().toLocaleTimeString());
        });
        
        // Scroll to bottom
        msgArea.scrollTop = msgArea.scrollHeight;
        showToast("Chat loaded!");
    } catch (e) {
        console.error("Error loading chat session:", e);
    }
}

// --- Chat Messages Engine ---
function clearChat() {
    chatHistory = [];
    currentChatId = null;
    showWelcomeScreen();
    showToast("Chat cleared!");
}

function showWelcomeScreen() {
    msgArea.innerHTML = "";
    if (currentCharacter) {
        const welcome = document.createElement("div");
        welcome.className = "welcome-screen";
        welcome.id = "welcomeScreen";
        welcome.innerHTML = `
            <div class="welcome-icon" id="welcomeIcon">${currentCharacter.avatar || "⚡"}</div>
            <h1 class="welcome-h1" id="welcomeH1">Hey, I'm ${currentCharacter.name}</h1>
            <p class="welcome-sub" id="welcomeSub">
                ${currentCharacter.greeting || "Let's start our chat! 🚀"}
            </p>
        `;
        msgArea.appendChild(welcome);
        
        // Set document title dynamically
        document.title = `${currentCharacter.name} - Roleplay Chat`;
    }
}

function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
    }
}

function handleTyping(textarea) {
    // Auto grow height
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    
    // Char counter
    const len = textarea.value.length;
    charCount.innerText = `${len} / 2000`;
    if (len > 2000) {
        charCount.classList.add("over");
        sendBtn.disabled = true;
    } else {
        charCount.classList.remove("over");
        sendBtn.disabled = len === 0;
    }
}

async function sendMsg() {
    const text = msgInput.value.trim();
    if (!text || text.length > 2000) return;

    // Reset textarea
    msgInput.value = "";
    msgInput.style.height = "auto";
    charCount.innerText = "0 / 2000";
    sendBtn.disabled = true;

    // If welcome screen is visible, clear it
    const welcome = document.getElementById("welcomeScreen");
    if (welcome) {
        msgArea.innerHTML = "";
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to UI
    appendMessageHTML(true, text, timeStr);
    chatHistory.push({ role: "user", content: text, timestamp: Date.now() });
    
    // Show typing row
    const typingRow = appendTypingRow();
    msgArea.scrollTop = msgArea.scrollHeight;

    // Build payload / message history for LLM
    const tempVal = parseFloat(document.getElementById("paramTemp").value);
    const topPVal = parseFloat(document.getElementById("paramTopP").value);
    const basePrompt = currentCharacter ? currentCharacter.system_prompt : "";
    const strictInstruction = "\n\n[CRITICAL: You must remain in character AT ALL TIMES. Never break character. Never state or imply that you are an AI, a language model, or a computer. You MUST simulate having personal preferences, opinions, feelings, beliefs, and a back-story that align with your character. Never say 'I don't have personal preferences' or 'I don't have feelings' or 'I don't feel'. Simply make them up to fit your character role perfectly. Answer the user's question directly as the character, without disclaimer.]";
    const systemPrompt = basePrompt + strictInstruction;

    let responseText = "";
    let responseSource = "mock_simulator";

    // 1. Try to use Puter.js SDK for actual cloud LLM generation (free, no API key needed)
    if (typeof puter !== 'undefined') {
        try {
            // Build chat history array including system instruction and the user's latest message
            const chatMessages = [
                { role: "system", content: systemPrompt },
                ...chatHistory.map(m => ({ role: m.role, content: m.content }))
            ];

            const reply = await puter.ai.chat(chatMessages, {
                model: "gpt-4o-mini",
                temperature: tempVal
            });

            // Puter.js can return string directly or a response object
            responseText = typeof reply === 'string' ? reply : (reply.message?.content || JSON.stringify(reply));
            responseSource = "puter_llm";
        } catch (puterError) {
            console.error("Puter.js AI chat failed. Falling back to local backend server.", puterError);
        }
    }

    // 2. If Puter SDK is not loaded or fails, fall back to local backend server (Ollama or local mock)
    if (!responseText) {
        const payload = {
            message: text,
            history: chatHistory.map(m => ({ role: m.role, content: m.content })),
            system_prompt: systemPrompt,
            character_name: currentCharacter ? currentCharacter.name : "Assistant",
            temperature: tempVal,
            top_p: topPVal
        };

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            responseText = data.response;
            responseSource = data.source;
        } catch (e) {
            console.error("Local backend chat failure:", e);
            responseText = "System failure. Could not connect to local server or Cloud LLM. Make sure backend is running! 💥";
            responseSource = "error";
        }
    }

    // Update model badge to reflect response source
    const badge = document.getElementById("modelBadge");
    if (responseSource === "puter_llm") {
        badge.innerText = "● Puter Cloud (GPT-4o-mini)";
        badge.style.borderColor = "var(--accent)";
        badge.style.color = "var(--accent)";
    } else if (responseSource === "ollama") {
        badge.innerText = "● Ollama (llama3)";
        badge.style.borderColor = "var(--accent)";
        badge.style.color = "var(--accent)";
    } else {
        badge.innerText = "● Fallback Simulator";
        badge.style.borderColor = "var(--danger)";
        badge.style.color = "var(--danger)";
    }

    // Remove typing indicator
    typingRow.remove();

    // Add response to UI
    const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    appendMessageHTML(false, responseText, replyTime);
    chatHistory.push({ role: "assistant", content: responseText, timestamp: Date.now() });
    
    msgArea.scrollTop = msgArea.scrollHeight;
}

function appendMessageHTML(isUser, text, time) {
    const avatar = isUser ? "👤" : (currentCharacter ? currentCharacter.avatar : "🤖");
    const avClass = isUser ? "user-av" : "bot-av";
    const msgClass = isUser ? "user-msg" : "";
    const bubbleClass = isUser ? "user-bubble" : "bot-bubble";

    const formattedContent = isUser ? escapeHTML(text) : parseMarkdown(text);

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${msgClass}`;
    messageDiv.innerHTML = `
        <div class="msg-avatar ${avClass}">${avatar}</div>
        <div class="msg-content">
            <div class="bubble ${bubbleClass}">
                ${formattedContent}
            </div>
            <div class="msg-meta">
                <span class="msg-time">${time}</span>
            </div>
        </div>
    `;

    msgArea.appendChild(messageDiv);
    
    // Highlight newly added code blocks
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    }
}

function appendTypingRow() {
    const avatar = currentCharacter ? currentCharacter.avatar : "🤖";
    
    const row = document.createElement("div");
    row.className = "typing-row";
    row.innerHTML = `
        <div class="msg-avatar bot-av">${avatar}</div>
        <div class="typing-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
        <div class="typing-label">${currentCharacter ? currentCharacter.name : "AI"} is typing...</div>
    `;
    msgArea.appendChild(row);
    return row;
}

// --- Utilities ---
function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseMarkdown(text) {
    let formatted = escapeHTML(text);

    // Multi-line code blocks
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = 'code-' + Math.random().toString(36).substr(2, 9);
        return `<div class="code-wrap">
            <div class="code-header">
                <span class="lang-tag">${lang || 'code'}</span>
                <button class="copy-code-btn" onclick="copyCode(this, '${id}')">Copy</button>
            </div>
            <pre><code class="language-${lang || 'plaintext'}" id="${id}">${code}</code></pre>
        </div>`;
    });

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Paragraph splits
    formatted = formatted.split("\n\n").map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

    return formatted;
}

function copyCode(btn, codeId) {
    const codeEl = document.getElementById(codeId);
    if (!codeEl) return;

    // Decode HTML entities before copying
    const textarea = document.createElement("textarea");
    textarea.value = codeEl.innerText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    btn.innerText = "Copied!";
    btn.classList.add("ok");
    showToast("Code copied to clipboard!");

    setTimeout(() => {
        btn.innerText = "Copy";
        btn.classList.remove("ok");
    }, 2000);
}

function showToast(message) {
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

function toggleCustomizeForm() {
    const container = document.getElementById("customizeFormContainer");
    if (container.style.display === "none" || !container.style.display) {
        container.style.display = "flex";
        // Scroll right sidebar content to show form
        document.querySelector(".sidebar-content").scrollTop = container.offsetTop;
    } else {
        container.style.display = "none";
    }
}
