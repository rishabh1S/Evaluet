from fastapi_mail import FastMail, MessageSchema, MessageType
from app.core.mail import email_conf 
import markdown

class MailService:
    def __init__(self):
        self.fm = FastMail(email_conf)

    async def send_interview_report(
        self,
        recipient_email: str,
        job_role: str,
        report_markdown: str,
        score: int | None,
    ):
        subject = f"Your Interview Feedback – {job_role}"

        report_html = markdown.markdown(
            report_markdown,
            extensions=["extra", "nl2br", "sane_lists"]
        )

        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Interview Feedback</h2>

            <p><strong>Role:</strong> {job_role}</p>
            <p><strong>Score:</strong> {score if score is not None else "N/A"} / 10</p>

            <hr style="margin: 16px 0;" />

            {report_html}

            <hr style="margin: 24px 0;" />

            <p style="font-size: 12px; color: #666;">
                This feedback was generated automatically by Evaluet AI.
            </p>
        </body>
        </html>
        """

        message = MessageSchema(
            subject=subject,
            recipients=[recipient_email],
            body=body,
            subtype=MessageType.html,
        )

        await self.fm.send_message(message)
