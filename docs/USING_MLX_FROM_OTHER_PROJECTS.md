# Using the Falcon MLX server from another project

There is a local Apple MLX inference server running on the Falcon Mac Studio. It speaks the
OpenAI chat-completions API, so any project on the company network can use it with an
OpenAI SDK and a changed base URL — no new client library, no API key.

This document is self-contained: copy it into your repo.

---

## 1. Endpoint

```
http://10.1.10.210:8082/v1
```

- **No authentication.** Anyone on the LAN can call it.
- **VPN required** if you are off-site.
- Not exposed publicly, and it must stay that way — `mlx_lm.server`'s own documentation says it
  implements only basic security checks.

Liveness check, cheap enough to poll:

```bash
curl http://10.1.10.210:8082/health
# {"status": "ok"}
```

---

## 2. Available models

`GET /v1/models` returns whatever is cached, live:

```bash
curl -s http://10.1.10.210:8082/v1/models
```

At the time of writing:

| Repo id | Type | Quant | Context (config) | KV cache per token |
|---|---|---|---|---|
| `mlx-community/gpt-oss-120b-mxfp4-bf16` | gpt_oss | 4-bit | 131,072 | 72 KB |
| `mlx-community/Qwen2.5-32B-Instruct-4bit` | qwen2 | 4-bit | 32,768 | 256 KB |
| `mlx-community/Qwen3.6-27B-OptiQ-4bit` | qwen3_5 (**vision**) | 4-bit | 262,144 | — |
| `mlx-community/Qwen2.5-7B-Instruct-1M-4bit` | qwen2 | 4-bit | **1,010,000** | 56 KB |

**You are not limited to this list.** The `model` field accepts *any* Hugging Face repo id, and
the server downloads it on demand:

```json
{ "model": "mlx-community/Mistral-7B-Instruct-v0.3-4bit", "messages": [...] }
```

The first such request blocks for the whole download — minutes for a large repo, with no progress
over HTTP. Pre-pull anything big before you depend on it (ask the Falcon team, or use the
admin sidecar in §6).

### Picking a model

- **Long documents** → `Qwen2.5-7B-Instruct-1M-4bit`. Its 56 KB/token KV cache is what makes a
  genuinely long context affordable; the 32B needs 256 KB/token, so it runs out of memory long
  before it runs out of context window.
- **General quality** → `Qwen2.5-32B-Instruct-4bit` or `gpt-oss-120b`.
- **Images** → `Qwen3.6-27B-OptiQ-4bit` is multimodal. Note `mlx_lm.server` is a *text* server;
  vision input needs `mlx_vlm`, which is not what runs on 8082.

---

## 3. Calling it

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://10.1.10.210:8082/v1",
    api_key="not-used",          # required by the SDK, ignored by the server
)

resp = client.chat.completions.create(
    model="mlx-community/Qwen2.5-32B-Instruct-4bit",
    messages=[{"role": "user", "content": "Explain LoRA in two sentences."}],
    max_tokens=512,
    temperature=0.7,
)
print(resp.choices[0].message.content)
```

### TypeScript

```ts
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'http://10.1.10.210:8082/v1',
  apiKey: 'not-used',
})

const res = await client.chat.completions.create({
  model: 'mlx-community/Qwen2.5-32B-Instruct-4bit',
  messages: [{ role: 'user', content: 'Explain LoRA in two sentences.' }],
  max_tokens: 512,
})
```

### curl, streaming

```bash
curl -N http://10.1.10.210:8082/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "mlx-community/Qwen2.5-32B-Instruct-4bit",
    "messages": [{"role":"user","content":"Count to five."}],
    "stream": true,
    "max_tokens": 100
  }'
```

### Supported request fields

`messages`, `model`, `stream`, `max_tokens` (**default 512** — raise it), `temperature`
(**default 0.0**), `top_p`, `top_k`, `min_p`, `repetition_penalty`, `logit_bias`, `logprobs`,
`stop`, `adapters` (path to LoRA adapter weights), `draft_model`.

---

## 4. Things that will bite you

**`max_tokens` defaults to 512.** Long outputs silently truncate. Check `finish_reason` — it is
`"length"` when the cap was hit, `"stop"` when the model finished.

**`temperature` defaults to 0.0**, not 0.7. Set it explicitly if you want variation.

**`usage` is missing in streaming mode.** Non-streaming responses carry
`{prompt_tokens, completion_tokens, total_tokens}`; streamed ones do not. If you need token counts
while streaming you have to count chunks yourself, and that is an estimate — label it as one.

**There are no timing fields at all**, unlike Ollama's `eval_count`/`eval_duration`. Measure
latency around the call yourself. Take time-to-first-token on the first chunk with **non-empty**
content: OpenAI-shaped streams open with a role-only delta, and counting that understates TTFT
by the whole prefill.

**First request after a restart is slow.** The server is deliberately started without a preloaded
model, so nothing is resident until a request names one. Expect a cold start of seconds to a
minute; subsequent requests are fast.

**Sending a different `model` swaps the loaded one.** There is one model in memory at a time. Two
projects alternating between models will thrash multi-gigabyte loads and both will be slow. Pick
one model per workload and stay on it.

**Declared context is not usable context.** A model advertising 1M tokens still needs the KV cache
to fit in memory — 1M tokens on the 7B model is ~54 GB. Attention is also quadratic in sequence
length, so a very long prompt costs minutes of prefill before the first token appears. Set
generous client timeouts for long inputs.

---

## 5. Shared-resource etiquette

The Mac Studio has **256 GB** of unified memory and it is not yours alone. It also runs:

- **Ollama** on `:11434` — serves Falcon Chat in production. `gpt-oss:120b` alone is **65 GB**
  resident when someone is chatting.
- **Falcon Pulse** (`pulse.falcon.kpunkt.net`) in Docker.
- **Scope Falcon** RAG on `:3030`.

Practical rules:

- Keep to one model, and prefer a smaller one if it is good enough.
- Do not hold a 1M-token context open in a loop.
- Heavy batch work belongs off-hours. If Falcon Chat gets slow, this is the first thing to check.
- Disk is the tighter constraint: the volume is ~93% full with roughly **68 GB writable**. A single
  large model can fill it. Do not pull without checking.

---

## 6. Model management (optional)

A companion service on `:8083` handles what `mlx_lm.server` cannot: pull, delete, unload and
memory stats. **It is token-protected** — it deletes files and restarts a service — so ask the
Falcon team for `MLX_ADMIN_TOKEN` if you need it. Most consumers never do.

```bash
A=http://10.1.10.210:8083
curl -s $A/health                                            # unauthenticated
curl -s -H "Authorization: Bearer $TOKEN" $A/models          # cached models with sizes
curl -s -H "Authorization: Bearer $TOKEN" "$A/info?repo_id=mlx-community/Qwen2.5-32B-Instruct-4bit"
curl -s -H "Authorization: Bearer $TOKEN" $A/memory          # host memory
curl -s -X POST -H "Authorization: Bearer $TOKEN" $A/unload  # free all model memory
curl -s -N -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"repo_id":"mlx-community/Qwen2.5-3B-Instruct-4bit"}' $A/pull   # NDJSON progress
```

There is also a browser UI at **`pulse.falcon.kpunkt.net/playground/mlx`** (admin login) with the
model library, host memory and a benchmarking run panel.

---

## 7. Why MLX rather than Ollama

Ollama (`:11434`) runs llama.cpp; MLX is Apple's native framework for Apple Silicon and is
generally faster and more memory-efficient on this hardware. Both are available — MLX is the
evaluation track, Ollama is what production currently uses.

Do not compare their self-reported throughput numbers directly. Ollama reports
`eval_count / eval_duration` measured *inside* the engine; anything you measure around an MLX HTTP
call includes the socket and your own client. Measure both the same way or the comparison is
meaningless.

Reference point, measured over the LAN through a real client:
**~27–28 tok/s decode on `Qwen2.5-32B-Instruct-4bit`.**

---

## 8. If it is not responding

```bash
curl http://10.1.10.210:8082/health     # inference
curl http://10.1.10.210:8083/health     # model admin
```

They are two independent processes; one being down says nothing about the other. Both run natively
on the Mac Studio under launchd (`net.kpunkt.mlx-server`, `net.kpunkt.mlx-admin`) — they are *not*
in Docker, because Docker on macOS has no Metal GPU passthrough. Restart:

```bash
ssh k-falcon@10.1.10.210
launchctl kickstart -k gui/$(id -u)/net.kpunkt.mlx-server
tail -50 ~/mlx-server.log
```

Full operational detail lives in the Falcon repo at `docs/deployment/DEPLOYING.md`, section
"MLX evaluation server".
