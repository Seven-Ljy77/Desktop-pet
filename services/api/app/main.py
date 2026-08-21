from fastapi import FastAPI, HTTPException

from .interaction_service import create_interaction
from .models import HealthResponse, InteractionRequest, InteractionResponse

app = FastAPI(
    title="Desktop Pet API",
    version="0.1.0",
    description="Supplies dynamic text and presentation hints for pet interactions.",
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.post("/api/v1/interactions", response_model=InteractionResponse)
def interaction(payload: InteractionRequest) -> InteractionResponse:
    try:
        return create_interaction(payload)
    except (KeyError, RuntimeError, ValueError) as error:
        raise HTTPException(status_code=503, detail="Interaction content unavailable") from error

