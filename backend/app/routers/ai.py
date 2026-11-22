"""Optional "Explain my code" helper. Off unless an admin sets KALAM_AI_PROVIDER.

Providers:
* anthropic          — Claude via the official Anthropic SDK (KALAM_AI_API_KEY)
* openai_compatible  — any self-hosted server with an OpenAI-style /v1/chat/completions
                       endpoint (e.g. Ollama on the school server; no data leaves the school)

Only the code is sent — never the student's name or any account details.
"""
from __future__ import annotations

from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from .. import ratelimit
from ..config import get_limits, get_settings
from ..deps import MaybeUser
from ..util import client_ip

router = APIRouter(prefix="/api/ai", tags=["ai"])

UI_LANGUAGE_NAMES = {"en": "English", "te": "Telugu", "hi": "Hindi"}

SYSTEM_PROMPT = """You are Kalam, a friendly coding helper for school students aged 8 to 16 in India.
Explain the student's program in simple words a 10-year-old can follow.
Rules:
- Write in {language}. Keep code words (print, for, int, cout ...) in English.
- Use short sentences and at most 8 bullet points, one per important part of the program, in order.
- Say what the program does when it runs, then explain each part.
- If there is a mistake, point it out gently and give one hint, but do not rewrite the whole program.
- Be warm and encouraging. No jokes about the student. Never ask for personal information.
- Only talk about the code. If the code contains anything unsafe or unkind, just say you can only help with code.
- Plain text only, no markdown headings."""


class ExplainIn(BaseModel):
    language: Literal["python", "c", "cpp"]
    code: str = Field(min_length=1, max_length=8000)
    ui_language: str = "en"


async def _anthropic(system: str, user: str) -> str:
    import anthropic

    s = get_settings()
    client = anthropic.AsyncAnthropic(api_key=s.ai_api_key or None, timeout=60, max_retries=2)
    response = await client.beta.messages.create(
        model=s.ai_model,
        max_tokens=2000,
        system=system,
        messages=[{"role": "user", "content": user}],
        # Short, simple explanations don't need deep thinking.
        output_config={"effort": "low"},
        # If the main model declines, let the API retry on a suitable fallback model.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    if response.stop_reason == "refusal":
        raise HTTPException(422, "The helper couldn't explain this code.")
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    if not text:
        raise HTTPException(502, "Empty answer")
    return text


async def _openai_compatible(system: str, user: str) -> str:
    s = get_settings()
    if not s.ai_base_url:
        raise HTTPException(500, "KALAM_AI_BASE_URL is not set")
    headers = {"Authorization": f"Bearer {s.ai_api_key}"} if s.ai_api_key else {}
    async with httpx.AsyncClient(timeout=90) as c:
        r = await c.post(
            s.ai_base_url.rstrip("/") + "/v1/chat/completions",
            headers=headers,
            json={"model": s.ai_model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "max_tokens": 900},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


@router.post("/explain")
async def explain(body: ExplainIn, request: Request, user: MaybeUser):
    s = get_settings()
    if s.ai_provider == "none":
        raise HTTPException(404, "AI explanations are turned off")
    who = f"{type(user).__name__}:{user.id}" if user else client_ip(request)
    if not await ratelimit.allow(f"ai:{who}", get_limits().rate_limit.ai_requests_per_hour_per_user, 3600):
        raise HTTPException(429, {"code": "rate_limited", "message": "Too many questions this hour"})
    system = SYSTEM_PROMPT.format(language=UI_LANGUAGE_NAMES.get(body.ui_language, "English"))
    lang_name = {"python": "Python", "c": "C", "cpp": "C++"}[body.language]
    user_msg = f"Please explain this {lang_name} program:\n\n```\n{body.code}\n```"
    try:
        text = await (_anthropic(system, user_msg) if s.ai_provider == "anthropic" else _openai_compatible(system, user_msg))
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, "The helper is not available right now") from e
    return {"explanation": text[:6000]}
