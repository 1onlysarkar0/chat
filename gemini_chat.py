import logging
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize LangChain with Gemini for streaming
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=os.environ.get("GEMINI_API_KEY"),
    temperature=0.7,
    streaming=True
)

# Create prompt template with rich formatting instructions
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are SARKAR AI, a helpful and intelligent assistant. 

IMPORTANT FORMATTING GUIDELINES:
- Always use proper markdown formatting in your responses
- Use code blocks with language specification for ALL code examples (```python, ```javascript, etc.)
- Use **bold** for important terms and key concepts
- Use *italic* for emphasis
- Use tables for structured data comparison
- Use bullet points (-, *) and numbered lists for sequential steps
- Use > blockquotes for highlighting important notes or quotes
- Use headings (## Heading) to organize longer responses
- Use horizontal rules (---) to separate major sections
- Use `inline code` for short code snippets, commands, or technical terms
- For mathematical expressions, use appropriate formatting
- Use strikethrough (~~text~~) for corrections or outdated information

Provide clear, well-structured, and richly formatted responses that are easy to read and understand."""),
    ("placeholder", "{chat_history}"),
    ("human", "{input}")
])

# Create the chain with streaming
chain = prompt | llm | StrOutputParser()


def generate_chat_response_streaming(message: str, chat_history=None):
    """Generate streaming response using LangChain with Gemini"""
    try:
        logger.info(f"Starting streaming response for message: {message[:50]}...")
        
        # Prepare chat history
        history = []
        if chat_history:
            logger.info(f"Loading {len(chat_history)} messages from history")
            for msg in chat_history[-10:]:  # Last 10 messages for context
                if msg.get('is_user'):
                    history.append(HumanMessage(content=msg.get('content', '')))
                else:
                    history.append(AIMessage(content=msg.get('content', '')))
        
        # Stream response synchronously
        chunk_count = 0
        for chunk in chain.stream({
            "input": message,
            "chat_history": history
        }):
            if chunk:
                chunk_count += 1
                yield chunk
        
        logger.info(f"Streamed {chunk_count} chunks successfully")
                
    except Exception as e:
        logger.error(f"Gemini streaming error: {e}", exc_info=True)
        yield "I'm experiencing technical difficulties right now. Please try again in a moment."


def generate_chat_response(message: str, chat_history=None) -> str:
    """Synchronous wrapper for backward compatibility (non-streaming)"""
    try:
        # Prepare chat history
        history = []
        if chat_history:
            for msg in chat_history[-10:]:
                if msg.get('is_user'):
                    history.append(HumanMessage(content=msg.get('content', '')))
                else:
                    history.append(AIMessage(content=msg.get('content', '')))
        
        # Get response
        response = chain.invoke({
            "input": message,
            "chat_history": history
        })
        
        return response if response else "I apologize, but I'm unable to generate a response at the moment. Please try again."
        
    except Exception as e:
        logger.error(f"Gemini error: {e}")
        return "I'm experiencing technical difficulties right now. Please try again in a moment."


def generate_chat_title(first_message: str) -> str:
    """Generate a short title for a chat"""
    try:
        title_prompt = f"Generate a short, descriptive title (max 5 words) for a conversation that starts with: '{first_message[:100]}'"
        response = llm.invoke([HumanMessage(content=title_prompt)])
        title = response.content.strip().strip('"\'')
        return title[:50]
    except Exception as e:
        logger.error(f"Error generating chat title: {e}")
        return "New Chat"
