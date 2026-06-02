# Day 04 Lab v2 Report - Research Agent

## Team

- Team: NguyenPhuongNam_2A202600962
- Members: Nguyen Phuong Nam; teammate 2; teammate 3
- Provider/model used for base eval: `openai` / `gpt-4o-mini`
- Main artifact version: `v3`

---

# Phan A - Gioi Thieu Agent

## A1. Agent nay lam duoc gi

AI Research Agent la mot tro ly nghien cuu co kha nang goi tool that. Agent nhan request cua user, phan tich y dinh, chon tool phu hop, truyen dung arguments, chay tool, va luu lai JSON log de nhom doc loi va toi uu prompt/tool declaration qua tung version.

Agent co the tim tin web, doc URL, tim tweet theo tai khoan hoac chu de, tim paper arXiv, trich text tu paper, tra cuu policy noi bo, kiem tra chat luong nguon, format digest, va gui Telegram sau khi user xac nhan.

**Link dung thu (deploy):**

> URL: chua dien public URL. Neu chay local/Vercel, dung Cloudflare Tunnel cho backend local va cap nhat link FE/BE tai day.

## A2. Tool agent co

| Ten tool | Lam duoc gi | Tool moi nhom them? |
|---|---|---|
| `clarify` | Hoi lai khi thieu account, URL, topic, hoac can xac nhan hanh dong. | Khong |
| `timeline` | Lay tweet/bai dang moi nhat tu mot tai khoan Twitter/X cu the. | Khong |
| `social_search` | Tim tweet/bai dang tren Twitter/X theo tu khoa hoac chu de. | Khong |
| `lookup` | Tim kiem web cho tin tuc, su kien hien tai, hoac thong tin tong quat. | Khong |
| `fetch` | Doc/tom tat noi dung tu URL cu the. | Khong |
| `format` | Dinh dang cac item nghien cuu thanh markdown digest. | Khong |
| `source_check` | Kiem tra duplicate URL, domain doc lap, URL khong hop le, HTTP khong an toan, hoac thieu nhan source. | Co |
| `send` | Gui text len Telegram sau khi co xac nhan. | Bonus/action |
| `policy` | Tim trong tai lieu chinh sach noi bo. | Bonus |
| `papers` | Tim paper hoc thuat tren arXiv. | Bonus |
| `paper_text` | Tai PDF arXiv va trich text. | Bonus |
| `weather_by_region` | Lay thoi tiet/du bao theo khu vuc; fallback sang web search neu can. | Co |
| `trend_analyzer` | Phan tich text/posts de lay keyword, trend va sentiment don gian. | Co |

Tong cong hien co 13 tool trong `artifacts/tools.yaml` va `tools/__init__.py`.

## A3. Cau hoi mau de thu

1. Tin tuc AI hom nay co gi noi bat?
2. Tom tat bai nay giup minh: https://openai.com/research/
3. Lay 3 tweet moi nhat cua Sam Altman.
4. Moi nguoi dang ban gi ve GPT-5 tren Twitter?
5. Tim paper ve AI agent evaluation tren arXiv.
6. Kiem tra cac nguon nay da du da dang de trich dan chua.
7. Thoi tiet Ha Noi hom nay the nao?
8. Dang ban tin nay len Telegram giup minh. Agent phai hoi xac nhan truoc khi gui.

---

# Phan B - Chi Tiet / Bang Chung

## B1. Version Evidence

Nguon: `artifacts/version_log.csv` va cac file trong `runs/*.json`.

| Version | Changed Artifact | Hypothesis | Metric Before | Metric After | Run File |
|---|---|---|---|---|---|
| `v0` | baseline | Do hanh vi starter prompt/tool declaration truoc khi toi uu. | N/A | case_accuracy=0.70; routing=0.75; args=0.70; multiturn=1.00 | `runs/v0_B_base_openai_20260602T145243785021.json` |
| `v1` | `system_prompt.md`; `tools.yaml`; `tools/source_check` | Neu model duoc noi ro khong doan account/URL va tool description co source boundary, routing/argument accuracy se tang. | case_accuracy=0.70; routing=0.75; args=0.70; multiturn=1.00 | case_accuracy=0.90; routing=0.95; args=0.90; multiturn=1.00 | `runs/v1_B_base_openai_20260602T145404240292.json` |
| `v2` | `system_prompt.md` | Generic "latest tweets" request khong co account/topic phai `clarify`, khong duoc search tu chung chung. | case_accuracy=0.90; routing=0.95; args=0.90; multiturn=1.00 | case_accuracy=1.00; routing=1.00; args=1.00; multiturn=1.00 | `runs/v2_B_base_openai_20260602T145748949427.json` |
| `v3` | `system_prompt.md` | Request send/post/publish chua xac nhan phai hoi yes/no confirmation de giu action boundary on dinh. | case_accuracy=1.00; routing=1.00; args=1.00; multiturn=1.00 | case_accuracy=1.00; routing=1.00; args=1.00; multiturn=1.00 | `runs/v3_B_base_openai_20260602T145933780121.json` |

Summary:

- `v0`: 14/20 pass.
- `v1`: 18/20 pass.
- `v2`: 20/20 pass.
- `v3`: 20/20 pass.

## B2. Failure Analysis

Nguon: `runs/v0_B_base_openai_20260602T145243785021.json` va `runs/v1_B_base_openai_20260602T145404240292.json`.

| Case ID | Failure Type | Actual Tool Calls | What Failed | Fix |
|---|---|---|---|---|
| `R03_web_news_routing` | wrong_tool / wrong_arg_value | `lookup(query="AI news", topic="news", timeframe="day")` | Query expected `AI`, model them chu "news" vao query. | Them arg convention: news la `topic=news`, query chi giu chu de chinh. |
| `R08_out_of_scope` | out_of_scope | `lookup(query="nguyen ham cua x^2")` | Cau hoi toan ngoai pham vi nhung agent van goi web search. | Them boundary: math/coding/homework ngoai pham vi thi khong goi tool. |
| `R10_missing_handle` | missing_info | `timeline(screenname="sama")` o `v0`; `social_search(query="tom tat")` o `v1` | Request tweet moi nhat thieu account nhung agent doan Sam Altman hoac search tu chung chung. | `v2` them rule: latest tweets/posts co so luong nhung thieu account/topic thi goi `clarify`. |
| `R11_missing_url` | missing_info | `fetch(url="https://example.com/article")` | User noi "bai nay" nhung khong co URL, agent tu bia URL. | Them rule khong invent URL, phai `clarify`. |
| `R12_confirm_before_send` | wrong_boundary | `send(...)` o `v0`; `clarify(response_type="text")` o `v1` | Action Telegram can yes/no confirmation, khong duoc gui ngay hoac hoi mo. | `v3` them rule: unconfirmed send/post/publish phai `clarify(response_type="yes_no")`. |
| `R13_parallel_web_and_tweets` | wrong_tool | `lookup(...)` + `timeline(screenname="sama")` | Request can web news va tweet theo topic, agent dung timeline sai tai khoan. | Them rule cho multi-tool: neu request can nhieu source thi goi tat ca tool can thiet; tweet theo topic dung `social_search`. |

## B3. Team Eval Cases

Group eval hien tai co 3 cases trong `data/eval_group.json`. Run moi nhat:

- File: `runs/v2_B_group_openrouter_20260602T155152045375.json`
- Result: 3/3 pass.
- Metrics: case_accuracy=1.00; routing=1.00; args=1.00; multiturn=1.00.

| Case ID | What It Tests | Expected Tool/Behavior | Result |
|---|---|---|---|
| `G01_weather_routing` | Weather query co region cu the. | `weather_by_region(region="Ha Noi")` | PASS |
| `G02_weather_missing_region` | Weather query thieu region. | `clarify(response_type="text")` | PASS |
| `G03_trend_analyzer_routing` | Multi-turn: sau khi co context Twitter, user yeu cau phan tich trend/sentiment. | `trend_analyzer` | PASS |

Note: README yeu cau nhom nen co 10 group eval cases, gom 5 single-turn va 5 multi-turn. File hien tai moi co 3 cases, nen neu can dat dung day du scope thi can bo sung them 7 cases.

## B4. Live Chat Evidence

Nguon: `transcripts/session-new-1780390889221.transcript.json`.

| Turn | User Request | Tool Calls | Version Evidence | Outcome |
|---|---|---|---|---|
| 1 | "cac tools hien toi co" | none | UI transcript `session-new-1780390889221` | Agent tra loi kha nang/tool cua no. |
| 2 | "lay thong tin bao twitter moi" | `clarify` | UI transcript `session-new-1780390889221` | Agent hoi lai tai khoan Twitter nao, dung boundary missing_info. |
| 3 | "@FortyGuard" | `timeline` | UI transcript `session-new-1780390889221` | Agent lay latest tweets tu account duoc cung cap. |

Transcript files hien co:

- `transcripts/mock.json`
- `transcripts/session-03.transcript.json`
- `transcripts/session-new-1780390889221.transcript.json`
- `transcripts/test.json`

## B5. Tool / Smoke Test Evidence

### Provider / eval

| Check | Result | Evidence |
|---|---|---|
| OpenAI preflight | PASS | `OK provider=openai model=gpt-4o-mini`; test tool call `timeline(screenname="sama", limit=1)` |
| Base eval `v0` | PASS run completed | 20 measured cases, 14 pass |
| Base eval `v1` | PASS run completed | 20 measured cases, 18 pass |
| Base eval `v2` | PASS run completed | 20 measured cases, 20 pass |
| Base eval `v3` | PASS run completed | 20 measured cases, 20 pass |
| Group eval `v2` | PASS run completed | 3 measured cases, 3 pass |

### Tool smoke tests

| Tool | Smoke Result | Notes |
|---|---|---|
| `clarify` | PASS | Returned `awaiting_user=True`. |
| `format` | PASS | Rendered markdown digest. |
| `source_check` | PASS | Returned one checked source item, recommendation `ok`. |
| `policy` | PASS | Returned 1 policy result. |
| `lookup` | PASS | Returned 1 Tavily item. |
| `fetch` | PASS | Returned 1 Firecrawl item. |
| `papers` | PASS | Returned 1 arXiv item. |
| `paper_text` | PASS after installing deps | Initially failed because `pypdf` was missing; after `pip install -r requirements.txt`, returned `chars_returned=1000`. |
| `send` with `confirmed=False` | PASS | Returned `needs_confirmation`; did not send. |
| `send` with `confirmed=True` | PASS | Telegram returned `{'tool': 'send_telegram', 'status': 'sent'}`. |
| `timeline` | FAIL live smoke | RapidAPI returned `403 Forbidden`; likely subscription/key permission issue. |
| `social_search` | FAIL live smoke | RapidAPI returned `429 Too Many Requests`; likely quota/rate limit issue. |

### Test suite status

Latest run:

```text
python -m unittest discover -s tests -v
```

Result:

- `test_sanitizer`: 3 tests PASS.
- `test_source_check`: 2 tests PASS.
- `test_tool_cli_main`: FAIL in current workspace.

Reason for current CLI failures:

- `tests/test_tool_cli_main.py` expects every `tools/<tool>/tool.py` to expose `main()` and support direct `--help`.
- Current `tool.py` files do not expose `main()` in this workspace state, and direct execution like `python tools/fetch/tool.py --help` cannot import `tools._shared` without a path bootstrap.
- This CLI test is useful for future smoke-test ergonomics, but it is not required for base eval scoring. If kept, it should be fixed before final submission or removed from submitted tests.

## B6. Bonus Evidence

| Bonus | Evidence File | What Worked | Risk / Guardrail |
|---|---|---|---|
| Telegram `send` | Direct smoke test via `tools.send` | `confirmed=True` returned `status='sent'`; `confirmed=False` returned `needs_confirmation`. | Prompt requires `clarify(response_type=yes_no)` before send/post/publish. |
| arXiv tools | Direct smoke tests for `papers` and `paper_text` | `papers` returned arXiv item; `paper_text` extracted text after installing `pypdf`. | arXiv may rate-limit; tool has in-process delay. |
| Company policy | Direct smoke test for `policy` | Returned 1 policy result for citation rules. | Retrieved markdown is treated as untrusted content in tool output. |
| UI / Backend | Backend has FastAPI app at `backend.main:app`; frontend is Next.js in `frontend/`. | BE can run with `python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`; FE with `pnpm run dev`. | Vercel FE cannot call `localhost`; use Cloudflare Tunnel and CORS. |

## B7. Reflection

- Fixes that belonged in `system_prompt.md`: no guessing missing account/URL, out-of-scope refusal/no-tool, multi-turn carryover/correction, multi-tool behavior, and send confirmation boundary.
- Fixes that belonged in `tools.yaml`: clearer tool descriptions, argument conventions, and source boundary descriptions so the model can route among `timeline`, `social_search`, `lookup`, `fetch`, `clarify`, and `send`.
- Failure needing manual review: RapidAPI live tool failures (`timeline` 403 and `social_search` 429) are external API/subscription/quota issues, not necessarily routing failures.
- What to improve next:
  - Add 7 more group eval cases to reach README target of 10 cases.
  - Fix or remove `test_tool_cli_main.py` before final if the team wants clean unit tests.
  - Re-check RapidAPI Twitter API45 subscription/quota.
  - Add a public deployment URL and CORS configuration for Vercel FE -> local BE tunnel.
