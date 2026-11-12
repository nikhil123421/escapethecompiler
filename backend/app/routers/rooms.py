"""Public room catalogue: what a room is, never what it tests."""

from fastapi import APIRouter

from app.content.rooms import ROOMS
from app.schemas import RoomPublic

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.get("", response_model=list[RoomPublic])
def list_rooms() -> list[RoomPublic]:
    return [
        RoomPublic(
            id=room.id,
            number=room.number,
            title=room.title,
            topic=room.topic,
            prompt=room.prompt,
            starter_code=room.starter_code,
            starter_codes=room.starter_codes,
        )
        for room in ROOMS
    ]
