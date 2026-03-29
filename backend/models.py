from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base

class Snippet(Base):
    __tablename__ = "snippets"

    id = Column(Integer, primary_key=True, index=True)
    html_content = Column(Text, nullable=False)
    css_content = Column(Text, nullable=False)
    screenshot_base64 = Column(Text, nullable=True)
    source_url = Column(String(500), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
