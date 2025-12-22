from fastapi_mail import FastMail, MessageSchema, MessageType
from app.core.mail import email_conf 

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

        body = f"""
        <h2>Interview Feedback</h2>
        <p><strong>Role:</strong> {job_role}</p>
        <p><strong>Score:</strong> {score if score is not None else "N/A"} / 10</p>
        <hr/>
        <div>
            {report_markdown.replace("\n", "<br/>")}
        </div>
        """

        message = MessageSchema(
            subject=subject,
            recipients=[recipient_email],
            body=body,
            subtype=MessageType.html,
        )

        await self.fm.send_message(message)
