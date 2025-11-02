import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import url_for
from datetime import datetime, timedelta
from models import PasswordResetToken, User
from app import db

def send_password_reset_email(user_email: str) -> bool:
    """Send password reset email to user"""
    try:
        # Find user
        user = User.query.filter_by(email=user_email).first()
        if not user:
            return False
        
        # Create reset token
        expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        reset_token = PasswordResetToken(user_id=user.id, expires_at=expires_at)
        db.session.add(reset_token)
        db.session.commit()
        
        # Email configuration
        smtp_server = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('MAIL_PORT', '587'))
        sender_email = os.environ.get('MAIL_USERNAME', '')
        sender_password = os.environ.get('MAIL_PASSWORD', '')
        
        if not sender_email or not sender_password:
            print("Email credentials not configured")
            return False
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Password Reset - SARKAR AI"
        message["From"] = sender_email
        message["To"] = user_email
        
        # Create reset URL using the current domain
        base_url = os.environ.get('REPLIT_DEV_DOMAIN', 'localhost:5000')
        if base_url != 'localhost:5000':
            reset_url = f"https://{base_url}/reset_password?token={reset_token.token}"
        else:
            reset_url = f"http://{base_url}/reset_password?token={reset_token.token}"
        
        # HTML content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #e67e22; font-family: 'Merriweather', serif;">SARKAR AI</h1>
                </div>
                
                <h2>Password Reset Request</h2>
                
                <p>Hello {user.get_display_name()},</p>
                
                <p>You recently requested to reset your password for your SARKAR AI account. Click the button below to reset it:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background-color: #e67e22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_url}</p>
                
                <p><strong>This link will expire in 1 hour.</strong></p>
                
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #666;">
                    This is an automated message from SARKAR AI. Please do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Text content
        text_content = f"""
        SARKAR AI - Password Reset Request
        
        Hello {user.get_display_name()},
        
        You recently requested to reset your password for your SARKAR AI account.
        
        Click this link to reset your password: {reset_url}
        
        This link will expire in 1 hour.
        
        If you didn't request this password reset, please ignore this email.
        
        This is an automated message from SARKAR AI.
        """
        
        # Convert to MIMEText objects
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        
        # Add parts to message
        message.attach(part1)
        message.attach(part2)
        
        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, user_email, message.as_string())
        
        return True
        
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False
