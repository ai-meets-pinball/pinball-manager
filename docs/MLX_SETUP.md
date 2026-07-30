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
python3 -m venv ~/.mlx-venv           # System-Python 3.9 reicht
source ~/.mlx-venv/bin/activate
pip install --upgrade pip
pip install mlx-lm                     # Text-Server
# Für OCR zusätzlich (siehe §3): mlx-vlm + torch (nur Processor-Backend) und
# eine transformers-Version < 4.57 (die neueren brechen mlx-vlm 0.1.15):
pip install mlx-vlm torch torchvision "transformers==4.53.3"
```

> Getestet: Python 3.9.6, `mlx-lm 0.29.1`, `mlx-vlm 0.1.15`, `transformers 4.53.3`.
> **Wichtig:** `transformers>=4.57` bricht die OCR (fast Image-Processor liefert
> nur PyTorch-Tensoren; slow Tokenizer hat kein `.vocab`). Deshalb 4.53.3 pinnen.

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

## 3. OCR-Server (gescannte Handbücher)

`mlx-vlm 0.1.15` bringt **keinen** eigenen HTTP-Server mit — daher kapseln wir es
in einem kleinen eigenen Dienst **[`scripts/mlx-ocr/server.py`](../scripts/mlx-ocr/server.py)**
(FastAPI), der genau die `POST /v1/chat/completions`-Form spricht, die die App
sendet (Bild als `data:`-URL → erkannter Text).

```bash
source ~/.mlx-venv/bin/activate
MLX_OCR_MODEL="mlx-community/Qwen2.5-VL-3B-Instruct-4bit" \
MLX_OCR_PORT=8083 \
python scripts/mlx-ocr/server.py
```

- **3B statt 7B:** leichter, passt neben dem residenten Text-Modell in den RAM,
  gute OCR-Qualität. (7B via `MLX_OCR_MODEL=…-VL-7B-Instruct-4bit`, wenn RAM reicht.)
- Health: `curl http://localhost:8083/health`. Getestet: Bild einer Spulentabelle
  → korrekter Text in ~3 s.

**Alternative (dediziertes OCR-Modell):** [`gamhtoi/PaddleOCR-VL-MLX`](https://huggingface.co/gamhtoi/PaddleOCR-VL-MLX)
— müsste analog in `scripts/mlx-ocr/` gekapselt werden (custom `trust_remote_code`).
Erst nötig, wenn Qwen2.5-VL qualitativ nicht reicht.

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
