# Wave W1+W2 — Nội dung AI Engineer + UI/UX Overhaul — Design Spec

> Ngày: 2026-07-02 · Repo: `kyle41io/Interview-Prepare` · Spec chị em: `2026-07-02-phase-cde-pro-ai-gmail-design.md`
> Không backend, không build step — thuần nội dung + frontend. Ship trước C/D/E.

## 1. Mục tiêu
(W1) Bật track **AI Engineer** với bộ kiến thức đầy đủ-nhưng-cô-đọng. (W2) Nâng trải nghiệm đọc/điều hướng lên mức chuyên nghiệp; sửa dứt điểm "cheat sheet dài vô hạn".

## 2. Phi mục tiêu
Không đụng backend/Supabase; không thêm Pro/chat/Gmail (spec C/D/E); không đổi kiến trúc `IP.*`/PREP; không viết lại nội dung topic cũ (chỉ sửa cách hiển thị).

---

## W1 — Nội dung AI Engineer

### 3. Category & topics mới
- Category mới trong `CATS` (app.js): `{ id:"ai", vi:"AI & Data", en:"AI & Data" }` + `ICON.ai = "fa-solid fa-robot"`, đặt sau `backend`, trước `devops`.
- 6 file mới trong `assets/data/` (schema y hệt topic hiện có — bilingual `{vi,en}`, blocks prose/list/table/code/callout, flashcards ~10-12, quiz ~10, kết bằng callout `soundbite`):

| id | icon | Tiêu đề | Nội dung cốt lõi (mỗi topic 7–10 section) |
|---|---|---|---|
| `python-ai` | 🐍 | Python cho AI & Backend | syntax cốt lõi, list/dict/comprehension, hàm & OOP nhanh, exception, venv/pip, typing, numpy/pandas căn bản, async sơ lược |
| `ml-foundations` | 📊 | Machine Learning Foundations | supervised vs unsupervised, train/val/test, bias-variance & overfitting, regularization, metrics (accuracy/P/R/F1/AUC), linear/logistic, tree/RF/boosting, k-means/PCA, feature engineering |
| `dl-nlp` | 🧠 | Deep Learning & NLP | neuron→MLP, backprop trực giác, activation/loss/optimizer, CNN/RNN ngắn, **Transformer & attention**, tokenization, embeddings, transfer learning |
| `llms` | 🤖 | Large Language Models | pretraining→SFT→RLHF, context window, sampling params, hallucination & mitigation, đánh giá LLM, prompt vs finetune vs RAG, chi phí/token, an toàn |
| `rag` | 📚 | RAG | vì sao RAG, chunking, embeddings & vector DB, retrieval (dense/sparse/hybrid), rerank, ráp prompt, đánh giá (faithfulness/recall), pitfalls |
| `ai-engineering` | 🛠 | AI Engineering thực chiến | prompt engineering patterns, structured output, function calling/agents, guardrails, caching/cost control, serving & monitoring (MLOps-lite), ethics ngắn |

### 4. Track
`assets/data/tracks.js`: track `ai-engineer` bỏ `comingSoon`, `items: ["python-ai","ml-foundations","dl-nlp","llms","rag","ai-engineering","system-design","behavioral"]`; role `ai-engineer` bỏ `comingSoon`. Load 6 file mới trong `index.html` trước `tracks.js`.

### 5. Chất lượng nội dung
Chuẩn như các topic gần đây (networking/nodejs): giải thích trực giác trước, thuật ngữ giữ tiếng Anh, bảng so sánh, code ví dụ Python ngắn, callout tip/warning/soundbite; escape HTML đúng quy tắc hiện hành; `node --check` + smoke-load từng file.

---

## W2 — UI/UX Overhaul

### 6. Cheat sheet → trang riêng
- **Gỡ toàn bộ khối cheat sheet khỏi `renderHome`**. Home chỉ còn 1 card nhỏ "🎯 Cheat sheet ngày phỏng vấn — N câu" (data-mode-cheat) dẫn tới trang mới.
- Mode mới `cheat` trong `render()` + `renderCheatsheet()`:
  - Gom soundbite theo **topic**, mỗi topic là một **accordion** (mặc định gập; mở/gập từng cái; nút "Mở tất cả/Gập tất cả").
  - **Lọc theo track hiện tại** (toggle "Chỉ lộ trình của tôi" — mặc định BẬT khi có track) + đếm số câu mỗi nhóm.
  - Vào từ: card ở Home + mục trong profile menu. Persist trạng thái filter (localStorage UI-key, không sync).

### 7. Trải nghiệm đọc topic
- **Mục lục "Trong bài này"**: panel phải sticky (desktop ≥1280px; ẩn dưới đó) liệt kê section, highlight section đang xem (IntersectionObserver), click cuộn mượt.
- **Code block**: nút copy (icon, feedback "✓") góc phải mỗi `pre.code`; caption giữ nguyên.
- **Typography pass** (styles.css): content measure ~72ch; scale heading nhất quán; line-height 1.7 prose; bảng: header sticky nhẹ + hover row; spacing giữa block chuẩn hoá; callout tinh chỉnh (icon + viền trái đồng bộ variant).
- Section navigation cuối bài: prev/next topic theo track (đang có next → thêm prev, style lại).

### 8. Home gọn lại
- Hero thu nhỏ (1 dòng tagline), "Tiếp tục học" là khối nổi bật nhất.
- Stats gộp 1 hàng compact (4 ô nhỏ).
- Topic grid **nhóm theo category** với tiêu đề nhóm (icon + tên + đếm), thứ tự CATS.
- Card cheat sheet nhỏ (mục 6).

### 9. Polish chung
- Icon/badge/nút: kích thước & khoảng cách thống nhất; PRO badge dùng chung 1 component style.
- Light mode: rà contrast (muted text ≥ 4.5:1 trên panel), focus-visible ring cho phần tử tương tác.
- Mobile: TOC ẩn, cheat page accordion thân thiện chạm, bảng cuộn ngang có gợi ý bóng.

### 10. Ranh giới & kỹ thuật
- Không thêm module `IP.*` mới; `renderCheatsheet`/TOC/copy nằm trong `app.js` (helpers cạnh render hiện có); CSS thêm cuối `styles.css` theo token var(--…) cả 2 theme.
- Mode `cheat` phải hoà vào: dispatch `render()`, `saveView/loadView` (mode mới hợp lệ), sidebar giữ nguyên trạng thái.

## 11. Kiểm thử
- 6 topic mới: `node --check` + smoke-load (PREP.register OK, đếm sections/fc/quiz) — script verify như các content task trước.
- `node --test tests/` 42/42 không hồi quy.
- Checklist thủ công: track AI hiện & học được; cheat page (accordion/filter/count); TOC highlight + click; copy code; Home mới cả 2 theme + mobile; scroll-restore vẫn đúng với mode mới.

## 12. Nghiệm thu
1. Onboarding hiện AI Engineer chọn được; track 8 mục học tuần tự, tiến độ chạy.
2. Home không còn danh sách cheat dài; card dẫn tới trang cheat hoạt động đủ (accordion, filter theo track, mở/gập tất cả).
3. Topic dài có TOC hoạt động; mọi code block copy được.
4. Cả light/dark + mobile không vỡ; 42/42 test xanh; site vẫn no-build.

## 13. Chiến lược commit
1. `content(ai)`: 6 topic (mỗi topic 1 commit hoặc gộp 2-3 hợp lý) 2. `feat: activate AI Engineer track + category` 3. `feat(ui): cheat sheet page` 4. `feat(ui): topic TOC + code copy` 5. `feat(ui): home restructure` 6. `style(ui): typography + polish pass`.
