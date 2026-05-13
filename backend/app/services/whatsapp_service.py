import os
import logging
from twilio.rest import Client
from app.core.config import settings

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_WHATSAPP_NUMBER") # e.g., 'whatsapp:+14155238886'
        
        self.client = None
        if self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {str(e)}")

    def send_commission_update(self, to_number: str, staff_name: str, amount: float, month: str):
        if not self.client:
            logger.warning(f"MOCK WhatsApp to {to_number}: Hi {staff_name}, your commission for {month} is ${amount:.2f}! Keep it up! 🚀")
            return True

        try:
            message = self.client.messages.create(
                body=f"Hi {staff_name}, your performance update for {month} is here! Your current commission is ${amount:.2f}. Great job! 🚀",
                from_=self.from_number,
                to=f'whatsapp:{to_number}'
            )
            return message.sid
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {str(e)}")
            return False

whatsapp_service = WhatsAppService()
