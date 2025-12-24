from pydantic import BaseModel
from typing import Optional

class InterviewerPublicDTO(BaseModel):
    id: str
    name: str
    description: Optional[str]
    profile_image_url: Optional[str]
    focus_areas: Optional[str]

    class Config:
        from_attributes = True 
