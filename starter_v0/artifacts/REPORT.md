# Day 04 Lab v2 Report - Research Agent

## Team

- Team: NguyenPhuongNam_2A202600962
- Members: Nguyen Phuong Nam; Ho Tat Bao Hoang 2A202600699; Nguyen Vu Trong 2A202600960
- Provider/model dùng cho base eval: `openai` / `gpt-4o-mini`
- Phiên bản artifact chính: `v3`

---

# Phần A - Giới Thiệu Agent

## A1. Agent này làm được gì

AI Research Agent là một trợ lý nghiên cứu có khả năng gọi tool thật. Agent nhận request của user, phân tích ý định, chọn tool phù hợp, truyền đúng arguments, chạy tool, và lưu lại JSON log để nhóm đọc lỗi và tối ưu prompt/tool declaration qua từng version.

Agent có thể tìm tin web, đọc URL, tìm tweet theo tài khoản hoặc chủ đề, tìm paper arXiv, trích text từ paper, tra cứu policy nội bộ, kiểm tra chất lượng nguồn, format digest, và gửi Telegram sau khi user xác nhận.

**Link dùng thử (deploy):**

> URL: chưa điền public URL. Nếu chạy local/Vercel, dùng Cloudflare Tunnel cho backend local và cập nhật link FE/BE tại đây.

## A2. Tool agent có

| Tên tool | Làm được gì | Tool mới nhóm thêm? |
|---|---|---|
| `clarify` | Hỏi lại khi thiếu account, URL, topic, hoặc cần xác nhận hành động. | Không |
| `timeline` | Lấy tweet/bài đăng mới nhất từ một tài khoản Twitter/X cụ thể. | Không |
| `social_search` | Tìm tweet/bài đăng trên Twitter/X theo từ khóa hoặc chủ đề. | Không |
| `lookup` | Tìm kiếm web cho tin tức, sự kiện hiện tại, hoặc thông tin tổng quát. | Không |
| `fetch` | Đọc/tóm tắt nội dung từ URL cụ thể. | Không |
| `format` | Định dạng các item nghiên cứu thành markdown digest. | Không |
| `source_check` | Kiểm tra duplicate URL, domain độc lập, URL không hợp lệ, HTTP không an toàn, hoặc thiếu nhãn source. | Có |
| `send` | Gửi text lên Telegram sau khi có xác nhận. | Bonus/action |
| `policy` | Tìm trong tài liệu chính sách nội bộ. | Bonus |
| `papers` | Tìm paper học thuật trên arXiv. | Bonus |
| `paper_text` | Tải PDF arXiv và trích text. | Bonus |
| `weather_by_region` | Lấy thời tiết/dự báo theo khu vực; fallback sang web search nếu cần. | Có |
| `trend_analyzer` | Phân tích text/posts để lấy keyword, trend và sentiment đơn giản. | Có |

Tổng cộng hiện có 13 tool trong `artifacts/tools.yaml` và `tools/__init__.py`.

## A3. Câu hỏi mẫu để thử

1. Tin tức AI hôm nay có gì nổi bật?
2. Tóm tắt bài này giúp mình: https://openai.com/research/
3. Lấy 3 tweet mới nhất của Sam Altman.
4. Mọi người đang bàn gì về GPT-5 trên Twitter?
5. Tìm paper về AI agent evaluation trên arXiv.
6. Kiểm tra các nguồn này đã đủ đa dạng để trích dẫn chưa.
7. Thời tiết Hà Nội hôm nay thế nào?
8. Đăng bản tin này lên Telegram giúp mình. Agent phải hỏi xác nhận trước khi gửi.

---

# Phần B - Chi Tiết / Bằng Chứng

## B1. Version Evidence

Nguồn: `artifacts/version_log.csv` và các file trong `runs/*.json`.

| Version | Changed Artifact | Hypothesis | Metric Before | Metric After | Run File |
|---|---|---|---|---|---|
| `v0` | baseline | Đo hành vi starter prompt/tool declaration trước khi tối ưu. | N/A | case_accuracy=0.70; routing=0.75; args=0.70; multiturn=1.00 | `runs/v0_B_base_openai_20260602T145243785021.json` |
| `v1` | `system_prompt.md`; `tools.yaml`; `tools/source_check` | Nếu model được nói rõ không đoán account/URL và tool description có source boundary, routing/argument accuracy sẽ tăng. | case_accuracy=0.70; routing=0.75; args=0.70; multiturn=1.00 | case_accuracy=0.90; routing=0.95; args=0.90; multiturn=1.00 | `runs/v1_B_base_openai_20260602T145404240292.json` |
| `v2` | `system_prompt.md` | Generic "latest tweets" request không có account/topic phải `clarify`, không được search từ chung chung. | case_accuracy=0.90; routing=0.95; args=0.90; multiturn=1.00 | case_accuracy=1.00; routing=1.00; args=1.00; multiturn=1.00 | `runs/v2_B_base_openai_20260602T145748949427.json` |
| `v3` | `system_prompt.md` | Request send/post/publish chưa xác nhận phải hỏi yes/no confirmation để giữ action boundary ổn định. | case_accuracy=1.00; routing=1.00; args=1.00; multiturn=1.00 | case_accuracy=1.00; routing=1.00; args=1.00; multiturn=1.00 | `runs/v3_B_base_openai_20260602T145933780121.json` |

Tóm tắt:

- `v0`: 14/20 pass.
- `v1`: 18/20 pass.
- `v2`: 20/20 pass.
- `v3`: 20/20 pass.

## B2. Failure Analysis

Nguồn: `runs/v0_B_base_openai_20260602T145243785021.json` và `runs/v1_B_base_openai_20260602T145404240292.json`.

| Case ID | Failure Type | Actual Tool Calls | What Failed | Fix |
|---|---|---|---|---|
| `R03_web_news_routing` | wrong_tool / wrong_arg_value | `lookup(query="AI news", topic="news", timeframe="day")` | Query expected `AI`, model thêm chữ "news" vào query. | Thêm arg convention: news là `topic=news`, query chỉ giữ chủ đề chính. |
| `R08_out_of_scope` | out_of_scope | `lookup(query="nguyên hàm của x^2")` | Câu hỏi toán ngoài phạm vi nhưng agent vẫn gọi web search. | Thêm boundary: math/coding/homework ngoài phạm vi thì không gọi tool. |
| `R10_missing_handle` | missing_info | `timeline(screenname="sama")` ở `v0`; `social_search(query="tóm tắt")` ở `v1` | Request tweet mới nhất thiếu account nhưng agent đoán Sam Altman hoặc search từ chung chung. | `v2` thêm rule: latest tweets/posts có số lượng nhưng thiếu account/topic thì gọi `clarify`. |
| `R11_missing_url` | missing_info | `fetch(url="https://example.com/article")` | User nói "bài này" nhưng không có URL, agent tự bịa URL. | Thêm rule không invent URL, phải `clarify`. |
| `R12_confirm_before_send` | wrong_boundary | `send(...)` ở `v0`; `clarify(response_type="text")` ở `v1` | Action Telegram cần yes/no confirmation, không được gửi ngay hoặc hỏi mở. | `v3` thêm rule: unconfirmed send/post/publish phải `clarify(response_type="yes_no")`. |
| `R13_parallel_web_and_tweets` | wrong_tool | `lookup(...)` + `timeline(screenname="sama")` | Request cần web news và tweet theo topic, agent dùng timeline sai tài khoản. | Thêm rule cho multi-tool: nếu request cần nhiều source thì gọi tất cả tool cần thiết; tweet theo topic dùng `social_search`. |

## B3. Team Eval Cases

Group eval hiện tại có 3 cases trong `data/eval_group.json`. Run mới nhất:

- File: `runs/v2_B_group_openrouter_20260602T155152045375.json`
- Result: 3/3 pass.
- Metrics: case_accuracy=1.00; routing=1.00; args=1.00; multiturn=1.00.

| Case ID | What It Tests | Expected Tool/Behavior | Result |
|---|---|---|---|
| `G01_weather_routing` | Weather query có region cụ thể. | `weather_by_region(region="Hà Nội")` | PASS |
| `G02_weather_missing_region` | Weather query thiếu region. | `clarify(response_type="text")` | PASS |
| `G03_trend_analyzer_routing` | Multi-turn: sau khi có context Twitter, user yêu cầu phân tích trend/sentiment. | `trend_analyzer` | PASS |

Note: README yêu cầu nhóm nên có 10 group eval cases, gồm 5 single-turn và 5 multi-turn. File hiện tại mới có 3 cases, nên nếu cần đạt đúng đầy đủ scope thì cần bổ sung thêm 7 cases.

## B4. Live Chat Evidence

Nguồn: `transcripts/session-new-1780390889221.transcript.json`.

| Turn | User Request | Tool Calls | Version Evidence | Outcome |
|---|---|---|---|---|
| 1 | "các tools hiện tôi có" | none | UI transcript `session-new-1780390889221` | Agent trả lời khả năng/tool của nó. |
| 2 | "lấy thông tin báo twitter mới" | `clarify` | UI transcript `session-new-1780390889221` | Agent hỏi lại tài khoản Twitter nào, đúng boundary missing_info. |
| 3 | "@FortyGuard" | `timeline` | UI transcript `session-new-1780390889221` | Agent lấy latest tweets từ account được cung cấp. |

Transcript files hiện có:

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

- Fixes that belonged in `system_prompt.md`: không đoán missing account/URL, từ chối/no-tool cho out-of-scope, carryover/correction trong multi-turn, multi-tool behavior, và send confirmation boundary.
- Fixes that belonged in `tools.yaml`: mô tả tool rõ hơn, convention cho arguments, và source boundary để model route đúng giữa `timeline`, `social_search`, `lookup`, `fetch`, `clarify`, và `send`.
- Failure needing manual review: RapidAPI live tool failures (`timeline` 403 và `social_search` 429) là vấn đề API/subscription/quota bên ngoài, không nhất thiết là lỗi routing.
- What to improve next:
  - Thêm 7 group eval cases để đạt target 10 cases trong README.
  - Fix hoặc remove `test_tool_cli_main.py` trước bản nộp cuối nếu team muốn unit tests sạch.
  - Re-check RapidAPI Twitter API45 subscription/quota.
  - Thêm public deployment URL và cấu hình CORS cho Vercel FE -> local BE tunnel.
