"""
WebSocket connection manager for real-time updates.
Broadcasts: IoT telemetry, fraud alerts, shipment events, quarantine events.
"""
from __future__ import annotations
import asyncio
import json
import logging
from typing import Dict, List, Set, Any, Optional
from enum import Enum

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WSEventType(str, Enum):
    IOT_READING = "IOT_READING"
    FRAUD_ALERT = "FRAUD_ALERT"
    SHIPMENT_UPDATE = "SHIPMENT_UPDATE"
    QUARANTINE_EVENT = "QUARANTINE_EVENT"
    RECALL_ALERT = "RECALL_ALERT"
    SYSTEM_HEALTH = "SYSTEM_HEALTH"
    DEVICE_STATUS = "DEVICE_STATUS"
    COLD_CHAIN_BREACH = "COLD_CHAIN_BREACH"


class ConnectionManager:
    """Manages WebSocket connections with topic subscriptions."""

    def __init__(self):
        # All connected websockets
        self._all: List[WebSocket] = []
        # Topic → set of websockets
        self._subscriptions: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, topics: Optional[List[str]] = None):
        await websocket.accept()
        self._all.append(websocket)
        for topic in (topics or ["*"]):
            self._subscriptions.setdefault(topic, set()).add(websocket)
        logger.debug(f"WS connected. Total: {len(self._all)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self._all:
            self._all.remove(websocket)
        for topic_set in self._subscriptions.values():
            topic_set.discard(websocket)
        logger.debug(f"WS disconnected. Total: {len(self._all)}")

    async def broadcast(self, event_type: WSEventType, data: Any, topic: Optional[str] = None):
        """Broadcast to all subscribers of a topic (or * for all)."""
        message = json.dumps({
            "type": event_type.value,
            "data": data,
        }, default=str)

        target_sockets: Set[WebSocket] = set()
        if topic:
            target_sockets |= self._subscriptions.get(topic, set())
        target_sockets |= self._subscriptions.get("*", set())

        dead = []
        for ws in list(target_sockets):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws)

    async def broadcast_iot(self, reading_data: Dict[str, Any]):
        await self.broadcast(WSEventType.IOT_READING, reading_data, topic="iot")

    async def broadcast_fraud_alert(self, alert_data: Dict[str, Any]):
        await self.broadcast(WSEventType.FRAUD_ALERT, alert_data, topic="fraud")

    async def broadcast_quarantine(self, package_data: Dict[str, Any]):
        await self.broadcast(WSEventType.QUARANTINE_EVENT, package_data, topic="quarantine")

    async def broadcast_shipment(self, shipment_data: Dict[str, Any]):
        await self.broadcast(WSEventType.SHIPMENT_UPDATE, shipment_data, topic="shipments")

    async def broadcast_cold_chain(self, data: Dict[str, Any]):
        await self.broadcast(WSEventType.COLD_CHAIN_BREACH, data, topic="cold_chain")


ws_manager = ConnectionManager()
