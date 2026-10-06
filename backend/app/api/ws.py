from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.core.websockets import manager

router = APIRouter(prefix="/ws", tags=["websockets"])

@router.websocket("/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect the client to send anything, but we must keep the connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
