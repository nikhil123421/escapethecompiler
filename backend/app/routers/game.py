"""Playing the game. Every route needs a team token."""

from fastapi import APIRouter, Depends

from app.deps import get_current_team, get_repository
from app.models import Team
from app.repository import Repository
from app.schemas import FinalOut, FinalRequest, GameState, HintOut, RunOut, RunRequest
from app.services import game

router = APIRouter(prefix="/api/game", tags=["game"])


@router.get("/state", response_model=GameState)
def state(
    team: Team = Depends(get_current_team),
    repo: Repository = Depends(get_repository),
) -> GameState:
    return game.get_state(repo, team)


@router.post("/rooms/{room_id}/open", response_model=GameState)
def open_room(
    room_id: str,
    team: Team = Depends(get_current_team),
    repo: Repository = Depends(get_repository),
) -> GameState:
    return game.open_room(repo, team, room_id)


@router.post("/rooms/{room_id}/run", response_model=RunOut)
def run_room(
    room_id: str,
    body: RunRequest,
    team: Team = Depends(get_current_team),
    repo: Repository = Depends(get_repository),
) -> RunOut:
    return game.run_code(repo, team, room_id, body.code, language=body.language)


@router.post("/rooms/{room_id}/hint", response_model=HintOut)
def use_hint(
    room_id: str,
    team: Team = Depends(get_current_team),
    repo: Repository = Depends(get_repository),
) -> HintOut:
    return game.take_hint(repo, team, room_id)


@router.post("/final", response_model=FinalOut)
def final_lock(
    body: FinalRequest,
    team: Team = Depends(get_current_team),
    repo: Repository = Depends(get_repository),
) -> FinalOut:
    return game.submit_final(repo, team, body.code, body.word)
