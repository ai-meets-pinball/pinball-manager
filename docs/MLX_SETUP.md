# Lokale KI über MLX (selbst gehostet)

Der **lokale** KI-Weg dieser App läuft über MLX-Server, die **wir selbst** auf
einem Apple-Silicon-Mac (`localhost`) betreiben. Zwei getrennte Prozesse:

- **Text** (`mlx_lm.server`) — Long-Context-Modell. Ein digitales Handbuch passt
  komplett in **einen** Kontext (kein 32k-Cut wie bei Ollama). Das ist der Grund
  für MLX.
- **OCR** (`mlx-vlm`) — für **gescannte** Handbücher: Seitenbilder → Text. Der
  Text geht danach durch denselben Struktur-Schritt wie ein digitales Handbuch
  (2-stufig **OCR → Text → JSON**).

> Nur lokal. `localhost` ist von Vercel **nicht** erreichbar — MLX ist kein
> Cloud-Pfad (wie Ollama). Auf Vercel bleibt Claude der Weg.

Die App spricht beide Server per einfachem `fetch` an (kein SDK) — Code:
[`src/lib/ai/mlx.ts`](../src/lib/ai/mlx.ts). „OpenAI-kompatibel" ist dabei nur die
zufällige API-Form der Server, kein Ziel.

---

## 1. Installation (einmalig)

```bash
python3 -m venv ~/.mlx-venv
source ~/.mlx-venv/bin/activate
pip install --upgrade mlx-lm mlx-vlm
```

## 2. Text-Server (digitale Handbücher, Guide, Wartungs-Import)

```bash
source ~/.mlx-venv/bin/activate
mlx_lm.server \
  --model mlx-community/Qwen2.5-7B-Instruct-1M-4bit \
  --port 8082
```

- Erster Start lädt das Modell (mehrere GB) → dauert.
- **`num_ctx` moderat halten:** 1M ist Overkill (ein Handbuch = zehntausende
  Tokens); ein sehr großer KV-Cache kostet RAM und Prefill-Zeit. Am realen
  Handbuch kalibrieren.
- Health: `curl http://localhost:8082/health`.

## 3. OCR-Server (gescannte Handbücher) — zwei Wege

### 3a. Empfohlen: Qwen2.5-VL über `mlx-vlm` (kein Custom-Code)

```bash
source ~/.mlx-venv/bin/activate
python -m mlx_vlm.server \
  --model mlx-community/Qwen2.5-VL-7B-Instruct-4bit \
  --port 8083
```

Nimmt Bild-Eingaben (OpenAI-Vision-Form) und liefert den Seitentext. Health:
`curl http://localhost:8083/health`.

### 3b. Alternative: PaddleOCR-VL (dedizierte OCR, eigener Dienst)

[`gamhtoi/PaddleOCR-VL-MLX`](https://huggingface.co/gamhtoi/PaddleOCR-VL-MLX) hat
**keinen** fertigen Server (custom `trust_remote_code`). Nötig ist ein kleiner
eigener HTTP-Dienst, der `POST /v1/chat/completions` (Bild → Text) nachbildet,
damit `MLX_OCR_URL` darauf zeigen kann. Skelett:

```python
# scripts/mlx-ocr/server.py  (FastAPI + uvicorn)
from fastapi import FastAPI
from PIL import Image
import base64, io
from modeling_paddleocr_vl import PaddleOCRVLForConditionalGeneration
# model = PaddleOCRVLForConditionalGeneration.from_pretrained(
#     "gamhtoi/PaddleOCR-VL-MLX", trust_remote_code=True)
app = FastAPI()

@app.post("/v1/chat/completions")
def ocr(body: dict):
    # Bild aus der data:-URL im letzten user-content ziehen, OCR ausführen,
    # Antwort in { "choices": [ { "message": { "content": <text> } } ] } packen.
    ...
```

Erst bauen, wenn 3a qualitativ nicht reicht — 3a genügt in aller Regel.

## 4. App konfigurieren (`.env.local`)

```dotenv
# lokaler Standard-Anbieter (oder je Aktion im UI wählbar)
AI_PROVIDER="mlx"
MLX_TEXT_URL="http://localhost:8082/v1"
MLX_TEXT_MODEL="mlx-community/Qwen2.5-7B-Instruct-1M-4bit"
# OCR nur setzen, wenn der Server aus Schritt 3 läuft:
MLX_OCR_URL="http://localhost:8083/v1"
MLX_OCR_MODEL="mlx-community/Qwen2.5-VL-7B-Instruct-4bit"
```

Ohne `MLX_OCR_URL` funktioniert der Text-Pfad (digitale PDFs) voll; ein
**gescanntes** PDF meldet dann einen klaren Hinweis (Ollama/Claude nutzen).

Start beider Server bequem: `scripts/mlx-serve.sh` (siehe dort).

## 5. Dauerbetrieb (optional, launchd)

Für automatischen Start Plists in `~/Library/LaunchAgents` anlegen
(`net.deepthought.mlx-text.plist`, `net.deepthought.mlx-ocr.plist`), die die
Befehle aus Schritt 2/3 starten, dann
`launchctl load ~/Library/LaunchAgents/net.deepthought.mlx-*.plist`.

## 6. Verifikation

1. `curl http://localhost:8082/health` (+ ggf. `:8083/health`) → ok.
2. In der App ein **digitales** Handbuch mit Anbieter „Lokal (MLX)" hochladen →
   der ganze Text geht in einen Call; Fakten prüfen. Gegenprobe zu Claude.
3. Ein **gescanntes** Handbuch → OCR → Text → Fakten (oder klarer Hinweis, wenn
   `MLX_OCR_URL` leer).
4. Guide + Wartungs-Import mit „Lokal (MLX)".
