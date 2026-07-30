#!/usr/bin/env python3
"""
Kleiner OpenAI-kompatibler OCR-Server für die App (MLX_OCR_URL). mlx-vlm bringt
keinen eigenen HTTP-Server mit, also kapseln wir mlx_vlm.generate hier in genau
die /v1/chat/completions-Form, die src/lib/ai/mlx.ts (mlxOcr) sendet:
Bild als data:-URL im letzten user-content → erkannter Text.

Start:
  MLX_OCR_MODEL=mlx-community/Qwen2.5-VL-3B-Instruct-4bit \
  ~/.mlx-venv/bin/python scripts/mlx-ocr/server.py
"""
import base64
import os
import tempfile

import uvicorn
from fastapi import FastAPI, Request
from mlx_vlm import apply_chat_template, generate, load
from mlx_vlm.utils import load_config

MODEL = os.environ.get("MLX_OCR_MODEL", "mlx-community/Qwen2.5-VL-3B-Instruct-4bit")
PORT = int(os.environ.get("MLX_OCR_PORT", "8083"))

print(f"[mlx-ocr] lade {MODEL} …", flush=True)
# Braucht transformers < 4.57 (siehe docs/MLX_SETUP.md): ab 4.57 gibt der fast
# Qwen-VL-Image-Processor nur PyTorch-Tensoren zurück, der slow Tokenizer hat kein
# .vocab — mlx-vlm 0.1.15 kommt mit keinem der beiden klar.
model, processor = load(MODEL)
config = load_config(MODEL)
print("[mlx-ocr] bereit.", flush=True)

app = FastAPI()


def parse_request(body: dict):
    """Text-Prompt + Bildpfade aus der letzten user-Message ziehen."""
    text = "Gib den gesamten Text dieses Bildes wieder."
    images = []
    for msg in body.get("messages", []):
        content = msg.get("content")
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            for part in content:
                if part.get("type") == "text":
                    text = part.get("text", text)
                elif part.get("type") == "image_url":
                    url = part.get("image_url", {}).get("url", "")
                    if url.startswith("data:"):
                        b64 = url.split(",", 1)[1]
                        fd, path = tempfile.mkstemp(suffix=".png")
                        with os.fdopen(fd, "wb") as f:
                            f.write(base64.b64decode(b64))
                        images.append(path)
                    elif url:
                        images.append(url)
    return text, images


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/chat/completions")
async def chat(request: Request):
    body = await request.json()
    text, images = parse_request(body)
    max_tokens = int(body.get("max_tokens", 4096))

    formatted = apply_chat_template(
        processor, config, text, num_images=max(len(images), 1)
    )
    try:
        out = generate(
            model,
            processor,
            formatted,
            image=images if images else None,
            max_tokens=max_tokens,
            verbose=False,
        )
    finally:
        for p in images:
            try:
                os.remove(p)
            except OSError:
                pass

    content = out if isinstance(out, str) else getattr(out, "text", str(out))
    return {
        "object": "chat.completion",
        "model": MODEL,
        "choices": [
            {
                "index": 0,
                "finish_reason": "stop",
                "message": {"role": "assistant", "content": content},
            }
        ],
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")
