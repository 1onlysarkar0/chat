from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, Response, stream_with_context
import json
import asyncio
import logging
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
from models import User, Chat, Message, PasswordResetToken
from gemini_chat import generate_chat_response, generate_chat_response_streaming, generate_chat_title
from email_service import send_password_reset_email
from datetime import datetime

logger = logging.getLogger(__name__)

main_routes = Blueprint('main_routes', __name__)

@main_routes.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main_routes.chat'))
    return redirect(url_for('main_routes.auth'))

@main_routes.route('/auth')
def auth():
    if current_user.is_authenticated:
        return redirect(url_for('main_routes.chat'))
    return render_template('auth.html')

@main_routes.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    
    if not username or not password:
        flash('Please provide both username and password.', 'error')
        return redirect(url_for('main_routes.auth'))
    
    # Check if it's email or username
    user = User.query.filter(
        (User.username == username) | (User.email == username)
    ).first()
    
    if user and user.password_hash and check_password_hash(user.password_hash, password):
        login_user(user)
        flash(f'Welcome back, {user.get_display_name()}!', 'success')
        return redirect(url_for('main_routes.chat'))
    else:
        flash('Invalid username/email or password.', 'error')
        return redirect(url_for('main_routes.auth'))

@main_routes.route('/register')
def register_page():
    if current_user.is_authenticated:
        return redirect(url_for('main_routes.chat'))
    return render_template('register.html')

@main_routes.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')
    display_name = request.form.get('name', '')
    
    # Validation
    if not all([username, email, password, confirm_password]):
        flash('All fields are required.', 'error')
        return redirect(url_for('main_routes.register_page'))
    
    if password != confirm_password:
        flash('Passwords do not match.', 'error')
        return redirect(url_for('main_routes.register_page'))
    
    if password and len(password) < 6:
        flash('Password must be at least 6 characters long.', 'error')
        return redirect(url_for('main_routes.register_page'))
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        flash('Username already exists. Please choose a different one.', 'error')
        return redirect(url_for('main_routes.register_page'))
    
    if User.query.filter_by(email=email).first():
        flash('Email already registered. Please use a different email.', 'error')
        return redirect(url_for('main_routes.register_page'))
    
    # Create new user
    password_hash = generate_password_hash(password) if password else None
    user = User()
    user.username = username
    user.email = email
    user.password_hash = password_hash
    user.display_name = display_name if display_name else username
    
    try:
        db.session.add(user)
        db.session.commit()
        login_user(user)
        flash(f'Welcome to SARKAR AI, {user.get_display_name()}!', 'success')
        return redirect(url_for('main_routes.chat'))
    except Exception as e:
        db.session.rollback()
        flash('Registration failed. Please try again.', 'error')
        return redirect(url_for('main_routes.register_page'))

@main_routes.route('/reset_password_request')
def reset_password_request_page():
    return render_template('reset_password.html')

@main_routes.route('/reset_password_request', methods=['POST'])
def reset_password_request():
    email = request.form.get('email')
    
    if not email:
        flash('Please provide an email address.', 'error')
        return redirect(url_for('main_routes.reset_password_request_page'))
    
    if send_password_reset_email(email):
        flash('If an account with this email exists, you will receive a password reset link.', 'info')
    else:
        flash('Failed to send reset email. Please try again.', 'error')
    
    return redirect(url_for('main_routes.reset_password_request_page'))

@main_routes.route('/reset_password')
def reset_password_page():
    token = request.args.get('token')
    if not token:
        flash('Invalid or missing reset token.', 'error')
        return redirect(url_for('main_routes.auth'))
    
    # Verify token
    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
    if not reset_token or reset_token.expires_at < datetime.utcnow():
        flash('Reset token has expired or is invalid.', 'error')
        return redirect(url_for('main_routes.auth'))
    
    return render_template('reset_password.html', token=token, reset_form=True)

@main_routes.route('/reset_password', methods=['POST'])
def reset_password():
    token = request.form.get('token')
    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')
    
    if not all([token, password, confirm_password]):
        flash('All fields are required.', 'error')
        return redirect(url_for('main_routes.reset_password_page'))
    
    if password != confirm_password:
        flash('Passwords do not match.', 'error')
        return redirect(url_for('main_routes.reset_password_page') + f'?token={token}')
    
    if password and len(password) < 6:
        flash('Password must be at least 6 characters long.', 'error')
        return redirect(url_for('main_routes.reset_password_page') + f'?token={token}')
    
    # Verify and use token
    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
    if not reset_token or reset_token.expires_at < datetime.utcnow():
        flash('Reset token has expired or is invalid.', 'error')
        return redirect(url_for('main_routes.auth'))
    
    # Update password
    user = reset_token.user
    user.password_hash = generate_password_hash(password) if password else None
    reset_token.used = True
    
    try:
        db.session.commit()
        flash('Password reset successful! You can now log in with your new password.', 'success')
        return redirect(url_for('main_routes.auth'))
    except Exception as e:
        db.session.rollback()
        flash('Failed to reset password. Please try again.', 'error')
        return redirect(url_for('main_routes.reset_password_page') + f'?token={token}')

@main_routes.route('/chat')
@login_required
def chat():
    user_chats = Chat.query.filter_by(user_id=current_user.id).order_by(Chat.updated_at.desc()).all()
    return render_template('chat.html', chats=user_chats)

def _persist_ai_message(chat_id: int, content: str):
    """Persist AI message in background to avoid delaying API response."""
    from app import app, db
    from models import Message, Chat
    from datetime import datetime
    with app.app_context():
        try:
            chat = Chat.query.filter_by(id=chat_id).first()
            if not chat:
                return
            ai_message = Message()
            ai_message.content = content
            ai_message.is_user = False
            ai_message.chat_id = chat.id
            db.session.add(ai_message)
            chat.updated_at = datetime.utcnow()
            db.session.commit()
        except Exception:
            db.session.rollback()


@main_routes.route('/api/send_message', methods=['POST'])
@login_required
def send_message():
    try:
        data = request.get_json()
        message_content = data.get('message', '').strip()
        chat_id = data.get('chat_id')
        
        if not message_content:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Get or create chat
        if chat_id:
            chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first()
            if not chat:
                return jsonify({'error': 'Chat not found'}), 404
        else:
            chat = Chat()
            preview = (message_content or '')[:50].strip()
            chat.title = preview if preview else 'New Chat'
            chat.user_id = current_user.id
            db.session.add(chat)
            db.session.flush()
        
        # Get chat history BEFORE saving user message
        chat_history = []
        messages_list = list(chat.messages)
        recent_messages = messages_list[-10:] if len(messages_list) > 10 else messages_list
        for msg in recent_messages:
            chat_history.append({
                'content': msg.content,
                'is_user': msg.is_user
            })
        
        # Save user message
        user_message = Message()
        user_message.content = message_content
        user_message.is_user = True
        user_message.chat_id = chat.id
        db.session.add(user_message)
        db.session.commit()
        
        # Store chat_id for use in generator
        current_chat_id = chat.id
        
        def generate():
            full_response = ""
            try:
                # Send initial metadata
                yield f"data: {json.dumps({'type': 'start', 'chat_id': current_chat_id})}\n\n"
                
                # Stream AI response
                for chunk in generate_chat_response_streaming(message_content, chat_history):
                    if chunk:
                        full_response += chunk
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
                
                # Save AI message to database
                if full_response:
                    ai_message = Message()
                    ai_message.content = full_response
                    ai_message.is_user = False
                    ai_message.chat_id = current_chat_id
                    db.session.add(ai_message)
                    chat.updated_at = datetime.utcnow()
                    db.session.commit()
                
                # Send completion signal
                yield f"data: {json.dumps({'type': 'end'})}\n\n"
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                if not full_response:
                    yield f"data: {json.dumps({'type': 'chunk', 'content': 'I apologize, but I encountered an error. Please try again.'})}\n\n"
                yield f"data: {json.dumps({'type': 'end'})}\n\n"
        
        response = Response(stream_with_context(generate()), mimetype='text/event-stream')
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['X-Accel-Buffering'] = 'no'
        return response
        
    except Exception as e:
        logger.error(f"Send message error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to send message'}), 500

@main_routes.route('/api/retry', methods=['POST'])
@login_required
def retry_from_point():
    try:
        data = request.get_json()
        chat_id = data.get('chat_id')
        anchor_user_text = (data.get('anchor_user_text') or '').strip()
        truncate = bool(data.get('truncate', True))

        if not chat_id or not anchor_user_text:
            return jsonify({'error': 'chat_id and anchor_user_text are required'}), 400

        chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        # Locate the anchor: the last user message whose content matches
        messages_list = list(chat.messages)
        anchor_index = -1
        for i in range(len(messages_list) - 1, -1, -1):
            m = messages_list[i]
            if m.is_user and (m.content or '').strip() == anchor_user_text:
                anchor_index = i
                break

        if anchor_index == -1:
            return jsonify({'error': 'Anchor user message not found'}), 400

        # Optionally truncate everything AFTER the anchor in DB, so the conversation restarts from there
        if truncate:
            for j in range(len(messages_list) - 1, anchor_index, -1):
                db.session.delete(messages_list[j])

        # Build history up to the anchor for model context (without the anchor user text itself duplicated)
        slice_upto = messages_list[:anchor_index]
        recent = slice_upto[-10:] if len(slice_upto) > 10 else slice_upto
        chat_history = [{ 'content': m.content, 'is_user': m.is_user } for m in recent]

        # Generate AI response based on the anchor user text and prior context
        ai_response = generate_chat_response(anchor_user_text, chat_history)

        ai_message = Message()
        ai_message.content = ai_response
        ai_message.is_user = False
        ai_message.chat_id = chat.id
        db.session.add(ai_message)

        chat.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'ai_message': {
                'id': ai_message.id,
                'content': ai_message.content,
                'is_user': False,
                'created_at': ai_message.created_at.isoformat()
            },
            'chat_id': chat.id
        })
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to retry from point'}), 500

@main_routes.route('/api/get_chat/<int:chat_id>')
@login_required
def get_chat(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first()
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    
    messages = []
    for message in chat.messages:
        messages.append({
            'id': message.id,
            'content': message.content,
            'is_user': message.is_user,
            'created_at': message.created_at.isoformat()
        })
    
    return jsonify({
        'chat': {
            'id': chat.id,
            'title': chat.title,
            'created_at': chat.created_at.isoformat(),
            'messages': messages
        }
    })

@main_routes.route('/api/new_chat', methods=['POST'])
@login_required
def new_chat():
    try:
        chat = Chat()
        chat.title = 'New Chat'
        chat.user_id = current_user.id
        db.session.add(chat)
        db.session.commit()
        
        return jsonify({
            'chat': {
                'id': chat.id,
                'title': chat.title,
                'created_at': chat.created_at.isoformat(),
                'messages': []
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create new chat'}), 500

@main_routes.route('/api/delete_chat/<int:chat_id>', methods=['DELETE'])
@login_required
def delete_chat(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first()
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    
    try:
        db.session.delete(chat)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete chat'}), 500

@main_routes.route('/api/delete_all_chats', methods=['DELETE'])
@login_required
def delete_all_chats():
    try:
        chats = Chat.query.filter_by(user_id=current_user.id).all()
        for chat in chats:
            db.session.delete(chat)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete all chats'}), 500

@main_routes.route('/api/retitle_chat', methods=['POST'])
@login_required
def retitle_chat_async():
    """Generate a better chat title asynchronously without affecting first response latency."""
    try:
        data = request.get_json()
        chat_id = data.get('chat_id')
        first_message = (data.get('first_message') or '').strip()

        if not chat_id or not first_message:
            return jsonify({'error': 'chat_id and first_message are required'}), 400

        chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first()
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        # Generate a concise title using the model (runs after initial response)
        try:
            title = generate_chat_title(first_message)
            title = (title or '').strip() or 'New Chat'
        except Exception:
            title = (first_message[:50].strip() or 'New Chat')

        chat.title = title
        db.session.commit()

        return jsonify({'success': True, 'title': title})
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Failed to retitle chat'}), 500

@main_routes.route('/api/update_profile', methods=['POST'])
@login_required
def update_profile():
    try:
        data = request.get_json()
        display_name = data.get('display_name', '').strip()
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        theme_preference = data.get('theme_preference', 'light')
        
        # Update display name
        if display_name:
            current_user.display_name = display_name
        
        # Update theme preference
        if theme_preference in ['light', 'dark']:
            current_user.theme_preference = theme_preference
        
        # Update password if provided
        if new_password:
            if not current_password:
                return jsonify({'error': 'Current password required to change password'}), 400
            
            if not current_user.password_hash or not check_password_hash(current_user.password_hash, current_password):
                return jsonify({'error': 'Current password is incorrect'}), 400
            
            if new_password and len(new_password) < 6:
                return jsonify({'error': 'New password must be at least 6 characters long'}), 400
            
            current_user.password_hash = generate_password_hash(new_password) if new_password else current_user.password_hash
        
        db.session.commit()
        return jsonify({
            'success': True,
            'user': {
                'display_name': current_user.get_display_name(),
                'theme_preference': current_user.theme_preference
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile'}), 500
