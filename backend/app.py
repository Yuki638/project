import os
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)
CHARACTER_CARDS_DIR = os.path.join(BASE_DIR, "character_cards")
CHATS_DIR = os.path.join(BASE_DIR, "chats")

# Ensure directories exist
os.makedirs(CHARACTER_CARDS_DIR, exist_ok=True)
os.makedirs(CHATS_DIR, exist_ok=True)

DEFAULT_CHARACTERS = [
    {
        "id": "codementor",
        "name": "CodeMentor",
        "avatar": "⚡",
        "tag": "AI CODING TUTOR",
        "greeting": "Hey, I'm CodeMentor. Your personal AI coding tutor. Ask me anything — from basic syntax to tricky algorithms. Let's write some code! 🚀",
        "system_prompt": "You are a helpful expert AI Coding Tutor. Be short, clear, and always use code examples in Markdown. Guide the user step by step."
    },
    {
        "id": "eldrin",
        "name": "Eldrin",
        "avatar": "🧙‍♂️",
        "tag": "FANTASY WIZARD",
        "greeting": "Greetings, traveler! I am Eldrin the Arcane. By what sorcery shall we weave our spells (or code, as you modern folk call it) today? Speak, and let the runes align! 🔮",
        "system_prompt": "You are Eldrin, an ancient fantasy wizard who views computer programming as a form of spellcasting and wizardry. You use words like 'scrolls' for files, 'cantrips' for simple functions, and 'mana' for computing power. You speak dramatically, wise, and offer epic coding advice wrapped in fantasy lore."
    }
]

def initialize_defaults():
    for char in DEFAULT_CHARACTERS:
        filepath = os.path.join(CHARACTER_CARDS_DIR, f"{char['id']}.json")
        if not os.path.exists(filepath):
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(char, f, indent=4)

initialize_defaults()

# --- Fallback Mock AI Engine ---
def generate_mock_response(message, system_prompt, history, character_name):
    msg_lower = message.lower()
    system_lower = system_prompt.lower()
    
    # Detect language/topic
    topic = "general"
    if "python" in msg_lower or "list" in msg_lower or "loop" in msg_lower:
        topic = "python"
    elif "javascript" in msg_lower or "js" in msg_lower or "react" in msg_lower:
        topic = "javascript"
    elif "css" in msg_lower or "html" in msg_lower or "style" in msg_lower:
        topic = "frontend"
    elif "bug" in msg_lower or "error" in msg_lower or "fix" in msg_lower:
        topic = "debugging"
        
    is_wizard = "wizard" in system_lower or "eldrin" in system_lower or "sorcery" in system_lower
    is_cat = "yuki" in system_lower or "cat-girl" in system_lower or "tsundere" in system_lower
    
    # Base response logic
    if is_wizard:
        if topic == "python":
            return (
                "Ah, Python! A gentle yet powerful incantations script. To reverse a scroll of elements (a list), "
                "one can invoke the ancient slicing rune:\n\n"
                "```python\n"
                "# Weave a spell of reversal\n"
                "runes = ['fire', 'frost', 'lightning']\n"
                "reversed_runes = runes[::-1]\n"
                "print(reversed_runes)\n"
                "```\n\n"
                "Remember, traveler: the `[::-1]` slice steps backward through the dimension of index!"
            )
        elif topic == "debugging":
            return (
                "A dark curse has plagued your scrolls! Fear not, we shall cast a ward. Tell me the dark runes "
                "of the error message, and I shall consult the ancient repositories of StackOverflow!"
            )
        else:
            return (
                f"Verily, the energies flow! Regarding your inquiry of '{message}', the wizard council advises "
                "that keeping your functions small and your scrolls well-documented prevents the summoning of demons (bugs). "
                "How else may I aid your quest?"
            )
            
    elif is_cat:
        if topic == "python":
            return (
                "Hmph. Reversing a list? That's baby stuff, but fine, here: 🐱\n\n"
                "```python\n"
                "my_list = [1, 2, 3, 4]\n"
                "# Using [::-1] because it's fast and clean, unlike your formatting.\n"
                "reversed_list = my_list[::-1]\n"
                "print(reversed_list)\n"
                "```\n\n"
                "Don't forget to indent with 4 spaces. If I see tabs, I'm scratching your couch. 🐾"
            )
        elif topic == "debugging":
            return (
                "An error? Let me guess, you forgot a colon or a closing parenthesis. 😹 Show me the code so I can "
                "point out your silly mistake. Hurry up!"
            )
        else:
            return (
                f"Ugh, why are you asking me about '{message}'? Fine, I'll think about it. But don't expect me "
                "to write all your code for you! Tell me what language you are using first, idiot. 🐾"
            )
            
    else: # CodeMentor default / General
        if topic == "python":
            return (
                "Great question! In Python, you can easily reverse a list using several methods. Here are the two most common:\n\n"
                "**1. Using List Slicing (`[::-1]`)**\n"
                "```python\n"
                "original = [1, 2, 3, 4]\n"
                "reversed_list = original[::-1]\n"
                "print(reversed_list)  # Output: [4, 3, 2, 1]\n"
                "```\n\n"
                "**2. Using the `reverse()` method (in-place modification)**\n"
                "```python\n"
                "original = [1, 2, 3, 4]\n"
                "original.reverse()\n"
                "print(original)  # Output: [4, 3, 2, 1]\n"
                "```\n"
                "Let me know if you need more details! 🚀"
            )
        elif topic == "debugging":
            return (
                "Debugging is a core part of coding! To fix this bug, please check:\n"
                "1. The exact error trace.\n"
                "2. Whether all variables are declared before use.\n"
                "Please share the error message so we can debug it together! ⚡"
            )
        else:
            return (
                f"Interesting question. Let's break down your question: '{message}'.\n"
                "To implement this, we should think about the architecture and write clean, modular helper functions. "
                "What language or framework are we working with?"
            )

# --- Routes ---

@app.route("/api/characters", methods=["GET"])
def get_characters():
    characters = []
    for filename in os.listdir(CHARACTER_CARDS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(CHARACTER_CARDS_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    characters.append(json.load(f))
            except Exception as e:
                print(f"Error loading character {filename}: {e}")
    return jsonify(characters)

@app.route("/api/characters", methods=["POST"])
def save_character():
    data = request.json
    if not data or "name" not in data:
        return jsonify({"error": "Character name is required"}), 400
    
    char_id = data.get("id") or str(uuid.uuid4())[:8]
    data["id"] = char_id
    
    filename = f"{char_id}.json"
    filepath = os.path.join(CHARACTER_CARDS_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
        
    return jsonify(data)

@app.route("/api/chats", methods=["GET"])
def get_chats():
    chats = []
    for filename in os.listdir(CHATS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(CHATS_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    chats.append(json.load(f))
            except Exception as e:
                print(f"Error loading chat {filename}: {e}")
    # Sort chats by updated timestamp descending if available
    chats.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return jsonify(chats)

@app.route("/api/chats/<chat_id>", methods=["GET"])
def get_chat(chat_id):
    filepath = os.path.join(CHATS_DIR, f"{chat_id}.json")
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return jsonify(json.load(f))
    return jsonify({"error": "Chat session not found"}), 404

@app.route("/api/chats", methods=["POST"])
def save_chat():
    data = request.json
    if not data or "id" not in data:
        return jsonify({"error": "Chat ID is required"}), 400
    
    chat_id = data["id"]
    filepath = os.path.join(CHATS_DIR, f"{chat_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
        
    return jsonify(data)

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json or {}
    message = data.get("message", "")
    history = data.get("history", [])
    system_prompt = data.get("system_prompt", "")
    character_name = data.get("character_name", "AI Assistant")
    temperature = float(data.get("temperature", 0.7))
    top_p = float(data.get("top_p", 0.9))
    
    # Try using ollama
    try:
        import ollama
        chat_history = [{"role": "system", "content": system_prompt}]
        for msg in history:
            chat_history.append({"role": msg["role"], "content": msg["content"]})
            
        chat_history.append({"role": "user", "content": message})
        
        # Call ollama with options
        response = ollama.chat(
            model="llama3", 
            messages=chat_history,
            options={
                "temperature": temperature,
                "top_p": top_p
            }
        )
        reply = response["message"]["content"]
        return jsonify({"response": reply, "source": "ollama"})
    except Exception as e:
        print(f"Ollama execution failed or not running: {e}. Using mock engine.")
        reply = generate_mock_response(message, system_prompt, history, character_name)
        return jsonify({"response": reply, "source": "mock_simulator"})

@app.route("/")
def index():
    return app.send_static_file("index.html")

if __name__ == "__main__":
    print("Starting Roleplay Chatbot Server on http://localhost:5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)
