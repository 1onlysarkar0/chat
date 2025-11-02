import json
import logging
import os
import re
from google import genai
from google.genai import types

# This API key is from Gemini Developer API Key, not vertex AI API Key
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "AIzaSyANEUDbBRRPfhyzkixC8vcKVPkmjOWfMYg"))

def generate_chat_response_streaming(message: str, chat_history=None) -> str:
    """Generate a fast, plain-text response using Gemini AI."""
    try:
        # Fast, plain-text system instruction
        system_instruction = (
            "You are SARKAR AI, a helpful assistant. "
        )
        
        # Prepare the conversation context
        contents = []
        
        # Add chat history if provided (reduce context for faster responses)
        if chat_history:
            for msg in chat_history[-100:]:  # Last 5 messages for context
                role = "user" if msg.get('is_user') else "model"
                contents.append(types.Content(role=role, parts=[types.Part(text=msg.get('content', ''))]))
        
        # Add current user message
        contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
        
        # Use non-streaming for simplicity and lower latency
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                max_output_tokens=8000,
                top_p=0.5,
                top_k=10,
            )
        )
        
        # Get the response text directly (plain text)
        full_response = response.text if response.text else ""
        
        if full_response:
            return full_response
        else:
            return "I apologize, but I'm unable to generate a response at the moment. Please try again."
            
    except Exception as e:
        logging.error(f"Gemini API error: {e}")
        return "I'm experiencing technical difficulties right now. Please try again in a moment."

# Keep the original function for backward compatibility
def generate_chat_response(message: str, chat_history=None) -> str:
    """Generate a response using Gemini AI with full HTML formatting support"""
    return generate_chat_response_streaming(message, chat_history)

def format_ai_response(text: str) -> str:
    import re
    # Convert markdown-style code blocks to HTML
    def code_block_replacer(match):
        lang = match.group(1) or 'plaintext'
        code = match.group(2)
        return f'<pre><code class="language-{lang}">{code}</code></pre>'

    text = re.sub(r'```(\w+)?\n(.*?)\n```', code_block_replacer, text, flags=re.DOTALL)

    # Convert inline code with backticks
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)

    # Convert **bold** to <strong>
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)

    # Convert *italic* to <em>
    text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)

    # Split by code blocks so we only wrap non-code in <p>
    parts = re.split(r'(<pre><code.*?>.*?</code></pre>)', text, flags=re.DOTALL)
    for i, part in enumerate(parts):
        if not part.startswith('<pre><code'):
            lines = part.split('\n')
            new_lines = []
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue
                if stripped.startswith('<') and not (stripped.startswith('<ul') or stripped.startswith('<ol')):
                    new_lines.append(stripped)
                else:
                    new_lines.append(f'<p>{stripped}</p>')
            parts[i] = '\n'.join(new_lines)
    return ''.join(parts)

def generate_chat_title(first_message: str) -> str:
    """Generate a short title for a chat based on the first message"""
    try:
        prompt = f"Generate a short, descriptive title (max 5 words) for a chat that starts with: '{first_message[:100]}'"
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=20,
            )
        )
        
        if response.text:
            title = response.text.strip().strip('"\'')
            return title[:50]  # Limit title length
        else:
            return "New Chat"
            
    except Exception as e:
        logging.error(f"Error generating chat title: {e}")
        return "New Chat"
