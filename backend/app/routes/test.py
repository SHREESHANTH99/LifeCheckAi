from fastapi import APIRouter

router = APIRouter()


@router.get("/test")
def test() -> dict[str, str]:
    return {"status": "API working perfectly"}
