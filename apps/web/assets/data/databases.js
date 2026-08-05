/* Databases — SQL vs NoSQL */
PREP.register({
  id: "databases",
  icon: "🗄️",
  category: "data",
  title: { vi: "Databases — SQL vs NoSQL", en: "Databases — SQL vs NoSQL" },
  blurb: {
    vi: "Thuật ngữ giữ tiếng Anh, giải thích tiếng Việt. Tập trung vào trade-off (ACID/BASE, CAP, index, sharding) để trả lời phỏng vấn vững.",
    en: "Technical terms stay in English with Vietnamese explanations. Focus on trade-offs (ACID/BASE, CAP, indexing, sharding) to answer interview questions solidly.",
  },
  sections: [
    {
      id: "summary",
      title: { vi: "1. Tóm tắt SQL vs NoSQL", en: "1. SQL vs NoSQL summary" },
      blocks: [
        { type: "list", items: [
          { vi: "<b>SQL (Relational DB)</b>: dữ liệu trong <b>bảng</b> (rows/columns), có <b>schema</b> cố định, quan hệ qua <b>khóa (PK/FK)</b>, truy vấn bằng <b>SQL</b>, đảm bảo <b>ACID</b>. VD: <b>PostgreSQL, MySQL, SQL Server, Oracle</b>.", en: "<b>SQL (Relational DB)</b>: data in <b>tables</b> (rows/columns), a fixed <b>schema</b>, relationships via <b>keys (PK/FK)</b>, queried with <b>SQL</b>, guarantees <b>ACID</b>. E.g. <b>PostgreSQL, MySQL, SQL Server, Oracle</b>." },
          { vi: "<b>NoSQL</b>: \"Not Only SQL\" — schema linh hoạt, thiết kế để <b>scale ngang (horizontal)</b>, thường ưu tiên <b>availability</b> hơn nhất quán tuyệt đối. Có 4 loại chính.", en: "<b>NoSQL</b>: \"Not Only SQL\" — flexible schema, designed to <b>scale horizontally</b>, usually favoring <b>availability</b> over strict consistency. Four main types." },
        ] },
        { type: "callout", variant: "key", vi: "Câu trả lời tủ: <b>SQL</b> = quan hệ + ACID mạnh + truy vấn ad-hoc; <b>NoSQL</b> = schema linh hoạt + scale ngang + throughput cao. Chọn theo <b>access pattern</b>, không theo trend.", en: "Go-to framing: <b>SQL</b> = relationships + strong ACID + ad-hoc queries; <b>NoSQL</b> = flexible schema + horizontal scale + high throughput. Choose by <b>access pattern</b>, not by trend." },
      ],
    },
    {
      id: "nosql-types",
      title: { vi: "2. Các loại NoSQL", en: "2. The four NoSQL types" },
      blocks: [
        { type: "table",
          headers: { vi: ["Loại", "Mô tả", "Ví dụ", "Dùng khi"], en: ["Type", "Description", "Examples", "Use when"] },
          rows: [
            { vi: ["Document", "Lưu JSON/BSON document", "MongoDB, Couchbase", "Dữ liệu bán cấu trúc, schema hay đổi"], en: ["Document", "Stores JSON/BSON documents", "MongoDB, Couchbase", "Semi-structured data, frequently changing schema"] },
            { vi: ["Key-Value", "Map key → value, siêu nhanh", "Redis, DynamoDB", "Cache, session, leaderboard"], en: ["Key-Value", "Maps key → value, ultra-fast", "Redis, DynamoDB", "Cache, sessions, leaderboards"] },
            { vi: ["Wide-Column", "Bảng cột động, ghi lớn", "Cassandra, HBase", "Time-series, log, ghi cực nhiều"], en: ["Wide-Column", "Dynamic-column tables, heavy writes", "Cassandra, HBase", "Time-series, logs, very high write volume"] },
            { vi: ["Graph", "Node + edge (quan hệ)", "Neo4j", "Mạng xã hội, recommendation, fraud"], en: ["Graph", "Nodes + edges (relationships)", "Neo4j", "Social networks, recommendations, fraud detection"] },
          ] },
        { type: "callout", variant: "tip", vi: "Nhớ theo mô hình dữ liệu: <b>Document</b> (object lồng nhau), <b>Key-Value</b> (lookup O(1)), <b>Wide-Column</b> (ghi phân tán khổng lồ), <b>Graph</b> (đi theo quan hệ).", en: "Remember by data model: <b>Document</b> (nested objects), <b>Key-Value</b> (O(1) lookup), <b>Wide-Column</b> (massive distributed writes), <b>Graph</b> (traversing relationships)." },
      ],
    },
    {
      id: "acid-base",
      title: { vi: "3. ACID vs BASE", en: "3. ACID vs BASE" },
      blocks: [
        { type: "list", items: [
          { vi: "<b>ACID</b> (SQL): <b>A</b>tomicity (toàn bộ hoặc không), <b>C</b>onsistency (luôn đúng ràng buộc), <b>I</b>solation (giao dịch không giẫm nhau), <b>D</b>urability (đã commit là bền vững).", en: "<b>ACID</b> (SQL): <b>A</b>tomicity (all or nothing), <b>C</b>onsistency (constraints always hold), <b>I</b>solation (transactions don't step on each other), <b>D</b>urability (once committed, it persists)." },
          { vi: "<b>BASE</b> (nhiều NoSQL): <b>B</b>asically <b>A</b>vailable, <b>S</b>oft state, <b>E</b>ventually consistent — ưu tiên sẵn sàng + scale, chấp nhận nhất quán cuối cùng (eventual consistency).", en: "<b>BASE</b> (many NoSQL): <b>B</b>asically <b>A</b>vailable, <b>S</b>oft state, <b>E</b>ventually consistent — favors availability + scale, accepting eventual consistency." },
        ] },
        { type: "callout", variant: "soundbite", vi: "\"ACID là cam kết <b>đúng tuyệt đối từng giao dịch</b> (ví dụ chuyển tiền). BASE đánh đổi nhất quán tức thời lấy <b>sẵn sàng và scale</b> — dữ liệu sẽ đồng bộ sau một khoảng ngắn.\"", en: "\"ACID promises <b>strict correctness per transaction</b> (e.g. a money transfer). BASE trades immediate consistency for <b>availability and scale</b> — data converges after a short delay.\"" },
      ],
    },
    {
      id: "cap",
      title: { vi: "4. CAP Theorem (+ PACELC)", en: "4. CAP Theorem (+ PACELC)" },
      blocks: [
        { type: "prose", vi: "Trong hệ phân tán, khi có <b>Network Partition (P)</b> xảy ra, chỉ chọn được <b>một</b> trong hai:", en: "In a distributed system, when a <b>Network Partition (P)</b> occurs, you can pick only <b>one</b> of:" },
        { type: "list", items: [
          { vi: "<b>C</b> (Consistency): mọi node đọc thấy dữ liệu mới nhất.", en: "<b>C</b> (Consistency): every node reads the latest data." },
          { vi: "<b>A</b> (Availability): mọi request luôn có phản hồi.", en: "<b>A</b> (Availability): every request always gets a response." },
        ] },
        { type: "prose", vi: "Thực chất là chọn <b>CP</b> (hi sinh availability để giữ nhất quán — VD MongoDB, HBase) vs <b>AP</b> (hi sinh nhất quán để luôn sẵn sàng — VD Cassandra, DynamoDB). Khi <b>không</b> có partition thì có cả C lẫn A.", en: "In practice you choose <b>CP</b> (sacrifice availability to stay consistent — e.g. MongoDB, HBase) vs <b>AP</b> (sacrifice consistency to stay available — e.g. Cassandra, DynamoDB). When there's <b>no</b> partition, you get both C and A." },
        { type: "callout", variant: "key", vi: "<b>PACELC</b> mở rộng CAP: khi có <b>P</b>artition chọn <b>A</b>/<b>C</b>; <b>E</b>lse (bình thường, không partition) chọn <b>L</b>atency/<b>C</b>onsistency. Tức là trade-off vẫn tồn tại ngay cả khi hệ thống khỏe mạnh.", en: "<b>PACELC</b> extends CAP: on <b>P</b>artition choose <b>A</b>/<b>C</b>; <b>E</b>lse (normal, no partition) choose <b>L</b>atency/<b>C</b>onsistency. The trade-off exists even when the system is healthy." },
      ],
    },
    {
      id: "when-to-use",
      title: { vi: "5. Khi nào dùng SQL / NoSQL", en: "5. When to use SQL / NoSQL" },
      blocks: [
        { type: "table",
          headers: { vi: ["Dùng SQL khi", "Dùng NoSQL khi"], en: ["Use SQL when", "Use NoSQL when"] },
          rows: [
            { vi: ["Quan hệ phức tạp, cần JOIN", "Schema linh hoạt / hay đổi"], en: ["Complex relationships, need JOINs", "Flexible / frequently changing schema"] },
            { vi: ["Cần ACID mạnh (tài chính, đơn hàng)", "Cần scale ngang cực lớn"], en: ["Need strong ACID (finance, orders)", "Need very large horizontal scale"] },
            { vi: ["Truy vấn đa dạng, ad-hoc", "Ghi/đọc throughput rất cao"], en: ["Varied, ad-hoc queries", "Very high read/write throughput"] },
            { vi: ["Dữ liệu có cấu trúc rõ", "Dữ liệu bán cấu trúc / không cấu trúc"], en: ["Clearly structured data", "Semi-structured / unstructured data"] },
          ] },
        { type: "callout", variant: "soundbite", vi: "\"Chọn theo <i>mẫu truy cập dữ liệu (access pattern)</i> và yêu cầu nhất quán, không theo trend. Nhiều hệ thống dùng <b>cả hai</b> (polyglot persistence): Postgres cho đơn hàng + Redis cache + Elasticsearch search.\"", en: "\"Choose by <i>data access pattern</i> and consistency needs, not by trend. Many systems use <b>both</b> (polyglot persistence): Postgres for orders + Redis cache + Elasticsearch search.\"" },
      ],
    },
    {
      id: "indexes",
      title: { vi: "6. Index & đọc query plan (EXPLAIN)", en: "6. Indexes & query plans (EXPLAIN)" },
      blocks: [
        { type: "list", items: [
          { vi: "Cấu trúc dữ liệu (thường <b>B-tree</b>) giúp tìm hàng nhanh, không phải quét cả bảng (<b>full table scan</b>).", en: "A data structure (usually a <b>B-tree</b>) that finds rows fast, avoiding a <b>full table scan</b>." },
          { vi: "<b>Đánh đổi:</b> đọc nhanh hơn, nhưng <b>ghi chậm hơn</b> (phải cập nhật index khi insert/update/delete) và tốn bộ nhớ/đĩa.", en: "<b>Trade-off:</b> faster reads, but <b>slower writes</b> (the index must be updated on insert/update/delete) and extra memory/disk." },
          { vi: "<b>Composite index</b> (nhiều cột) tuân theo \"<b>leftmost prefix</b>\": chỉ dùng được nếu query lọc theo cột trái nhất trở đi.", en: "A <b>composite index</b> (multiple columns) follows the \"<b>leftmost prefix</b>\" rule: usable only if the query filters from the leftmost column onward." },
          { vi: "<b>Covering index</b> = index chứa đủ cột để trả lời query mà không cần đọc bảng (tránh đọc lại data page).", en: "A <b>covering index</b> contains enough columns to answer the query without touching the table (no extra data-page reads)." },
          { vi: "Đọc query plan bằng <b>EXPLAIN / EXPLAIN ANALYZE</b> để xem có dùng index không.", en: "Inspect the query plan with <b>EXPLAIN / EXPLAIN ANALYZE</b> to see whether an index is used." },
        ] },
        { type: "callout", variant: "warning", vi: "Đừng đánh index bừa: mỗi index làm chậm ghi và tốn chỗ. Index cột <b>low-cardinality</b> (ít giá trị khác nhau, như boolean) thường vô dụng.", en: "Don't index everything: each index slows writes and costs space. Indexing a <b>low-cardinality</b> column (few distinct values, like a boolean) is usually useless." },
        { type: "prose", vi: "<b>EXPLAIN</b> in ra <b>query plan</b> mà optimizer <b>dự định</b> chạy (kèm <b>cost</b> ước lượng và số hàng) — <b>không</b> chạy query. <b>EXPLAIN ANALYZE</b> thì <b>thực sự chạy</b> query rồi báo <b>thời gian thật</b> và <b>số hàng thật</b>, để so sánh ước lượng vs thực tế. Lưu ý: <code>ANALYZE</code> cũng chạy cả <code>INSERT/UPDATE/DELETE</code> → bọc trong transaction rồi <code>ROLLBACK</code> nếu không muốn đổi dữ liệu. Thêm <code>BUFFERS</code> (<code>EXPLAIN (ANALYZE, BUFFERS)</code>) để xem đọc từ cache (shared hit) hay từ đĩa (read).", en: "<b>EXPLAIN</b> prints the <b>query plan</b> the optimizer <b>intends</b> to run (with estimated <b>cost</b> and row counts) — it does <b>not</b> run the query. <b>EXPLAIN ANALYZE</b> <b>actually runs</b> it and reports the <b>real time</b> and <b>real row counts</b>, so you can compare estimate vs reality. Note: <code>ANALYZE</code> also executes <code>INSERT/UPDATE/DELETE</code> → wrap it in a transaction and <code>ROLLBACK</code> if you don't want the change. Add <code>BUFFERS</code> (<code>EXPLAIN (ANALYZE, BUFFERS)</code>) to see cache hits vs disk reads." },
        { type: "code", code: "EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42;\n\nSeq Scan on orders  (cost=0.00..1850.00 rows=12 width=64)\n                    (actual time=0.30..14.2 rows=11 loops=1)\n  Filter: (user_id = 42)\n  Rows Removed by Filter: 99989\nPlanning Time: 0.1 ms\nExecution Time: 14.3 ms", caption: { vi: "Seq Scan + 'Rows Removed by Filter' rất lớn → đang quét cả bảng vì thiếu index trên user_id. Thêm index → đổi thành Index Scan, Execution Time giảm mạnh.", en: "Seq Scan + a huge 'Rows Removed by Filter' → it scans the whole table because there's no index on user_id. Add one → it becomes an Index Scan and Execution Time drops sharply." } },
        { type: "table",
          headers: { vi: ["Thấy trong plan", "Nghĩa là"], en: ["Seen in the plan", "Means"] },
          rows: [
            { vi: ["<b>Seq Scan</b> (full scan)", "Quét cả bảng. OK với bảng nhỏ; <b>đáng lo</b> nếu bảng lớn + có WHERE/JOIN (thường là thiếu index)."], en: ["<b>Seq Scan</b> (full scan)", "Reads the whole table. Fine for small tables; <b>a red flag</b> on a large table with a WHERE/JOIN (usually a missing index)."] },
            { vi: ["<b>Index Scan / Index Only Scan</b>", "Dùng index để tìm hàng (tốt). <b>Index Only Scan</b> = covering index, không cần đọc bảng (tốt nhất)."], en: ["<b>Index Scan / Index Only Scan</b>", "Uses an index to find rows (good). <b>Index Only Scan</b> = covering index, no table read (best)."] },
            { vi: ["<b>cost=startup..total</b>, rows=…", "<b>Ước lượng</b> của optimizer (đơn vị tương đối, không phải ms); rows = số hàng dự đoán."], en: ["<b>cost=startup..total</b>, rows=…", "Optimizer <b>estimates</b> (relative units, not ms); rows = predicted row count."] },
            { vi: ["<b>actual time / rows</b> (chỉ ANALYZE)", "Số liệu <b>thật</b>. Nếu rows ước lượng lệch nhiều so với actual → statistics cũ → chạy <code>ANALYZE &lt;table&gt;</code>."], en: ["<b>actual time / rows</b> (ANALYZE only)", "The <b>real</b> numbers. If estimated rows are far from actual → stale statistics → run <code>ANALYZE &lt;table&gt;</code>."] },
            { vi: ["<b>Nested Loop / Hash Join / Merge Join</b>", "Kiểu join. Nested Loop trên nhiều hàng mà không có index ở cột join → chậm."], en: ["<b>Nested Loop / Hash Join / Merge Join</b>", "The join strategy. A Nested Loop over many rows with no index on the join column → slow."] },
            { vi: ["<b>Sort/Hash … (external/disk)</b>", "Thao tác phải tràn ra đĩa vì thiếu RAM → tăng <code>work_mem</code> hoặc giảm dữ liệu cần xử lý."], en: ["<b>Sort/Hash … (external/disk)</b>", "Spilled to disk for lack of RAM → raise <code>work_mem</code> or process less data."] },
          ] },
        { type: "callout", variant: "soundbite", vi: "“EXPLAIN cho tôi xem plan dự kiến + cost ước lượng; EXPLAIN ANALYZE chạy thật và cho thời gian/row thực tế. Tôi soi <b>Seq Scan trên bảng lớn</b> (thiếu index), so <b>rows ước lượng vs thật</b> (lệch nhiều → ANALYZE để cập nhật stats), và xem <b>kiểu join</b>.”", en: "“EXPLAIN shows me the intended plan + estimated cost; EXPLAIN ANALYZE runs it and gives real time/rows. I look for a <b>Seq Scan on a large table</b> (missing index), compare <b>estimated vs actual rows</b> (a big gap → ANALYZE to refresh stats), and check the <b>join strategy</b>.”" },
      ],
    },
    {
      id: "normalization",
      title: { vi: "7. Normalization vs Denormalization", en: "7. Normalization vs Denormalization" },
      blocks: [
        { type: "list", items: [
          { vi: "<b>Normalization</b> (chuẩn hóa, 1NF/2NF/3NF): tách bảng để <b>giảm trùng lặp</b> → ghi gọn, nhất quán, nhưng phải nhiều JOIN khi đọc.", en: "<b>Normalization</b> (1NF/2NF/3NF): split into tables to <b>reduce duplication</b> → compact, consistent writes, but more JOINs on reads." },
          { vi: "<b>Denormalization</b>: cố ý lặp dữ liệu để <b>đọc nhanh</b> (ít JOIN) → phổ biến ở NoSQL & read model.", en: "<b>Denormalization</b>: intentionally duplicate data for <b>fast reads</b> (fewer JOINs) → common in NoSQL & read models." },
        ] },
        { type: "callout", variant: "tip", vi: "Quy tắc ngón tay cái: <b>normalize</b> để dữ liệu đúng (write-heavy, OLTP); <b>denormalize</b> có chọn lọc khi đọc là nút cổ chai (read-heavy, analytics, cache).", en: "Rule of thumb: <b>normalize</b> for correctness (write-heavy, OLTP); <b>denormalize</b> selectively when reads are the bottleneck (read-heavy, analytics, caches)." },
      ],
    },
    {
      id: "transactions",
      title: { vi: "8. Transaction & Isolation Levels", en: "8. Transactions & isolation levels" },
      blocks: [
        { type: "prose", vi: "Các vấn đề khi nhiều giao dịch chạy song song: <b>dirty read</b> (đọc dữ liệu chưa commit), <b>non-repeatable read</b> (đọc lại cùng hàng thấy giá trị khác), <b>phantom read</b> (đọc lại cùng điều kiện thấy thêm/bớt hàng).", en: "Anomalies when transactions run concurrently: <b>dirty read</b> (reading uncommitted data), <b>non-repeatable read</b> (re-reading the same row yields a different value), <b>phantom read</b> (re-running the same condition returns more/fewer rows)." },
        { type: "table",
          headers: { vi: ["Isolation level", "Chặn được"], en: ["Isolation level", "Prevents"] },
          rows: [
            { vi: ["Read Uncommitted", "(không chặn gì)"], en: ["Read Uncommitted", "(prevents nothing)"] },
            { vi: ["Read Committed", "dirty read"], en: ["Read Committed", "dirty read"] },
            { vi: ["Repeatable Read", "+ non-repeatable read"], en: ["Repeatable Read", "+ non-repeatable read"] },
            { vi: ["Serializable", "+ phantom read (chặt nhất, chậm nhất)"], en: ["Serializable", "+ phantom read (strictest, slowest)"] },
          ] },
        { type: "callout", variant: "warning", vi: "Càng chặt (lên Serializable) càng <b>an toàn nhưng chậm</b> hơn (nhiều khóa / contention). Read Committed là mặc định của nhiều DB (Postgres, Oracle).", en: "Stricter (toward Serializable) is <b>safer but slower</b> (more locking / contention). Read Committed is the default in many DBs (Postgres, Oracle)." },
      ],
    },
    {
      id: "scaling",
      title: { vi: "9. Scale database", en: "9. Scaling databases" },
      blocks: [
        { type: "list", items: [
          { vi: "<b>Replication</b>: nhân bản dữ liệu sang nhiều node. <b>Read replica</b> → tách đọc/ghi (master ghi, replica đọc) → scale đọc + high availability (HA).", en: "<b>Replication</b>: copy data to multiple nodes. A <b>read replica</b> splits reads/writes (master writes, replica reads) → scales reads + high availability (HA)." },
          { vi: "<b>Sharding / Partitioning</b>: chia dữ liệu theo key (VD theo user_id) ra nhiều node → scale ghi. Khó: query xuyên shard, rebalancing khi thêm node.", en: "<b>Sharding / Partitioning</b>: split data by key (e.g. by user_id) across nodes → scales writes. Hard parts: cross-shard queries, rebalancing when adding nodes." },
          { vi: "<b>Partition</b>: ngang (horizontal, chia theo rows) vs dọc (vertical, chia theo columns).", en: "<b>Partition</b>: horizontal (split by rows) vs vertical (split by columns)." },
        ] },
        { type: "callout", variant: "key", vi: "Phân biệt rạch ròi: <b>replication</b> nhân bản (scale ĐỌC + HA); <b>sharding</b> chia nhỏ (scale GHI). Hệ lớn thường dùng cả hai cùng lúc.", en: "Keep them distinct: <b>replication</b> copies (scales READS + HA); <b>sharding</b> splits (scales WRITES). Large systems use both together." },
      ],
    },
    {
      id: "pitfalls",
      title: { vi: "10. Bẫy hiệu năng hay gặp", en: "10. Common performance pitfalls" },
      blocks: [
        { type: "list", items: [
          { vi: "<b>N+1 query</b>: lấy 1 list rồi lặp query con cho từng phần tử → 1 + N query. Fix bằng <b>JOIN</b> / <b>eager loading</b> / <b>batch</b> query.", en: "<b>N+1 query</b>: fetch a list, then run a sub-query per element → 1 + N queries. Fix with a <b>JOIN</b> / <b>eager loading</b> / <b>batch</b> query." },
          { vi: "Thiếu <b>index</b> trên cột hay lọc (WHERE) hoặc sắp xếp (ORDER BY).", en: "Missing an <b>index</b> on columns used to filter (WHERE) or sort (ORDER BY)." },
          { vi: "<b>SELECT *</b> thay vì chỉ lấy cột cần — kéo dư dữ liệu, phá covering index.", en: "<b>SELECT *</b> instead of only needed columns — pulls extra data and defeats covering indexes." },
        ] },
        { type: "callout", variant: "danger", vi: "N+1 là bẫy số 1 với ORM. Triệu chứng: trang chậm dần khi danh sách dài ra, log thấy hàng trăm query gần giống nhau. Luôn kiểm tra số query, không chỉ độ chậm một query.", en: "N+1 is the #1 ORM trap. Symptom: a page gets slower as the list grows, with hundreds of near-identical queries in the log. Always check the query count, not just one slow query." },
      ],
    },
    {
      id: "qa",
      title: { vi: "11. Câu hỏi phỏng vấn (trả lời gọn)", en: "11. Common interview Q&A" },
      blocks: [
        { type: "list", items: [
          { vi: "<b>\"SQL hay NoSQL cho dự án X?\"</b> → Theo access pattern + yêu cầu nhất quán; có thể dùng cả hai (polyglot persistence).", en: "<b>\"SQL or NoSQL for project X?\"</b> → By access pattern + consistency needs; you can use both (polyglot persistence)." },
          { vi: "<b>\"CAP theorem?\"</b> → Khi partition, chọn C hoặc A; mô tả CP vs AP + ví dụ; nhắc PACELC.", en: "<b>\"CAP theorem?\"</b> → On partition, choose C or A; describe CP vs AP + examples; mention PACELC." },
          { vi: "<b>\"ACID là gì?\"</b> → Atomicity / Consistency / Isolation / Durability + ví dụ chuyển tiền.", en: "<b>\"What is ACID?\"</b> → Atomicity / Consistency / Isolation / Durability + a money-transfer example." },
          { vi: "<b>\"Index hoạt động sao, có nhược điểm gì?\"</b> → B-tree tìm nhanh; nhược điểm: ghi chậm + tốn chỗ.", en: "<b>\"How do indexes work, any downsides?\"</b> → B-tree finds rows fast; downsides: slower writes + extra space." },
          { vi: "<b>\"Khắc phục N+1?\"</b> → JOIN / eager / batch loading.", en: "<b>\"How to fix N+1?\"</b> → JOIN / eager / batch loading." },
          { vi: "<b>\"Sharding vs replication?\"</b> → Shard chia dữ liệu (scale ghi); replica nhân bản (scale đọc + HA).", en: "<b>\"Sharding vs replication?\"</b> → Sharding splits data (scales writes); replication copies it (scales reads + HA)." },
        ] },
      ],
    },
    {
      id: "terms",
      title: { vi: "12. Thuật ngữ", en: "12. Terms" },
      blocks: [
        { type: "chips", items: ["ACID", "BASE", "CAP", "PACELC", "eventual consistency", "B-tree index", "composite index", "covering index", "normalization", "denormalization", "isolation level", "dirty read", "phantom read", "replication", "sharding", "partitioning", "read replica", "N+1", "OLTP", "OLAP", "polyglot persistence"] },
      ],
    },
  ],
  flashcards: [
    { front: { vi: "SQL vs NoSQL khác nhau cốt lõi ở đâu?", en: "Core difference between SQL and NoSQL?" }, back: { vi: "SQL: bảng + schema cố định + quan hệ (PK/FK) + <b>ACID</b>, scale dọc. NoSQL: schema linh hoạt, thiết kế <b>scale ngang</b>, thường <b>BASE</b> / eventual consistency.", en: "SQL: tables + fixed schema + relationships (PK/FK) + <b>ACID</b>, scales vertically. NoSQL: flexible schema, built to <b>scale horizontally</b>, usually <b>BASE</b> / eventual consistency." } },
    { front: { vi: "Kể 4 loại NoSQL và ví dụ.", en: "Name the 4 NoSQL types with examples." }, back: { vi: "<b>Document</b> (MongoDB), <b>Key-Value</b> (Redis, DynamoDB), <b>Wide-Column</b> (Cassandra, HBase), <b>Graph</b> (Neo4j).", en: "<b>Document</b> (MongoDB), <b>Key-Value</b> (Redis, DynamoDB), <b>Wide-Column</b> (Cassandra, HBase), <b>Graph</b> (Neo4j)." } },
    { front: { vi: "ACID viết tắt của gì?", en: "What does ACID stand for?" }, back: { vi: "<b>A</b>tomicity (toàn bộ hoặc không), <b>C</b>onsistency (đúng ràng buộc), <b>I</b>solation (không giẫm nhau), <b>D</b>urability (commit là bền vững).", en: "<b>A</b>tomicity (all or nothing), <b>C</b>onsistency (constraints hold), <b>I</b>solation (no interference), <b>D</b>urability (committed = persisted)." } },
    { front: { vi: "BASE là gì?", en: "What is BASE?" }, back: { vi: "<b>B</b>asically <b>A</b>vailable, <b>S</b>oft state, <b>E</b>ventually consistent — ưu tiên sẵn sàng + scale, chấp nhận nhất quán cuối cùng. Phổ biến ở NoSQL.", en: "<b>B</b>asically <b>A</b>vailable, <b>S</b>oft state, <b>E</b>ventually consistent — favors availability + scale, accepting eventual consistency. Common in NoSQL." } },
    { front: { vi: "CAP theorem nói gì? CP vs AP?", en: "What does the CAP theorem say? CP vs AP?" }, back: { vi: "Khi có <b>Partition</b>, chỉ chọn <b>C</b> hoặc <b>A</b>. <b>CP</b>: hi sinh availability để nhất quán (MongoDB, HBase). <b>AP</b>: hi sinh nhất quán để sẵn sàng (Cassandra, DynamoDB).", en: "On a <b>Partition</b>, pick <b>C</b> or <b>A</b>. <b>CP</b>: sacrifice availability for consistency (MongoDB, HBase). <b>AP</b>: sacrifice consistency for availability (Cassandra, DynamoDB)." } },
    { front: { vi: "PACELC bổ sung gì cho CAP?", en: "What does PACELC add to CAP?" }, back: { vi: "Khi có <b>P</b>artition chọn <b>A</b>/<b>C</b>; <b>E</b>lse (bình thường) chọn <b>L</b>atency/<b>C</b>onsistency — trade-off vẫn tồn tại cả khi không có partition.", en: "On <b>P</b>artition choose <b>A</b>/<b>C</b>; <b>E</b>lse (normal) choose <b>L</b>atency/<b>C</b>onsistency — the trade-off exists even without a partition." } },
    { front: { vi: "Index làm gì? Đánh đổi là gì?", en: "What does an index do? What's the trade-off?" }, back: { vi: "Thường là <b>B-tree</b> giúp tìm hàng nhanh, tránh full table scan. Đánh đổi: <b>đọc nhanh hơn</b> nhưng <b>ghi chậm hơn</b> + tốn bộ nhớ/đĩa.", en: "Usually a <b>B-tree</b> that finds rows fast, avoiding full table scans. Trade-off: <b>faster reads</b> but <b>slower writes</b> + extra memory/disk." } },
    { front: { vi: "Composite index & leftmost prefix?", en: "Composite index & leftmost prefix?" }, back: { vi: "Index nhiều cột (a, b, c). Chỉ dùng được khi query lọc theo a, hoặc a+b, hoặc a+b+c — phải bắt đầu từ cột <b>trái nhất</b>.", en: "A multi-column index (a, b, c). Usable only when the query filters by a, or a+b, or a+b+c — must start from the <b>leftmost</b> column." } },
    { front: { vi: "Covering index là gì?", en: "What is a covering index?" }, back: { vi: "Index chứa đủ cột để trả lời query mà <b>không cần đọc bảng</b> → nhanh hơn vì bỏ qua bước đọc data page.", en: "An index holding all columns needed to answer a query <b>without reading the table</b> → faster because it skips the data-page lookup." } },
    { front: { vi: "Normalization vs Denormalization?", en: "Normalization vs Denormalization?" }, back: { vi: "<b>Normalize</b>: tách bảng, giảm trùng lặp → ghi gọn/nhất quán, nhiều JOIN. <b>Denormalize</b>: lặp dữ liệu để đọc nhanh, ít JOIN (NoSQL, read model).", en: "<b>Normalize</b>: split tables, reduce duplication → compact/consistent writes, more JOINs. <b>Denormalize</b>: duplicate data for fast reads, fewer JOINs (NoSQL, read models)." } },
    { front: { vi: "3 vấn đề đọc khi giao dịch song song?", en: "Three concurrent-read anomalies?" }, back: { vi: "<b>Dirty read</b> (đọc dữ liệu chưa commit), <b>non-repeatable read</b> (đọc lại thấy giá trị khác), <b>phantom read</b> (đọc lại thấy thêm/bớt hàng).", en: "<b>Dirty read</b> (uncommitted data), <b>non-repeatable read</b> (different value on re-read), <b>phantom read</b> (more/fewer rows on re-read)." } },
    { front: { vi: "4 isolation level từ lỏng → chặt?", en: "Four isolation levels, loosest → strictest?" }, back: { vi: "Read Uncommitted → Read Committed (chặn dirty) → Repeatable Read (+ non-repeatable) → Serializable (+ phantom, chậm nhất).", en: "Read Uncommitted → Read Committed (blocks dirty) → Repeatable Read (+ non-repeatable) → Serializable (+ phantom, slowest)." } },
    { front: { vi: "Sharding vs Replication?", en: "Sharding vs Replication?" }, back: { vi: "<b>Sharding</b>: chia dữ liệu theo key ra nhiều node → scale <b>ghi</b>. <b>Replication</b>: nhân bản dữ liệu → scale <b>đọc</b> + high availability.", en: "<b>Sharding</b>: split data by key across nodes → scales <b>writes</b>. <b>Replication</b>: copy data → scales <b>reads</b> + high availability." } },
    { front: { vi: "N+1 query là gì? Cách fix?", en: "What is the N+1 query problem? How to fix?" }, back: { vi: "Lấy 1 list rồi query con cho từng phần tử → 1 + N query. Fix: <b>JOIN</b>, <b>eager loading</b>, hoặc <b>batch</b> query.", en: "Fetch a list then sub-query each element → 1 + N queries. Fix: <b>JOIN</b>, <b>eager loading</b>, or a <b>batch</b> query." } },
  ],
  quiz: [
    { q: { vi: "Đặc trưng nào đúng nhất cho NoSQL so với SQL?", en: "Which best characterizes NoSQL versus SQL?" },
      options: [{ vi: "Schema cố định và ACID mạnh", en: "Fixed schema and strong ACID" }, { vi: "Schema linh hoạt, thiết kế scale ngang", en: "Flexible schema, built to scale horizontally" }, { vi: "Luôn nhanh hơn SQL trong mọi trường hợp", en: "Always faster than SQL in every case" }, { vi: "Không bao giờ dùng được với dữ liệu lớn", en: "Can never handle large data" }], answer: 1,
      explain: { vi: "NoSQL ưu thế ở schema linh hoạt và scale ngang; không phải lúc nào cũng nhanh hơn, và SQL vẫn xử lý dữ liệu lớn tốt.", en: "NoSQL shines at flexible schema and horizontal scale; it isn't always faster, and SQL handles large data well too." } },
    { q: { vi: "Redis và DynamoDB thuộc loại NoSQL nào?", en: "Redis and DynamoDB are which NoSQL type?" },
      options: [{ vi: "Document", en: "Document" }, { vi: "Graph", en: "Graph" }, { vi: "Key-Value", en: "Key-Value" }, { vi: "Wide-Column", en: "Wide-Column" }], answer: 2,
      explain: { vi: "Cả hai là Key-Value store (map key → value), lý tưởng cho cache, session, leaderboard.", en: "Both are key-value stores (map key → value), ideal for caching, sessions, and leaderboards." } },
    { q: { vi: "Theo CAP, khi xảy ra Network Partition, hệ phân tán phải làm gì?", en: "Per CAP, during a network partition a distributed system must do what?" },
      options: [{ vi: "Có được cả C và A", en: "Keep both C and A" }, { vi: "Chọn giữa C và A", en: "Choose between C and A" }, { vi: "Tắt toàn bộ hệ thống", en: "Shut the whole system down" }, { vi: "Bỏ luôn cả C lẫn A", en: "Drop both C and A" }], answer: 1,
      explain: { vi: "Khi có partition, chỉ giữ được Consistency HOẶC Availability (CP vs AP). Không partition thì có cả hai.", en: "During a partition you can keep Consistency OR Availability (CP vs AP). Without a partition you get both." } },
    { q: { vi: "Chữ 'D' trong ACID nghĩa là gì?", en: "What does the 'D' in ACID mean?" },
      options: [{ vi: "Distribution (phân tán)", en: "Distribution" }, { vi: "Durability (đã commit là bền vững)", en: "Durability (committed data persists)" }, { vi: "Denormalization", en: "Denormalization" }, { vi: "Dirty read", en: "Dirty read" }], answer: 1,
      explain: { vi: "Durability: một khi giao dịch đã commit, dữ liệu tồn tại bền vững kể cả khi mất điện/crash.", en: "Durability: once a transaction commits, the data survives even power loss or a crash." } },
    { q: { vi: "Nhược điểm chính của việc thêm index là gì?", en: "What is the main downside of adding an index?" },
      options: [{ vi: "Làm chậm ghi (insert/update/delete) và tốn chỗ", en: "Slows writes (insert/update/delete) and costs space" }, { vi: "Làm chậm mọi câu đọc", en: "Slows every read query" }, { vi: "Phá vỡ tính ACID", en: "Breaks ACID guarantees" }, { vi: "Bắt buộc phải sharding", en: "Forces you to shard" }], answer: 0,
      explain: { vi: "Index tăng tốc đọc nhưng mỗi lần ghi phải cập nhật index → ghi chậm hơn và tốn bộ nhớ/đĩa.", en: "Indexes speed up reads, but every write must update the index → slower writes and extra memory/disk." } },
    { q: { vi: "Isolation level nào chặn được phantom read?", en: "Which isolation level prevents phantom reads?" },
      options: [{ vi: "Read Uncommitted", en: "Read Uncommitted" }, { vi: "Read Committed", en: "Read Committed" }, { vi: "Repeatable Read", en: "Repeatable Read" }, { vi: "Serializable", en: "Serializable" }], answer: 3,
      explain: { vi: "Serializable là chặt nhất, chặn cả dirty, non-repeatable và phantom read — đổi lại chậm nhất.", en: "Serializable is the strictest, blocking dirty, non-repeatable, and phantom reads — at the cost of being slowest." } },
    { q: { vi: "Để scale GHI (write) cho database, kỹ thuật nào phù hợp nhất?", en: "To scale WRITE throughput on a database, which technique fits best?" },
      options: [{ vi: "Read replica", en: "Read replicas" }, { vi: "Sharding / partitioning theo key", en: "Sharding / partitioning by key" }, { vi: "Thêm index", en: "Adding indexes" }, { vi: "SELECT *", en: "SELECT *" }], answer: 1,
      explain: { vi: "Sharding chia dữ liệu ra nhiều node → scale ghi. Read replica chỉ scale đọc + HA.", en: "Sharding splits data across nodes → scales writes. Read replicas only scale reads + HA." } },
    { q: { vi: "Cách khắc phục bài toán N+1 query?", en: "How do you fix the N+1 query problem?" },
      options: [{ vi: "Dùng JOIN / eager loading / batch query", en: "Use a JOIN / eager loading / batch query" }, { vi: "Thêm nhiều vòng lặp query con hơn", en: "Add more per-item sub-queries" }, { vi: "Luôn dùng SELECT *", en: "Always use SELECT *" }, { vi: "Tắt index", en: "Disable indexes" }], answer: 0,
      explain: { vi: "N+1 = 1 query list + N query con. Gộp lại bằng JOIN, eager loading hoặc batch để còn 1-2 query.", en: "N+1 = 1 list query + N sub-queries. Collapse them with a JOIN, eager loading, or batching into 1-2 queries." } },
  ],
});
