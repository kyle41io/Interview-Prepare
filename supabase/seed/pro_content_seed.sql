-- Phase C Task 7: seed 4 Pro deep-dive sections + catalog entries.
-- Idempotent: safe to re-run (on conflict upsert on (topic_id, position)).
-- Run AFTER supabase/migrations/0002_pro.sql, in the Supabase SQL Editor.

-- ============================================================
-- 1) system-design — URL Shortener end-to-end case study
-- ============================================================
insert into public.pro_catalog (topic_id, position, title)
values (
  'system-design', 0,
  $json$
  {"vi":"Case study: Thiết kế URL Shortener end-to-end","en":"Case study: Designing a URL Shortener end-to-end"}
  $json$::jsonb
)
on conflict (topic_id, position) do update set title = excluded.title;

insert into public.pro_content (topic_id, position, section)
values (
  'system-design', 0,
  $json$
  {
    "id": "case-study-url-shortener",
    "title": {"vi":"Case study: Thiết kế URL Shortener end-to-end","en":"Case study: Designing a URL Shortener end-to-end"},
    "blocks": [
      {"type":"prose",
        "vi":"Đây là bài áp dụng khung 7 bước vào một đề bài kinh điển: thiết kế dịch vụ rút gọn URL kiểu <code>bit.ly</code>. Yêu cầu: rút gọn URL dài thành mã ngắn, redirect &lt;100ms p99, hỗ trợ ~100M URL mới/tháng, tỉ lệ đọc:ghi khoảng 100:1.",
        "en":"This applies the 7-step framework to a classic prompt: design a URL-shortening service like <code>bit.ly</code>. Requirements: shorten a long URL to a short code, redirect at &lt;100ms p99, support ~100M new URLs/month, read:write ratio around 100:1."},
      {"type":"list","ordered":true,"items":[
        {"vi":"<b>Ước lượng:</b> 100M URL/tháng ≈ 40 write/s trung bình; đọc:ghi 100:1 → ~4000 read/s trung bình, đỉnh gấp 5-10 lần. Lưu trữ: mỗi record ~500 byte × 100M/tháng × 5 năm ≈ 3TB.",
         "en":"<b>Estimate:</b> 100M URLs/month ≈ 40 writes/s average; 100:1 read:write → ~4000 reads/s average, peak 5-10x. Storage: ~500 bytes/record × 100M/month × 5 years ≈ 3TB."},
        {"vi":"<b>API:</b> <code>POST /shorten {longUrl, customAlias?, expiresAt?} → {shortUrl}</code> và <code>GET /{code} → 301/302 redirect</code>.",
         "en":"<b>API:</b> <code>POST /shorten {longUrl, customAlias?, expiresAt?} → {shortUrl}</code> and <code>GET /{code} → 301/302 redirect</code>."},
        {"vi":"<b>Sinh mã ngắn:</b> hai lựa chọn chính — (a) <b>base62 encode</b> một auto-increment ID (đơn giản, cần bộ đếm phân tán như Snowflake/Zookeeper); (b) <b>hash</b> (MD5/SHA) longUrl rồi lấy 7 ký tự đầu, xử lý va chạm bằng cách thêm salt. Base62 trên ID phân tán thường được ưa chuộng vì tránh va chạm hoàn toàn.",
         "en":"<b>Short-code generation:</b> two main options — (a) <b>base62-encode</b> an auto-increment ID (simple, needs a distributed counter like Snowflake/Zookeeper); (b) <b>hash</b> the longUrl (MD5/SHA) and take the first 7 chars, handling collisions with a salt. Base62 over a distributed ID is usually preferred since it avoids collisions entirely."},
        {"vi":"<b>High-level:</b> Client → CDN/LB → App servers (stateless) → Cache (Redis, cache-aside) → DB (key-value, ví dụ DynamoDB/Cassandra) → Async analytics queue (Kafka) cho click tracking.",
         "en":"<b>High-level:</b> Client → CDN/LB → App servers (stateless) → Cache (Redis, cache-aside) → DB (key-value, e.g. DynamoDB/Cassandra) → Async analytics queue (Kafka) for click tracking."}
      ]},
      {"type":"table",
        "headers":{"vi":["Thành phần","Lựa chọn","Vì sao"],"en":["Component","Choice","Why"]},
        "rows":[
          {"vi":["Database","Key-value (DynamoDB/Cassandra)","Truy vấn theo key đơn giản, cần scale ghi cao, không cần join/transaction phức tạp"],
           "en":["Database","Key-value (DynamoDB/Cassandra)","Simple key lookups, needs high write scale, no complex joins/transactions"]},
          {"vi":["Cache","Redis, cache-aside, TTL theo popularity","Đọc:ghi 100:1 → cache giảm tải DB rất nhiều; hot keys (viral links) cần cache"],
           "en":["Cache","Redis, cache-aside, TTL by popularity","100:1 read:write → cache massively offloads the DB; hot keys (viral links) need caching"]},
          {"vi":["ID generation","Base62 trên Snowflake ID","Không cần khóa toàn cục, phân tán tốt, sắp xếp gần đúng theo thời gian"],
           "en":["ID generation","Base62 over a Snowflake ID","No global lock needed, scales well, roughly time-sortable"]}
        ]},
      {"type":"code",
        "code":"function encodeBase62(num) {\n  const chars = \"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\";\n  let s = \"\";\n  while (num > 0) {\n    s = chars[num % 62] + s;\n    num = Math.floor(num / 62);\n  }\n  return s || \"0\";\n}\n// id 125 -> \"21\" (base62), 7 ky tu du cho ~3.5 nghin ty URL",
        "caption":{"vi":"Base62 encode một ID số thành mã ngắn","en":"Base62-encoding a numeric ID into a short code"}},
      {"type":"callout","variant":"key",
        "vi":"Điểm cần đào sâu khi phỏng vấn hỏi thêm: (1) <b>redirect 301 vs 302</b> — 301 (permanent) cache được ở browser/CDN nên giảm tải server nhưng mất khả năng track click, 302 (temporary) luôn qua server nên track được analytics; hầu hết dịch vụ thật dùng 302. (2) <b>Custom alias & hết hạn</b> cần kiểm tra trùng ở DB trước khi ghi. (3) <b>Sharding</b> DB theo hash(code) khi 3TB vượt quá 1 node.",
        "en":"Deep-dive points if pressed further: (1) <b>301 vs 302 redirect</b> — 301 (permanent) is cacheable by browsers/CDNs, reducing server load, but loses click-tracking ability; 302 (temporary) always hits the server so analytics can be tracked; most real services use 302. (2) <b>Custom alias & expiry</b> need a uniqueness check against the DB before writing. (3) <b>Sharding</b> the DB by hash(code) once 3TB exceeds a single node."},
      {"type":"callout","variant":"soundbite",
        "vi":"\"Em sẽ dùng base62 trên một bộ đếm phân tán kiểu Snowflake để sinh mã, tránh hoàn toàn va chạm; đọc thì cache-aside với Redis vì tỉ lệ đọc:ghi rất lệch — 100:1. Redirect dùng 302 để giữ khả năng track click.\"",
        "en":"\"I'd use base62 over a Snowflake-style distributed counter to generate codes, avoiding collisions entirely; reads go through a Redis cache-aside layer since the read:write ratio is very skewed — 100:1. Redirects use 302 to keep click-tracking possible.\""}
    ]
  }
  $json$::jsonb
)
on conflict (topic_id, position) do update set section = excluded.section;

-- ============================================================
-- 2) microservices — Saga pattern & distributed transactions
-- ============================================================
insert into public.pro_catalog (topic_id, position, title)
values (
  'microservices', 0,
  $json$
  {"vi":"Saga pattern & distributed transactions chuyên sâu","en":"Saga pattern & distributed transactions deep-dive"}
  $json$::jsonb
)
on conflict (topic_id, position) do update set title = excluded.title;

insert into public.pro_content (topic_id, position, section)
values (
  'microservices', 0,
  $json$
  {
    "id": "saga-distributed-transactions",
    "title": {"vi":"Saga pattern & distributed transactions chuyên sâu","en":"Saga pattern & distributed transactions deep-dive"},
    "blocks": [
      {"type":"prose",
        "vi":"Trong kiến trúc microservices, mỗi service có DB riêng nên không thể dùng một <code>ACID transaction</code> xuyên nhiều service. <b>Saga pattern</b> giải quyết vấn đề này bằng một chuỗi các local transaction, mỗi bước có một <b>compensating transaction</b> để hoàn tác nếu bước sau thất bại.",
        "en":"In microservices, each service owns its own DB so a single <code>ACID transaction</code> cannot span multiple services. The <b>Saga pattern</b> solves this with a sequence of local transactions, each with a <b>compensating transaction</b> to undo it if a later step fails."},
      {"type":"list","ordered":false,"items":[
        {"vi":"<b>Choreography:</b> mỗi service publish event sau khi hoàn thành, service kế tiếp subscribe và tự quyết định hành động. Không có nhạc trưởng trung tâm.",
         "en":"<b>Choreography:</b> each service publishes an event after completing its step, and the next service subscribes and decides its own action. No central coordinator."},
        {"vi":"<b>Orchestration:</b> một <b>Saga orchestrator</b> trung tâm gọi tuần tự từng service và quyết định khi nào compensate. Dễ theo dõi/debug hơn nhưng orchestrator là điểm phức tạp tập trung.",
         "en":"<b>Orchestration:</b> a central <b>Saga orchestrator</b> calls each service in sequence and decides when to compensate. Easier to trace/debug but the orchestrator becomes a central point of complexity."}
      ]},
      {"type":"table",
        "headers":{"vi":["Tiêu chí","Choreography","Orchestration"],"en":["Criterion","Choreography","Orchestration"]},
        "rows":[
          {"vi":["Coupling","Thấp (event-driven)","Trung tâm biết toàn bộ luồng"],"en":["Coupling","Low (event-driven)","Central knows the whole flow"]},
          {"vi":["Dễ debug","Khó — luồng phân tán trong nhiều service","Dễ hơn — logic ở một chỗ"],"en":["Debuggability","Hard — flow scattered across services","Easier — logic lives in one place"]},
          {"vi":["Phù hợp khi","Ít bước, luồng đơn giản","Nhiều bước, cần retry/timeout phức tạp"],"en":["Best fit","Few steps, simple flow","Many steps, complex retry/timeout needs"]}
        ]},
      {"type":"prose",
        "vi":"Ví dụ kinh điển: đặt hàng e-commerce gồm 3 bước — <code>Order Service</code> tạo order → <code>Payment Service</code> trừ tiền → <code>Inventory Service</code> trừ kho. Nếu trừ kho thất bại (hết hàng), cần chạy compensating transaction: hoàn tiền ở Payment Service, rồi hủy order ở Order Service — theo thứ tự ngược lại.",
        "en":"Classic example: e-commerce checkout with 3 steps — <code>Order Service</code> creates the order → <code>Payment Service</code> charges the card → <code>Inventory Service</code> decrements stock. If stock decrement fails (out of stock), run compensating transactions in reverse order: refund via Payment Service, then cancel the order via Order Service."},
      {"type":"code",
        "code":"// Orchestrator pseudocode\nasync function checkoutSaga(orderId) {\n  const steps = [\n    { do: () => orderSvc.create(orderId), undo: () => orderSvc.cancel(orderId) },\n    { do: () => paymentSvc.charge(orderId), undo: () => paymentSvc.refund(orderId) },\n    { do: () => inventorySvc.reserve(orderId), undo: () => inventorySvc.release(orderId) },\n  ];\n  const done = [];\n  try {\n    for (const step of steps) { await step.do(); done.push(step); }\n  } catch (err) {\n    for (const step of done.reverse()) await step.undo(); // compensate\n    throw err;\n  }\n}",
        "caption":{"vi":"Saga orchestrator với compensating transactions khi một bước thất bại","en":"Saga orchestrator with compensating transactions on step failure"}},
      {"type":"callout","variant":"warning",
        "vi":"Saga chỉ đảm bảo <b>eventual consistency</b>, không phải isolation như ACID thật. Vấn đề <b>\"dirty read\"</b> có thể xảy ra: một request khác đọc order ở trạng thái trung gian (đã tạo, chưa trừ kho) — giải pháp thường dùng: <code>semantic lock</code> (đánh dấu trạng thái \"pending\"), hoặc <code>commutative updates</code> để tránh xung đột thứ tự. So sánh nhanh với <b>2PC (two-phase commit)</b>: 2PC cần coordinator giữ lock trên mọi participant tới khi commit — chặn, không chịu được service down lâu, không scale tốt; Saga đánh đổi consistency mạnh lấy availability & scalability, phù hợp hơn cho microservices.",
        "en":"Saga only guarantees <b>eventual consistency</b>, not true ACID isolation. A <b>\"dirty read\"</b> problem can occur: another request reads the order in an intermediate state (created but stock not yet reserved) — common fixes are a <code>semantic lock</code> (mark the state \"pending\"), or <code>commutative updates</code> to avoid ordering conflicts. Quick comparison with <b>2PC (two-phase commit)</b>: 2PC needs a coordinator holding locks on all participants until commit — blocking, intolerant of long outages, and doesn't scale well; Saga trades strong consistency for availability & scalability, a better fit for microservices."}
    ]
  }
  $json$::jsonb
)
on conflict (topic_id, position) do update set section = excluded.section;

-- ============================================================
-- 3) databases — Index strategy & query tuning
-- ============================================================
insert into public.pro_catalog (topic_id, position, title)
values (
  'databases', 0,
  $json$
  {"vi":"Chiến lược Index & tối ưu query thực chiến","en":"Index strategy & query tuning in practice"}
  $json$::jsonb
)
on conflict (topic_id, position) do update set title = excluded.title;

insert into public.pro_content (topic_id, position, section)
values (
  'databases', 0,
  $json$
  {
    "id": "index-strategy-query-tuning",
    "title": {"vi":"Chiến lược Index & tối ưu query thực chiến","en":"Index strategy & query tuning in practice"},
    "blocks": [
      {"type":"prose",
        "vi":"Index tăng tốc đọc nhưng làm chậm ghi (mỗi insert/update/delete phải cập nhật index) và tốn thêm dung lượng. Chọn index đúng nghĩa là hiểu <b>pattern truy vấn thực tế</b>, không phải \"đánh index mọi cột\".",
        "en":"Indexes speed up reads but slow down writes (every insert/update/delete must also update the index) and cost extra storage. Choosing the right index means understanding <b>actual query patterns</b>, not \"index every column\"."},
      {"type":"list","ordered":false,"items":[
        {"vi":"<b>B-Tree</b> (mặc định ở hầu hết DB): tốt cho <code>=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>BETWEEN</code>, và sắp xếp (<code>ORDER BY</code>).",
         "en":"<b>B-Tree</b> (the default in most DBs): great for <code>=</code>, <code>&lt;</code>, <code>&gt;</code>, <code>BETWEEN</code>, and sorting (<code>ORDER BY</code>)."},
        {"vi":"<b>Hash index:</b> chỉ tốt cho so sánh bằng (<code>=</code>), không hỗ trợ range hay sort.",
         "en":"<b>Hash index:</b> only good for equality (<code>=</code>) lookups, no range or sort support."},
        {"vi":"<b>Composite (multi-column) index:</b> thứ tự cột quan trọng — theo nguyên tắc <code>equality columns trước, range column sau cùng</code>. Index <code>(a,b,c)</code> dùng được cho query lọc theo <code>a</code>, <code>a+b</code>, hoặc <code>a+b+c</code>, nhưng KHÔNG dùng được nếu chỉ lọc theo <code>b</code> hoặc <code>c</code> (left-prefix rule).",
         "en":"<b>Composite (multi-column) index:</b> column order matters — the rule of thumb is <code>equality columns first, the range column last</code>. An index on <code>(a,b,c)</code> serves queries filtering on <code>a</code>, <code>a+b</code>, or <code>a+b+c</code>, but NOT one filtering only on <code>b</code> or <code>c</code> (the left-prefix rule)."},
        {"vi":"<b>Covering index:</b> index chứa đủ mọi cột mà query cần (bao gồm cả <code>SELECT</code> list) nên DB trả kết quả trực tiếp từ index, không cần đọc lại bảng (\"index-only scan\").",
         "en":"<b>Covering index:</b> the index contains every column the query needs (including the <code>SELECT</code> list) so the DB can answer directly from the index without a table lookup (\"index-only scan\")."}
      ]},
      {"type":"code",
        "code":"-- Query cham vi thieu index dung thu tu\nSELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;\n\n-- Composite index dung: equality columns truoc, sort/range column sau\nCREATE INDEX idx_orders_user_status_created\n  ON orders (user_id, status, created_at DESC);\n\n-- EXPLAIN ANALYZE de kiem tra plan that su dung index nay\nEXPLAIN ANALYZE\nSELECT * FROM orders WHERE user_id = 42 AND status = 'pending' ORDER BY created_at DESC;",
        "caption":{"vi":"Thiết kế composite index đúng thứ tự cho query lọc + sort","en":"Designing a composite index in the right order for a filter + sort query"}},
      {"type":"table",
        "headers":{"vi":["Dấu hiệu trong EXPLAIN","Ý nghĩa","Hành động"],"en":["EXPLAIN signal","Meaning","Action"]},
        "rows":[
          {"vi":["Seq Scan / Full table scan","Không dùng index nào, quét toàn bảng","Thêm index đúng cột WHERE/JOIN/ORDER BY"],
           "en":["Seq Scan / full table scan","No index used, scanning the whole table","Add an index on the WHERE/JOIN/ORDER BY columns"]},
          {"vi":["Index Scan + high rows filtered","Có dùng index nhưng lọc thêm nhiều dòng sau đó","Xem lại thứ tự cột composite, hoặc thêm cột lọc vào index"],
           "en":["Index Scan + high rows filtered","Index used but many rows filtered afterward","Re-check composite column order, or add the filter column to the index"]},
          {"vi":["Index Only Scan","Trả kết quả trực tiếp từ index, không đụng bảng","Đã tối ưu — đây là covering index"],
           "en":["Index Only Scan","Result served straight from the index, no table hit","Already optimal — this is a covering index"]}
        ]},
      {"type":"callout","variant":"warning",
        "vi":"Sai lầm thường gặp: đánh index rồi query vẫn chậm vì (1) hàm bọc quanh cột index (<code>WHERE LOWER(email) = ...</code> cần index trên biểu thức, không phải cột thường), (2) kiểu dữ liệu không khớp gây implicit cast, (3) index quá nhiều cột ghi làm chậm write path mà ít query dùng tới.",
        "en":"Common mistakes: indexing but the query is still slow because (1) a function wraps the indexed column (<code>WHERE LOWER(email) = ...</code> needs an expression index, not a plain-column one), (2) a data-type mismatch forces an implicit cast, (3) over-indexing slows the write path for indexes few queries actually use."},
      {"type":"callout","variant":"key",
        "vi":"Quy trình tối ưu thực chiến: (1) bật <code>slow query log</code> để tìm query chậm nhất; (2) chạy <code>EXPLAIN ANALYZE</code> để xem plan thật; (3) thêm/sửa index theo left-prefix rule; (4) đo lại; (5) cân nhắc đánh đổi write cost trước khi thêm index mới vào bảng ghi nhiều.",
        "en":"A real-world tuning workflow: (1) enable a <code>slow query log</code> to find the worst offenders; (2) run <code>EXPLAIN ANALYZE</code> to see the real plan; (3) add/adjust indexes per the left-prefix rule; (4) re-measure; (5) weigh the write-cost trade-off before adding a new index to a heavily-written table."}
    ]
  }
  $json$::jsonb
)
on conflict (topic_id, position) do update set section = excluded.section;

-- ============================================================
-- 4) llms — Fine-tuning LLM: LoRA/QLoRA thực hành
-- ============================================================
insert into public.pro_catalog (topic_id, position, title)
values (
  'llms', 0,
  $json$
  {"vi":"Fine-tuning LLM: LoRA/QLoRA thực hành","en":"Fine-tuning LLMs: LoRA/QLoRA in practice"}
  $json$::jsonb
)
on conflict (topic_id, position) do update set title = excluded.title;

insert into public.pro_content (topic_id, position, section)
values (
  'llms', 0,
  $json$
  {
    "id": "fine-tuning-lora-qlora",
    "title": {"vi":"Fine-tuning LLM: LoRA/QLoRA thực hành","en":"Fine-tuning LLMs: LoRA/QLoRA in practice"},
    "blocks": [
      {"type":"prose",
        "vi":"Fine-tuning toàn bộ tham số (<b>full fine-tuning</b>) của một LLM vài tỷ tham số đòi hỏi GPU memory rất lớn (model + gradient + optimizer states). <b>LoRA (Low-Rank Adaptation)</b> đóng băng toàn bộ trọng số gốc và chỉ học hai ma trận rank-thấp <code>A, B</code> được cộng vào mỗi lớp linear, giảm số tham số cần train xuống &lt;1%.",
        "en":"<b>Full fine-tuning</b> of a multi-billion-parameter LLM needs huge GPU memory (weights + gradients + optimizer states). <b>LoRA (Low-Rank Adaptation)</b> freezes all original weights and only trains two low-rank matrices <code>A, B</code> added into each linear layer, cutting trainable parameters to &lt;1%."},
      {"type":"list","ordered":false,"items":[
        {"vi":"<b>Ý tưởng LoRA:</b> trọng số mới <code>W' = W + BA</code>, trong đó <code>W</code> đóng băng (kích thước d×d), <code>B</code> (d×r) và <code>A</code> (r×d) với rank <code>r</code> rất nhỏ (thường 4-64). Chỉ <code>A, B</code> được cập nhật gradient.",
         "en":"<b>LoRA idea:</b> the new weight is <code>W' = W + BA</code>, where <code>W</code> is frozen (d×d), and <code>B</code> (d×r), <code>A</code> (r×d) with a small rank <code>r</code> (typically 4-64). Only <code>A, B</code> receive gradients."},
        {"vi":"<b>QLoRA:</b> lượng tử hóa (quantize) trọng số gốc <code>W</code> xuống 4-bit (NF4) để giảm memory hơn nữa, rồi vẫn train LoRA adapter ở độ chính xác cao hơn (bf16) — cho phép fine-tune model 65B trên một GPU 48GB.",
         "en":"<b>QLoRA:</b> quantizes the frozen base weights <code>W</code> down to 4-bit (NF4) for further memory savings, while still training the LoRA adapters at higher precision (bf16) — enabling fine-tuning of a 65B model on a single 48GB GPU."},
        {"vi":"<b>Rank (r) và alpha:</b> r càng lớn → nhiều tham số học hơn, biểu diễn phong phú hơn nhưng dễ overfit và tốn memory hơn. <code>alpha</code> là hệ số scale cho <code>BA</code> (thường <code>alpha = 2×r</code>), kiểm soát mức ảnh hưởng của adapter lên output.",
         "en":"<b>Rank (r) and alpha:</b> a larger r means more trainable parameters and richer representation, but more overfitting risk and memory use. <code>alpha</code> scales <code>BA</code> (commonly <code>alpha = 2×r</code>), controlling how strongly the adapter influences the output."}
      ]},
      {"type":"table",
        "headers":{"vi":["Phương pháp","GPU memory (model 7B)","Khi nào dùng"],"en":["Method","GPU memory (7B model)","When to use"]},
        "rows":[
          {"vi":["Full fine-tuning","~60-80GB (fp16 + Adam states)","Có nhiều GPU, cần thay đổi sâu behavior của model"],
           "en":["Full fine-tuning","~60-80GB (fp16 + Adam states)","Plenty of GPUs available, need deep behavioral changes"]},
          {"vi":["LoRA","~16-20GB","Fine-tune trên 1 GPU tiêu chuẩn, muốn nhiều adapter cho nhiều task"],
           "en":["LoRA","~16-20GB","Fine-tune on a single standard GPU, want multiple adapters for multiple tasks"]},
          {"vi":["QLoRA","~6-10GB","GPU hạn chế (consumer GPU), model lớn (13B-70B)"],
           "en":["QLoRA","~6-10GB","Limited GPU (consumer GPU), large model (13B-70B)"]}
        ]},
      {"type":"code",
        "code":"from peft import LoraConfig, get_peft_model\n\nconfig = LoraConfig(\n    r=16,                       # rank\n    lora_alpha=32,              # scale = alpha / r\n    target_modules=[\"q_proj\", \"v_proj\"],  # thuong ap dung cho attention\n    lora_dropout=0.05,\n    bias=\"none\",\n    task_type=\"CAUSAL_LM\",\n)\nmodel = get_peft_model(base_model, config)\nmodel.print_trainable_parameters()\n# vd: trainable params: 4,194,304 || all params: 6,738,415,616 || trainable%: 0.06%",
        "caption":{"vi":"Cấu hình LoRA cơ bản với thư viện Hugging Face PEFT","en":"Basic LoRA configuration with the Hugging Face PEFT library"}},
      {"type":"callout","variant":"tip",
        "vi":"Adapter LoRA sau khi train có thể <b>merge</b> lại vào trọng số gốc (<code>model.merge_and_unload()</code>) để inference không tốn thêm latency, hoặc giữ tách rời để swap nhiều adapter cho nhiều task trên cùng một base model — rất tiết kiệm khi phục vụ nhiều customer/domain khác nhau.",
        "en":"A trained LoRA adapter can be <b>merged</b> back into the base weights (<code>model.merge_and_unload()</code>) for zero extra inference latency, or kept separate to swap multiple adapters for multiple tasks on the same base model — very cost-effective when serving many customers/domains."},
      {"type":"callout","variant":"key",
        "vi":"Câu trả lời phỏng vấn cô đọng: \"LoRA/QLoRA giảm chi phí fine-tuning bằng cách đóng băng trọng số gốc và chỉ học ma trận rank-thấp; QLoRA thêm lượng tử hóa 4-bit để fine-tune model lớn trên phần cứng khiêm tốn. Đánh đổi: rank thấp có thể giới hạn khả năng học các task rất khác biệt so với pretraining.\"",
        "en":"Concise interview answer: \"LoRA/QLoRA cut fine-tuning cost by freezing the base weights and only learning low-rank matrices; QLoRA adds 4-bit quantization to fine-tune large models on modest hardware. The trade-off: a low rank can limit how far the model can adapt to tasks very different from pretraining.\""}
    ]
  }
  $json$::jsonb
)
on conflict (topic_id, position) do update set section = excluded.section;
