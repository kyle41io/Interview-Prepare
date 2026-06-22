/* Database Internals — Storage, Execution, Transactions, Concurrency, Durability, Scaling */
PREP.register({
  id: "db-internals",
  icon: "🗄️",
  category: "cs",
  title: { vi: "Cơ sở dữ liệu chuyên sâu", en: "Database Internals" },
  blurb: {
    vi: "Hiểu sâu bên trong CSDL: cách index thực sự hoạt động, query planner làm gì, tại sao ACID quan trọng, MVCC khác locking ra sao, và cách scale lên hàng triệu user.",
    en: "What actually happens inside a database: how indexes really work, what a query planner does, why ACID matters, how MVCC differs from locking, and how to scale to millions of users.",
  },
  sections: [
    {
      id: "storage-indexes",
      title: { vi: "1. Lưu trữ & Index", en: "1. Storage & Indexes" },
      blocks: [
        {
          type: "prose",
          vi: "Dữ liệu trên đĩa được tổ chức thành <b>page</b> (thường 4–16 KB). Index là cấu trúc dữ liệu riêng giúp tìm hàng nhanh hơn mà không quét toàn bộ bảng. Cấu trúc phổ biến nhất là <b>B+tree</b>.",
          en: "On-disk data is organized into <b>pages</b> (typically 4–16 KB). An index is a separate data structure that lets rows be found without a full table scan. The most common structure is the <b>B+tree</b>.",
        },
        {
          type: "table",
          headers: { vi: ["Loại index", "Cấu trúc", "Ưu điểm", "Khi dùng"], en: ["Index type", "Structure", "Strength", "Use when"] },
          rows: [
            { vi: ["B+tree", "Cây cân bằng, lá liên kết", "Range query, ORDER BY, =, &lt;, &gt;", "Hầu hết mọi cột"], en: ["B+tree", "Balanced tree, linked leaves", "Range queries, ORDER BY, =, &lt;, &gt;", "Almost every column"] },
            { vi: ["Hash index", "Hash table trên heap", "Lookup = O(1)", "Chỉ so sánh bằng (=), không range"], en: ["Hash index", "Hash table over heap", "Exact lookup O(1)", "Equality-only, no range queries"] },
            { vi: ["Clustered index", "Data page = leaf page", "Đọc theo thứ tự key cực nhanh", "Khóa chính (InnoDB luôn dùng)"], en: ["Clustered index", "Data page IS the leaf page", "Blazing sequential key reads", "Primary key (InnoDB always uses this)"] },
            { vi: ["Non-clustered index", "Leaf chứa pointer tới row", "Linh hoạt, nhiều index trên 1 bảng", "Các cột tìm kiếm phụ"], en: ["Non-clustered index", "Leaf holds pointer to row", "Flexible, multiple per table", "Secondary search columns"] },
            { vi: ["Covering index", "Index chứa tất cả cột cần", "Không cần đọc thêm row (index-only scan)", "Query chỉ dùng các cột trong index"], en: ["Covering index", "Index contains all needed columns", "No extra row read (index-only scan)", "Queries using only indexed columns"] },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "<b>B+tree vs B-tree:</b> B+tree chỉ lưu dữ liệu ở <b>leaf node</b>, các internal node chỉ chứa key để điều hướng. Các leaf được liên kết thành danh sách liên kết → range scan rất hiệu quả.",
          en: "<b>B+tree vs B-tree:</b> B+tree stores data only in <b>leaf nodes</b>; internal nodes hold keys for navigation only. Leaves are linked into a linked list → range scans are very efficient.",
        },
        {
          type: "code",
          code: "-- Tạo index\nCREATE INDEX idx_orders_customer ON orders(customer_id);\n\n-- Covering index: chứa cả status để tránh đọc thêm row\nCREATE INDEX idx_orders_cover ON orders(customer_id, status, created_at);\n\n-- Xem query plan (PostgreSQL)\nEXPLAIN (ANALYZE, BUFFERS)\nSELECT id, status, created_at\nFROM   orders\nWHERE  customer_id = 42\nORDER BY created_at DESC;\n-- Kết quả mong đợi: \"Index Only Scan\" trên idx_orders_cover",
          caption: {
            vi: "Tạo index và đọc EXPLAIN — index covering loại bỏ heap fetch",
            en: "Creating an index and reading EXPLAIN — a covering index eliminates the heap fetch",
          },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<b>Chi phí write của index:</b> mỗi INSERT/UPDATE/DELETE phải cập nhật tất cả index trên bảng. Bảng có 10 index → ghi chậm hơn đáng kể. Đừng index mọi thứ — chỉ index cột thực sự dùng trong WHERE, JOIN, ORDER BY.",
          en: "<b>Write cost of indexes:</b> every INSERT/UPDATE/DELETE must update all indexes on the table. 10 indexes on a table = noticeably slower writes. Don't index everything — only columns actually used in WHERE, JOIN, ORDER BY.",
        },
      ],
    },
    {
      id: "query-execution",
      title: { vi: "2. Thực thi & Lập kế hoạch truy vấn", en: "2. Query Execution & Planning" },
      blocks: [
        {
          type: "prose",
          vi: "Một câu SQL đi qua nhiều bước trước khi trả về dữ liệu: <b>parse → rewrite → plan → execute</b>.",
          en: "A SQL statement goes through several stages before returning data: <b>parse → rewrite → plan → execute</b>.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            { vi: "<b>Parser</b> — kiểm tra cú pháp, tạo AST (abstract syntax tree).", en: "<b>Parser</b> — checks syntax, builds an AST (abstract syntax tree)." },
            { vi: "<b>Rewriter</b> — áp dụng view definition, rule, macro.", en: "<b>Rewriter</b> — applies view definitions, rules, macros." },
            { vi: "<b>Planner / Optimizer</b> — dùng thống kê (số hàng, phân phối giá trị) để ước tính chi phí nhiều kế hoạch, chọn kế hoạch rẻ nhất. Đây là bước phức tạp nhất.", en: "<b>Planner / Optimizer</b> — uses statistics (row counts, value distributions) to cost-estimate many plans and pick the cheapest. This is the most complex stage." },
            { vi: "<b>Executor</b> — thực thi cây toán tử (scan, join, sort, aggregate) từ gốc đến lá.", en: "<b>Executor</b> — runs the operator tree (scan, join, sort, aggregate) root-to-leaf." },
          ],
        },
        {
          type: "table",
          headers: { vi: ["Thuật toán JOIN", "Mô tả", "Khi tốt"], en: ["JOIN algorithm", "Description", "Best when"] },
          rows: [
            { vi: ["Nested Loop Join", "Với mỗi hàng bảng ngoài, quét bảng trong", "Bảng nhỏ, index trên bảng trong"], en: ["Nested Loop Join", "For each outer row, scan inner table", "Small outer, index on inner"] },
            { vi: ["Hash Join", "Build hash table từ bảng nhỏ, probe từ bảng lớn", "Bảng lớn không có index, equi-join"], en: ["Hash Join", "Build hash table from smaller table, probe with larger", "Large tables without index, equi-join"] },
            { vi: ["Merge Join", "Sắp xếp cả hai rồi quét song song", "Cả hai bảng đã sort hoặc có sorted index"], en: ["Merge Join", "Sort both then scan in parallel", "Both sides already sorted or have sorted index"] },
          ],
        },
        {
          type: "code",
          code: "EXPLAIN (ANALYZE, FORMAT TEXT)\nSELECT u.name, COUNT(o.id) AS order_count\nFROM   users u\nJOIN   orders o ON o.user_id = u.id\nWHERE  u.country = 'VN'\nGROUP BY u.name;\n\n-- Đọc kết quả từ dưới lên:\n-- Seq Scan on users  (cost=0..180 rows=500)  -- full scan vi filter selectivity thap\n-- Index Scan on orders (cost=0..8 rows=20)   -- dung index\n-- Hash Join          (cost=... rows=500)\n-- HashAggregate     (cost=... rows=500)\n-- actual time=3.2..5.1 rows=487 loops=1",
          caption: {
            vi: "Đọc EXPLAIN ANALYZE từ dưới lên — node trong cùng thực thi trước",
            en: "Reading EXPLAIN ANALYZE bottom-up — innermost node executes first",
          },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Khi planner chọn sai plan (ví dụ full scan thay vì index scan): chạy <code>ANALYZE table_name</code> để cập nhật thống kê. Planner dùng số liệu cũ → ước tính sai → chọn kế hoạch sai.",
          en: "When the planner picks a bad plan (e.g. full scan instead of index scan): run <code>ANALYZE table_name</code> to refresh statistics. Stale stats → wrong estimates → wrong plan.",
        },
      ],
    },
    {
      id: "acid",
      title: { vi: "3. Giao dịch & ACID", en: "3. Transactions & ACID" },
      blocks: [
        {
          type: "prose",
          vi: "Một <b>giao dịch (transaction)</b> là một nhóm thao tác được thực hiện như một đơn vị duy nhất. ACID là bốn tính chất đảm bảo dữ liệu tin cậy:",
          en: "A <b>transaction</b> is a group of operations executed as a single unit. ACID is four properties that guarantee reliable data:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Atomicity (Nguyên tử)</b> — toàn bộ giao dịch thành công hoặc toàn bộ thất bại. Không có trạng thái giữa chừng. Ví dụ: chuyển tiền ngân hàng — trừ tài khoản A và cộng tài khoản B phải xảy ra cùng nhau hoặc không xảy ra.",
              en: "<b>Atomicity</b> — the entire transaction succeeds or the entire thing fails. No partial state. Example: bank transfer — debit account A and credit account B must both happen or neither happens.",
            },
            {
              vi: "<b>Consistency (Nhất quán)</b> — giao dịch đưa DB từ trạng thái hợp lệ này sang trạng thái hợp lệ khác — mọi ràng buộc (constraint, trigger, foreign key) đều được thỏa mãn.",
              en: "<b>Consistency</b> — a transaction moves the DB from one valid state to another — all constraints (constraint, trigger, foreign key) remain satisfied.",
            },
            {
              vi: "<b>Isolation (Độc lập)</b> — các giao dịch đồng thời không nhìn thấy dữ liệu chưa commit của nhau (ở mức isolation mặc định). Mỗi giao dịch trông như chạy một mình.",
              en: "<b>Isolation</b> — concurrent transactions don't see each other's uncommitted data (at default isolation level). Each transaction appears to run alone.",
            },
            {
              vi: "<b>Durability (Bền vững)</b> — sau khi COMMIT, dữ liệu được lưu vĩnh viễn dù server crash ngay sau đó. Thực hiện bằng WAL (Write-Ahead Log) và fsync.",
              en: "<b>Durability</b> — once COMMITted, data persists forever even if the server crashes immediately after. Implemented via WAL (Write-Ahead Log) and fsync.",
            },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Atomicity + Durability được bảo đảm bởi <b>logging (WAL)</b>. Consistency được bảo đảm bởi constraints + application logic. Isolation được bảo đảm bởi <b>concurrency control</b> (locking hoặc MVCC).",
          en: "Atomicity + Durability are guaranteed by <b>logging (WAL)</b>. Consistency by constraints + application logic. Isolation by <b>concurrency control</b> (locking or MVCC).",
        },
      ],
    },
    {
      id: "isolation-levels",
      title: { vi: "4. Mức độ Isolation & các anomaly", en: "4. Isolation Levels & Anomalies" },
      blocks: [
        {
          type: "prose",
          vi: "SQL định nghĩa 4 mức isolation theo thứ tự từ yếu đến mạnh. Mức cao hơn = an toàn hơn nhưng hiệu năng thấp hơn do cần nhiều lock/version hơn.",
          en: "SQL defines 4 isolation levels from weakest to strongest. Higher level = safer but lower throughput due to more locking/versioning.",
        },
        {
          type: "table",
          headers: {
            vi: ["Mức isolation", "Dirty Read", "Non-repeatable Read", "Phantom Read"],
            en: ["Isolation level", "Dirty Read", "Non-repeatable Read", "Phantom Read"],
          },
          rows: [
            { vi: ["Read Uncommitted", "✅ Có thể xảy ra", "✅ Có thể xảy ra", "✅ Có thể xảy ra"], en: ["Read Uncommitted", "✅ Possible", "✅ Possible", "✅ Possible"] },
            { vi: ["Read Committed (default PG)", "❌ Ngăn được", "✅ Có thể xảy ra", "✅ Có thể xảy ra"], en: ["Read Committed (PG default)", "❌ Prevented", "✅ Possible", "✅ Possible"] },
            { vi: ["Repeatable Read (default MySQL)", "❌ Ngăn được", "❌ Ngăn được", "✅ Có thể xảy ra*"], en: ["Repeatable Read (MySQL default)", "❌ Prevented", "❌ Prevented", "✅ Possible*"] },
            { vi: ["Serializable", "❌ Ngăn được", "❌ Ngăn được", "❌ Ngăn được"], en: ["Serializable", "❌ Prevented", "❌ Prevented", "❌ Prevented"] },
          ],
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Dirty Read</b> — đọc được dữ liệu của giao dịch khác <i>chưa commit</i>. Nguy hiểm: giao dịch kia có thể rollback.",
              en: "<b>Dirty Read</b> — reading data from another transaction that has <i>not yet committed</i>. Dangerous: the other transaction may roll back.",
            },
            {
              vi: "<b>Non-repeatable Read</b> — cùng một SELECT trả về kết quả khác nhau trong cùng giao dịch vì giao dịch khác đã UPDATE + commit ở giữa.",
              en: "<b>Non-repeatable Read</b> — the same SELECT returns different results within one transaction because another transaction did UPDATE + commit in between.",
            },
            {
              vi: "<b>Phantom Read</b> — cùng một SELECT trả về số hàng khác nhau vì giao dịch khác đã INSERT hoặc DELETE hàng phù hợp điều kiện WHERE ở giữa.",
              en: "<b>Phantom Read</b> — the same SELECT returns a different number of rows because another transaction INSERTed or DELETEd matching rows in between.",
            },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "* InnoDB (MySQL) Repeatable Read dùng MVCC snapshot + gap lock → thực tế ngăn được hầu hết phantom. PostgreSQL Repeatable Read cũng dùng snapshot toàn bộ giao dịch.",
          en: "* InnoDB (MySQL) Repeatable Read uses MVCC snapshot + gap locks → in practice prevents most phantoms. PostgreSQL Repeatable Read also uses a full-transaction snapshot.",
        },
      ],
    },
    {
      id: "concurrency",
      title: { vi: "5. Kiểm soát đồng thời — Locking & MVCC", en: "5. Concurrency Control — Locking & MVCC" },
      blocks: [
        {
          type: "prose",
          vi: "Hai cách tiếp cận chính để tránh xung đột khi nhiều giao dịch chạy đồng thời: <b>Locking</b> (pessimistic) và <b>MVCC</b> (optimistic / multi-version).",
          en: "Two main approaches to prevent conflicts when transactions run concurrently: <b>Locking</b> (pessimistic) and <b>MVCC</b> (optimistic / multi-version).",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Shared lock (S)</b> — nhiều giao dịch có thể đọc đồng thời. Ngăn write trong khi đang đọc.",
              en: "<b>Shared lock (S)</b> — multiple transactions can read concurrently. Prevents writes while reading.",
            },
            {
              vi: "<b>Exclusive lock (X)</b> — chỉ một giao dịch được giữ. Ngăn cả read lẫn write từ giao dịch khác.",
              en: "<b>Exclusive lock (X)</b> — only one transaction holds it. Blocks both reads and writes from other transactions.",
            },
            {
              vi: "<b>2PL (Two-Phase Locking)</b> — giai đoạn <i>growing</i>: chỉ acquire lock; giai đoạn <i>shrinking</i>: chỉ release lock. Đảm bảo serializable nhưng tăng nguy cơ deadlock.",
              en: "<b>2PL (Two-Phase Locking)</b> — <i>growing</i> phase: only acquire; <i>shrinking</i> phase: only release. Guarantees serializability but increases deadlock risk.",
            },
            {
              vi: "<b>MVCC (Multi-Version Concurrency Control)</b> — mỗi write tạo ra phiên bản mới của hàng với timestamp. Reader xem snapshot tại thời điểm giao dịch bắt đầu → <b>read không chặn write, write không chặn read</b>. Dùng trong PostgreSQL, MySQL InnoDB, Oracle.",
              en: "<b>MVCC (Multi-Version Concurrency Control)</b> — each write creates a new row version with a timestamp. Readers see a snapshot at transaction start → <b>reads don't block writes, writes don't block reads</b>. Used in PostgreSQL, MySQL InnoDB, Oracle.",
            },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<b>Deadlock</b> — giao dịch A giữ lock trên hàng 1, chờ lock trên hàng 2; giao dịch B giữ lock trên hàng 2, chờ lock trên hàng 1 → bế tắc vĩnh viễn. DB phát hiện bằng wait-for graph và rollback một giao dịch. Giảm thiểu bằng cách <b>luôn acquire lock theo cùng thứ tự</b>.",
          en: "<b>Deadlock</b> — transaction A holds lock on row 1, waits for row 2; transaction B holds row 2, waits for row 1 → permanent standstill. DB detects via wait-for graph and rolls back one transaction. Minimize by <b>always acquiring locks in the same order</b>.",
        },
        {
          type: "callout",
          variant: "info",
          vi: "MVCC cần <b>vacuum / purge</b> định kỳ để dọn các row version cũ không còn giao dịch nào cần (PostgreSQL: autovacuum; InnoDB: purge thread).",
          en: "MVCC requires periodic <b>vacuum / purge</b> to clean up old row versions no transaction still needs (PostgreSQL: autovacuum; InnoDB: purge thread).",
        },
      ],
    },
    {
      id: "durability-wal",
      title: { vi: "6. Độ bền & Phục hồi sau sự cố", en: "6. Durability & Crash Recovery" },
      blocks: [
        {
          type: "prose",
          vi: "<b>WAL (Write-Ahead Log)</b> là nền tảng của durability. Nguyên tắc: <i>ghi log trước khi ghi data page</i>. Nếu server crash, DB phát lại log để khôi phục trạng thái đúng.",
          en: "<b>WAL (Write-Ahead Log)</b> is the foundation of durability. The rule: <i>write to the log before writing data pages</i>. On crash, the DB replays the log to recover a consistent state.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            {
              vi: "Giao dịch ghi thay đổi vào <b>WAL buffer</b> trong memory trước.",
              en: "A transaction writes changes into the <b>WAL buffer</b> in memory first.",
            },
            {
              vi: "Khi COMMIT, WAL buffer được <b>fsync</b> xuống đĩa (đảm bảo data đến phương tiện lưu trữ vật lý).",
              en: "At COMMIT, the WAL buffer is <b>fsynced</b> to disk (guarantees data reaches physical storage).",
            },
            {
              vi: "Data page (heap) có thể ghi xuống đĩa muộn hơn (dirty page flush); log luôn được ghi trước.",
              en: "Data pages (heap) may be flushed to disk later (dirty page flush); the log always goes first.",
            },
            {
              vi: "<b>Checkpoint</b> — định kỳ DB ghi tất cả dirty page xuống đĩa và ghi checkpoint record vào log. Khi phục hồi chỉ cần phát lại log từ checkpoint gần nhất.",
              en: "<b>Checkpoint</b> — periodically the DB writes all dirty pages to disk and writes a checkpoint record to the log. On recovery only the log from the last checkpoint needs replaying.",
            },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "<b>Redo log</b> (trong WAL): ghi lại <i>những gì đã thay đổi</i> → dùng để phát lại sau crash. <b>Undo log</b> (InnoDB): ghi lại <i>giá trị trước khi thay đổi</i> → dùng để rollback giao dịch chưa commit và hỗ trợ MVCC.",
          en: "<b>Redo log</b> (in WAL): records <i>what changed</i> → used to replay after crash. <b>Undo log</b> (InnoDB): records <i>the value before the change</i> → used to roll back uncommitted transactions and support MVCC.",
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Tắt <code>fsync</code> (ví dụ: <code>synchronous_commit = off</code> trong PG) tăng throughput đáng kể nhưng <b>phá vỡ durability</b>. Dùng cho log/analytics non-critical, không bao giờ dùng cho dữ liệu tài chính.",
          en: "Disabling <code>fsync</code> (e.g. <code>synchronous_commit = off</code> in PG) boosts throughput significantly but <b>breaks durability</b>. OK for non-critical logs/analytics, never for financial data.",
        },
      ],
    },
    {
      id: "scaling",
      title: { vi: "7. Scaling — Replication & Sharding", en: "7. Scaling — Replication & Sharding" },
      blocks: [
        {
          type: "prose",
          vi: "Khi một server không đủ: scale <b>vertically</b> (máy to hơn) có giới hạn vật lý. Scale <b>horizontally</b> bằng replication và sharding.",
          en: "When one server isn't enough: <b>vertical scaling</b> (bigger machine) has physical limits. Scale <b>horizontally</b> via replication and sharding.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Leader-follower replication (primary-replica)</b> — một leader nhận write; một hoặc nhiều follower nhận bản sao và phục vụ read. <b>Synchronous</b>: leader chờ ít nhất một follower xác nhận trước khi commit → không mất dữ liệu, latency cao hơn. <b>Asynchronous</b>: leader commit ngay, follower sync sau → latency thấp hơn nhưng có thể mất dữ liệu khi failover.",
              en: "<b>Leader-follower replication (primary-replica)</b> — one leader accepts writes; one or more followers receive a copy and serve reads. <b>Synchronous</b>: leader waits for at least one follower to confirm before committing → no data loss, higher latency. <b>Asynchronous</b>: leader commits immediately, follower syncs after → lower latency but potential data loss on failover.",
            },
            {
              vi: "<b>Read replicas</b> — follower chỉ để phục vụ read → phân tải đọc. Chấp nhận <b>replication lag</b> (đọc có thể hơi cũ).",
              en: "<b>Read replicas</b> — followers serve reads only → offload read traffic. Accept <b>replication lag</b> (reads may be slightly stale).",
            },
            {
              vi: "<b>Partitioning / Sharding</b> — chia dữ liệu bảng thành nhiều phần, mỗi phần trên server khác nhau. <b>Horizontal partitioning</b> (sharding): chia theo hàng (ví dụ: user_id mod 4). <b>Vertical partitioning</b>: chia theo cột hoặc tính năng. Sharding giải quyết bottleneck write nhưng làm phức tạp cross-shard query và transaction.",
              en: "<b>Partitioning / Sharding</b> — split table data into pieces, each on a different server. <b>Horizontal partitioning</b> (sharding): split by rows (e.g. user_id mod 4). <b>Vertical partitioning</b>: split by columns or feature. Sharding resolves write bottlenecks but complicates cross-shard queries and transactions.",
            },
            {
              vi: "<b>Connection pooling</b> (ví dụ PgBouncer, ProxySQL) — tái sử dụng kết nối DB để giảm overhead tạo kết nối mới, thường là bottleneck ở quy mô lớn.",
              en: "<b>Connection pooling</b> (e.g. PgBouncer, ProxySQL) — reuse DB connections to reduce the overhead of establishing new ones, often a bottleneck at scale.",
            },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Với hầu hết ứng dụng: <b>read replicas + caching (Redis)</b> giải quyết 90% vấn đề scale trước khi cần đến sharding. Sharding chỉ nên là lựa chọn cuối cùng vì độ phức tạp cao.",
          en: "For most apps: <b>read replicas + caching (Redis)</b> solves 90% of scale problems before sharding is needed. Sharding should be a last resort due to its complexity.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "\"Index giúp đọc nhanh hơn nhưng write chậm hơn. MVCC giúp read và write không chặn nhau. WAL đảm bảo dữ liệu không mất khi crash. Read replica scale đọc; sharding scale ghi — nhưng đừng shard sớm.\"",
          en: "\"Indexes speed up reads but slow down writes. MVCC lets reads and writes coexist without blocking. WAL ensures data survives crashes. Read replicas scale reads; sharding scales writes — but don't shard prematurely.\"",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "B+tree index khác B-tree ở điểm gì quan trọng nhất?", en: "What is the most important difference between a B+tree and a B-tree index?" },
      back: { vi: "B+tree lưu dữ liệu <b>chỉ ở leaf node</b>; các leaf được liên kết thành linked list → range scan O(n) hiệu quả. B-tree lưu dữ liệu ở mọi node → range scan kém hơn.", en: "B+tree stores data <b>only in leaf nodes</b>; leaves are linked into a linked list → efficient O(n) range scans. B-tree stores data at every node → range scans are less efficient." },
    },
    {
      front: { vi: "Covering index là gì và tại sao nó nhanh hơn?", en: "What is a covering index and why is it faster?" },
      back: { vi: "Covering index chứa tất cả cột mà query cần. Không cần đọc thêm heap (data page) → <b>index-only scan</b>, ít I/O hơn.", en: "A covering index contains all columns a query needs. No extra heap (data page) read required → <b>index-only scan</b>, fewer I/Os." },
    },
    {
      front: { vi: "Tại sao thêm nhiều index lại làm chậm write?", en: "Why do more indexes slow down writes?" },
      back: { vi: "Mỗi INSERT/UPDATE/DELETE phải cập nhật cấu trúc B+tree của <b>tất cả index</b> trên bảng, cộng thêm WAL entries cho từng index.", en: "Every INSERT/UPDATE/DELETE must update the B+tree structure of <b>every index</b> on the table, plus WAL entries for each index." },
    },
    {
      front: { vi: "Ba thuật toán JOIN chính là gì? Khi nào dùng Hash Join?", en: "What are the three main JOIN algorithms? When is Hash Join used?" },
      back: { vi: "Nested Loop, Hash Join, Merge Join. Hash Join dùng khi <b>cả hai bảng lớn, không có index phù hợp</b>, và là equi-join. Planner build hash table từ bảng nhỏ hơn.", en: "Nested Loop, Hash Join, Merge Join. Hash Join is used when <b>both tables are large, no suitable index exists</b>, and it is an equi-join. The planner builds a hash table from the smaller side." },
    },
    {
      front: { vi: "Giải thích Atomicity bằng ví dụ thực tế.", en: "Explain Atomicity with a real-world example." },
      back: { vi: "Chuyển tiền ngân hàng: trừ 100$ tài khoản A <b>và</b> cộng 100$ tài khoản B phải xảy ra cùng nhau hoặc không xảy ra. Nếu server crash sau bước 1, bước 1 bị rollback.", en: "Bank transfer: debit $100 from account A <b>and</b> credit $100 to account B must both happen or neither happens. If the server crashes after step 1, step 1 is rolled back." },
    },
    {
      front: { vi: "Dirty Read là gì? Mức isolation nào ngăn được nó?", en: "What is a Dirty Read? Which isolation level prevents it?" },
      back: { vi: "Đọc dữ liệu của giao dịch khác <b>chưa commit</b>. Giao dịch đó có thể rollback → dữ liệu đọc được không bao giờ thực sự tồn tại. Ngăn từ <b>Read Committed</b> trở lên.", en: "Reading data from another transaction that has <b>not committed yet</b>. That transaction may roll back → the data read never actually existed. Prevented from <b>Read Committed</b> upward." },
    },
    {
      front: { vi: "MVCC là gì? Lợi thế chính so với locking?", en: "What is MVCC? Main advantage over locking?" },
      back: { vi: "Multi-Version Concurrency Control: mỗi write tạo phiên bản hàng mới với timestamp; reader xem snapshot lúc giao dịch bắt đầu. Lợi thế: <b>read không chặn write, write không chặn read</b> → throughput cao hơn.", en: "Multi-Version Concurrency Control: each write creates a new row version with a timestamp; readers see a snapshot from transaction start. Advantage: <b>reads don't block writes, writes don't block reads</b> → higher throughput." },
    },
    {
      front: { vi: "WAL (Write-Ahead Log) đảm bảo tính chất nào của ACID?", en: "Which ACID property does WAL (Write-Ahead Log) guarantee?" },
      back: { vi: "WAL đảm bảo <b>Atomicity</b> (undo chưa-commit) và <b>Durability</b> (redo sau crash). Log được ghi và fsynced xuống đĩa <i>trước</i> data page.", en: "WAL guarantees <b>Atomicity</b> (undo uncommitted changes) and <b>Durability</b> (redo after crash). The log is written and fsynced to disk <i>before</i> data pages." },
    },
    {
      front: { vi: "Checkpoint trong DB là gì và tại sao cần?", en: "What is a database checkpoint and why is it needed?" },
      back: { vi: "Checkpoint là thời điểm DB flush tất cả dirty page xuống đĩa và ghi marker vào WAL. Khi phục hồi sau crash, chỉ cần phát lại WAL từ checkpoint gần nhất → <b>giảm thời gian recovery</b>.", en: "A checkpoint is when the DB flushes all dirty pages to disk and writes a marker into the WAL. On crash recovery, only WAL from the last checkpoint needs replaying → <b>reduces recovery time</b>." },
    },
    {
      front: { vi: "Synchronous vs Asynchronous replication — đánh đổi gì?", en: "Synchronous vs Asynchronous replication — what is the trade-off?" },
      back: { vi: "<b>Sync</b>: leader chờ follower confirm → không mất dữ liệu khi failover, nhưng latency write cao hơn. <b>Async</b>: leader commit ngay → latency thấp hơn, nhưng có thể mất vài transaction nếu leader crash trước khi follower nhận được.", en: "<b>Sync</b>: leader waits for follower confirmation → no data loss on failover, but higher write latency. <b>Async</b>: leader commits immediately → lower latency, but a few transactions may be lost if the leader crashes before the follower receives them." },
    },
    {
      front: { vi: "Khi nào nên dùng sharding? Nhược điểm chính?", en: "When should you use sharding? Main drawbacks?" },
      back: { vi: "Khi write throughput vượt quá khả năng một node (đã thử vertical scaling + index + query tuning + read replica). Nhược điểm: cross-shard query và distributed transaction rất phức tạp; re-sharding tốn kém.", en: "When write throughput exceeds a single node (after trying vertical scaling, index tuning, and read replicas). Drawbacks: cross-shard queries and distributed transactions are very complex; re-sharding is expensive." },
    },
    {
      front: { vi: "Deadlock xảy ra như thế nào? DB xử lý ra sao?", en: "How does a deadlock occur? How does the DB handle it?" },
      back: { vi: "Giao dịch A giữ lock R1, chờ R2; giao dịch B giữ R2, chờ R1 → vòng chờ vô hạn. DB phát hiện bằng <b>wait-for graph</b> và rollback một giao dịch (thường là giao dịch nhẹ hơn / ít công việc hơn).", en: "Transaction A holds lock R1, waits for R2; transaction B holds R2, waits for R1 → circular wait forever. DB detects via a <b>wait-for graph</b> and rolls back one transaction (usually the lighter one)." },
    },
  ],
  quiz: [
    {
      q: {
        vi: "Tại sao B+tree được ưa dùng hơn B-tree cho index trong hầu hết RDBMS?",
        en: "Why is B+tree preferred over B-tree for indexes in most RDBMS?",
      },
      options: [
        { vi: "B+tree nhanh hơn cho point lookup vì lưu dữ liệu ở mọi node", en: "B+tree is faster for point lookups because it stores data at every node" },
        { vi: "Leaf node được liên kết → range scan hiệu quả; internal node nhỏ hơn → cây thấp hơn", en: "Linked leaves enable efficient range scans; smaller internal nodes mean a shallower tree" },
        { vi: "B+tree không cần cân bằng lại (rebalance)", en: "B+tree never needs rebalancing" },
        { vi: "B+tree chiếm ít bộ nhớ hơn B-tree", en: "B+tree uses less memory than B-tree" },
      ],
      answer: 1,
      explain: {
        vi: "Leaf node liên kết nhau → range scan chỉ cần đi xuống cây một lần rồi đi ngang. Internal node không chứa data → nhiều key hơn trên mỗi page → cây thấp hơn → ít I/O hơn.",
        en: "Linked leaves let range scans descend once then traverse horizontally. Internal nodes hold no data → more keys per page → shallower tree → fewer I/Os.",
      },
    },
    {
      q: {
        vi: "Covering index giúp gì cho performance?",
        en: "What performance benefit does a covering index provide?",
      },
      options: [
        { vi: "Giảm kích thước index", en: "Reduces index size" },
        { vi: "Cho phép index-only scan, không cần đọc thêm data page", en: "Enables index-only scan, eliminating extra data page reads" },
        { vi: "Tăng tốc độ INSERT", en: "Speeds up INSERTs" },
        { vi: "Ngăn deadlock", en: "Prevents deadlocks" },
      ],
      answer: 1,
      explain: {
        vi: "Khi index chứa đủ tất cả cột query cần, engine đọc kết quả trực tiếp từ index mà không cần theo pointer đến heap (data page). Giảm I/O đáng kể với bảng lớn.",
        en: "When the index contains all columns the query needs, the engine reads results directly from the index without following pointers to the heap (data pages). Significantly reduces I/O on large tables.",
      },
    },
    {
      q: {
        vi: "Thuật toán JOIN nào phù hợp nhất khi cả hai bảng rất lớn và không có index trên cột join?",
        en: "Which JOIN algorithm is best suited when both tables are very large and there is no index on the join column?",
      },
      options: [
        { vi: "Nested Loop Join", en: "Nested Loop Join" },
        { vi: "Hash Join", en: "Hash Join" },
        { vi: "Merge Join", en: "Merge Join" },
        { vi: "Index Join", en: "Index Join" },
      ],
      answer: 1,
      explain: {
        vi: "Hash Join build hash table từ bảng nhỏ hơn (O(n)), rồi probe bảng lớn hơn (O(m)) → O(n+m). Nested Loop sẽ là O(n×m) — quá chậm. Merge Join cần sort trước.",
        en: "Hash Join builds a hash table from the smaller table O(n), then probes the larger O(m) → O(n+m). Nested Loop would be O(n×m) — too slow. Merge Join requires sorting first.",
      },
    },
    {
      q: {
        vi: "'Isolation' trong ACID nghĩa là gì?",
        en: "What does 'Isolation' mean in ACID?",
      },
      options: [
        { vi: "Dữ liệu được mã hóa khi lưu trữ", en: "Data is encrypted at rest" },
        { vi: "Giao dịch đồng thời không nhìn thấy trạng thái trung gian của nhau", en: "Concurrent transactions cannot see each other's intermediate states" },
        { vi: "Mỗi bảng được lưu trong file riêng biệt", en: "Each table is stored in a separate file" },
        { vi: "Backup được thực hiện trên server riêng biệt", en: "Backups are performed on a separate server" },
      ],
      answer: 1,
      explain: {
        vi: "Isolation đảm bảo mỗi giao dịch trông như chạy một mình — không thấy dữ liệu uncommitted của giao dịch khác (ở mức isolation mặc định). Thực hiện bởi locking hoặc MVCC.",
        en: "Isolation ensures each transaction appears to run alone — it cannot see uncommitted data from other transactions (at the default isolation level). Implemented by locking or MVCC.",
      },
    },
    {
      q: {
        vi: "Mức isolation nào ngăn được Dirty Read nhưng vẫn cho phép Non-repeatable Read?",
        en: "Which isolation level prevents Dirty Reads but still allows Non-repeatable Reads?",
      },
      options: [
        { vi: "Read Uncommitted", en: "Read Uncommitted" },
        { vi: "Read Committed", en: "Read Committed" },
        { vi: "Repeatable Read", en: "Repeatable Read" },
        { vi: "Serializable", en: "Serializable" },
      ],
      answer: 1,
      explain: {
        vi: "Read Committed chỉ đọc dữ liệu đã commit → loại bỏ Dirty Read. Nhưng giữa hai lần SELECT trong cùng giao dịch, giao dịch khác có thể commit UPDATE → Non-repeatable Read vẫn xảy ra.",
        en: "Read Committed only reads committed data → eliminates Dirty Reads. But between two SELECTs in the same transaction another transaction can commit an UPDATE → Non-repeatable Reads still occur.",
      },
    },
    {
      q: {
        vi: "MVCC giải quyết vấn đề gì mà locking thuần túy không làm tốt?",
        en: "What problem does MVCC solve that pure locking handles poorly?",
      },
      options: [
        { vi: "Ngăn deadlock hoàn toàn", en: "Completely prevents deadlocks" },
        { vi: "Cho phép read và write đồng thời không chặn nhau", en: "Allows concurrent reads and writes without blocking each other" },
        { vi: "Giảm dung lượng lưu trữ", en: "Reduces storage usage" },
        { vi: "Tăng tốc độ single-threaded query", en: "Speeds up single-threaded queries" },
      ],
      answer: 1,
      explain: {
        vi: "Với locking thuần túy, reader phải chờ writer và ngược lại. MVCC giữ nhiều phiên bản row → reader xem snapshot cũ trong khi writer tạo phiên bản mới → <b>không chặn nhau</b>.",
        en: "With pure locking, readers must wait for writers and vice versa. MVCC keeps multiple row versions → readers see an old snapshot while writers create new versions → <b>no blocking each other</b>.",
      },
    },
    {
      q: {
        vi: "Trong WAL, 'write-ahead' nghĩa là gì?",
        en: "In WAL, what does 'write-ahead' mean?",
      },
      options: [
        { vi: "Data page được ghi vào đĩa trước khi log", en: "Data pages are written to disk before the log" },
        { vi: "Log được ghi và fsynced xuống đĩa trước khi data page", en: "The log is written and fsynced to disk before data pages" },
        { vi: "Log được ghi trước trong memory nhưng data page ghi đĩa trước", en: "Log is written first in memory but data pages hit disk first" },
        { vi: "Log và data page được ghi đồng thời", en: "Log and data pages are written simultaneously" },
      ],
      answer: 1,
      explain: {
        vi: "WAL đảm bảo log entry đã an toàn trên đĩa (fsynced) <i>trước khi</i> data page tương ứng được ghi. Nếu crash xảy ra giữa chừng, log có thể replay để khôi phục hoặc undo thay đổi.",
        en: "WAL guarantees the log entry is safely on disk (fsynced) <i>before</i> the corresponding data page is written. If a crash occurs mid-way, the log can be replayed to redo or undo changes.",
      },
    },
    {
      q: {
        vi: "Lợi thế chính của asynchronous replication so với synchronous là gì?",
        en: "What is the main advantage of asynchronous replication over synchronous?",
      },
      options: [
        { vi: "Không bao giờ mất dữ liệu khi failover", en: "No data loss ever on failover" },
        { vi: "Latency write thấp hơn vì leader không chờ follower", en: "Lower write latency because the leader does not wait for followers" },
        { vi: "Đọc luôn nhất quán trên mọi replica", en: "Reads are always consistent across all replicas" },
        { vi: "Không cần WAL", en: "WAL is not needed" },
      ],
      answer: 1,
      explain: {
        vi: "Async: leader commit ngay sau khi ghi WAL cục bộ, không chờ follower. Giảm latency write đáng kể, đặc biệt khi follower ở xa. Đánh đổi: có thể mất một số transaction nếu leader crash trước khi follower nhận được.",
        en: "Async: the leader commits immediately after writing its local WAL, without waiting for followers. Significantly reduces write latency, especially with geographically distant followers. Trade-off: a few transactions may be lost if the leader crashes before followers receive them.",
      },
    },
    {
      q: {
        vi: "Checkpoint trong RDBMS giúp gì cho quá trình phục hồi sau crash?",
        en: "How does a checkpoint in an RDBMS help with crash recovery?",
      },
      options: [
        { vi: "Xóa toàn bộ WAL log", en: "Deletes the entire WAL log" },
        { vi: "Rút ngắn lượng WAL cần replay bằng cách tạo điểm bắt đầu an toàn đã biết", en: "Shortens the amount of WAL to replay by establishing a known safe starting point" },
        { vi: "Tạo backup đầy đủ của database", en: "Creates a full backup of the database" },
        { vi: "Khóa tất cả giao dịch trong khi chạy", en: "Locks all transactions while running" },
      ],
      answer: 1,
      explain: {
        vi: "Checkpoint flush tất cả dirty page xuống đĩa và ghi marker. Khi recovery, DB chỉ cần phát lại WAL từ checkpoint gần nhất — không cần replay từ đầu → phục hồi nhanh hơn nhiều.",
        en: "A checkpoint flushes all dirty pages to disk and writes a marker. During recovery the DB only needs to replay WAL from the last checkpoint — no need to replay from the beginning → much faster recovery.",
      },
    },
    {
      q: {
        vi: "Khi nào bạn nên cân nhắc sharding thay vì chỉ dùng read replica?",
        en: "When should you consider sharding instead of just using read replicas?",
      },
      options: [
        { vi: "Khi read traffic cao hơn write traffic", en: "When read traffic is higher than write traffic" },
        { vi: "Khi write throughput vượt quá khả năng tối đa của một leader node", en: "When write throughput exceeds the maximum capacity of a single leader node" },
        { vi: "Khi muốn giảm replication lag", en: "When you want to reduce replication lag" },
        { vi: "Khi cần thêm index", en: "When you need to add more indexes" },
      ],
      answer: 1,
      explain: {
        vi: "Read replica chỉ phân tải read; leader vẫn xử lý tất cả write. Nếu write là bottleneck (sau khi đã tối ưu query và vertical scale), cần sharding để phân tải write sang nhiều node.",
        en: "Read replicas only distribute read load; the leader still handles all writes. If writes are the bottleneck (after query optimization and vertical scaling), sharding is needed to distribute write load across multiple nodes.",
      },
    },
  ],
});
