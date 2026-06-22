/* Elasticsearch & Search — Study topic */
PREP.register({
  id: "elasticsearch",
  icon: "🔎",
  category: "frontend",
  title: { vi: "Tìm kiếm & Elasticsearch", en: "Search & Elasticsearch" },
  blurb: {
    vi: "Xây dựng trải nghiệm tìm kiếm tốt đòi hỏi hiểu rõ cả engine phía sau (inverted index, relevance, Query DSL) lẫn cách tích hợp phía frontend (autocomplete, debounce, facet, highlight). Elasticsearch là engine tìm kiếm phổ biến nhất hiện nay.",
    en: "Building great search experiences requires understanding the engine underneath (inverted index, relevance, Query DSL) as well as the frontend integration (autocomplete, debounce, facets, highlighting). Elasticsearch is the most widely used search engine today.",
  },
  sections: [
    {
      id: "why-search-engine",
      title: { vi: "1. Tại sao cần Search Engine — SQL LIKE có gì sai?", en: "1. Why a Search Engine — What's wrong with SQL LIKE?" },
      blocks: [
        {
          type: "prose",
          vi: "Khi người dùng gõ vào ô tìm kiếm, họ muốn <b>kết quả phù hợp nhất</b> — không phải chuỗi khớp chính xác. <code>SELECT * FROM products WHERE name LIKE '%iphone%'</code> hoạt động ở quy mô nhỏ, nhưng nhanh chóng đổ vỡ ở hàng triệu bản ghi và không trả lời được câu hỏi: \"Kết quả nào <b>liên quan nhất</b>?\"",
          en: "When users type into a search box, they want the <b>most relevant results</b> — not exact string matches. <code>SELECT * FROM products WHERE name LIKE '%iphone%'</code> works at small scale but quickly falls apart at millions of rows and can't answer: \"Which result is <b>most relevant</b>?\"",
        },
        {
          type: "table",
          headers: { vi: ["Tiêu chí", "SQL LIKE", "Search Engine (Elasticsearch)"], en: ["Criterion", "SQL LIKE", "Search Engine (Elasticsearch)"] },
          rows: [
            { vi: ["Tốc độ", "Quét toàn bảng O(n)", "Index lookup O(1)~O(log n)"], en: ["Speed", "Full table scan O(n)", "Index lookup O(1)~O(log n)"] },
            { vi: ["Relevance / xếp hạng", "Không có — thứ tự tùy ý", "Score BM25 — gần nhất lên đầu"], en: ["Relevance / ranking", "None — arbitrary order", "BM25 scoring — most relevant first"] },
            { vi: ["Tolerate typo", "Không — \"iphon\" ≠ \"iphone\"", "Fuzzy search tự tolerate lỗi chính tả"], en: ["Typo tolerance", "No — \"iphon\" ≠ \"iphone\"", "Fuzzy search handles misspellings"] },
            { vi: ["Tách từ / ngôn ngữ", "Không — coi chuỗi là một khối", "Analyzer tokenize + stem + stopword"], en: ["Tokenization / language", "No — treats string as opaque blob", "Analyzer: tokenize + stem + stopword"] },
            { vi: ["Scale", "Chậm > vài triệu row", "Horizontal sharding, tỉ docs"], en: ["Scale", "Slow beyond millions of rows", "Horizontal sharding, billions of docs"] },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Quy tắc ngón tay cái: dùng SQL LIKE khi dataset nhỏ &lt; 100 k bản ghi và không cần relevance. Dùng search engine khi cần <b>full-text, relevance, hoặc scale</b>.",
          en: "Rule of thumb: use SQL LIKE when dataset is small (&lt; 100 k rows) and relevance doesn't matter. Use a search engine when you need <b>full-text search, relevance ranking, or scale</b>.",
        },
      ],
    },
    {
      id: "inverted-index",
      title: { vi: "2. Inverted Index — Bí mật đằng sau tốc độ tìm kiếm", en: "2. Inverted Index — The secret behind search speed" },
      blocks: [
        {
          type: "prose",
          vi: "Một <b>inverted index</b> (chỉ mục đảo ngược) là cấu trúc dữ liệu cốt lõi của mọi search engine. Thay vì duyệt từng document để tìm từ, ta xây một bảng ánh xạ: <b>từ → danh sách các document chứa từ đó</b>.",
          en: "An <b>inverted index</b> is the core data structure of every search engine. Instead of scanning each document for a word, we pre-build a map: <b>term → list of documents containing that term</b>.",
        },
        {
          type: "prose",
          vi: "Ví dụ: ta có 3 documents:\n<b>Doc 1</b>: \"quick brown fox\"\n<b>Doc 2</b>: \"quick blue bird\"\n<b>Doc 3</b>: \"lazy brown dog\"\nInverted index sẽ là:",
          en: "Example: we have 3 documents:\n<b>Doc 1</b>: \"quick brown fox\"\n<b>Doc 2</b>: \"quick blue bird\"\n<b>Doc 3</b>: \"lazy brown dog\"\nThe inverted index looks like:",
        },
        {
          type: "table",
          headers: { vi: ["Term (từ)", "Document IDs"], en: ["Term", "Document IDs"] },
          rows: [
            { vi: ["quick", "Doc 1, Doc 2"], en: ["quick", "Doc 1, Doc 2"] },
            { vi: ["brown", "Doc 1, Doc 3"], en: ["brown", "Doc 1, Doc 3"] },
            { vi: ["fox", "Doc 1"], en: ["fox", "Doc 1"] },
            { vi: ["blue", "Doc 2"], en: ["blue", "Doc 2"] },
            { vi: ["bird", "Doc 2"], en: ["bird", "Doc 2"] },
            { vi: ["lazy", "Doc 3"], en: ["lazy", "Doc 3"] },
            { vi: ["dog", "Doc 3"], en: ["dog", "Doc 3"] },
          ],
        },
        {
          type: "prose",
          vi: "Khi user tìm \"quick brown\": Elasticsearch lấy danh sách doc của \"quick\" ({1,2}) và \"brown\" ({1,3}), sau đó <b>giao (intersection)</b> hoặc <b>hợp (union)</b> tùy loại query. Việc này cực nhanh vì chỉ là phép toán tập hợp trên posting list, <b>không cần quét toàn bộ dữ liệu</b>.",
          en: "When user searches \"quick brown\": Elasticsearch fetches the doc list for \"quick\" ({1,2}) and \"brown\" ({1,3}), then <b>intersects</b> or <b>unions</b> them depending on query type. This is extremely fast — it's just set operations on posting lists, <b>no full data scan needed</b>.",
        },
        {
          type: "callout",
          variant: "info",
          vi: "Mỗi entry trong posting list còn lưu <b>term frequency</b> (TF — từ xuất hiện bao nhiêu lần trong doc đó) và <b>position</b> (vị trí từ trong document) để tính relevance score sau này.",
          en: "Each entry in the posting list also stores <b>term frequency</b> (TF — how many times the term appears in that doc) and <b>position</b> (term offset in the document) for later relevance scoring.",
        },
      ],
    },
    {
      id: "core-concepts",
      title: { vi: "3. Các khái niệm cốt lõi của Elasticsearch", en: "3. Elasticsearch Core Concepts" },
      blocks: [
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Index</b> — Tương đương database/table trong SQL. Chứa một tập document cùng loại (VD: <code>products</code>, <code>articles</code>).",
              en: "<b>Index</b> — Equivalent to a database/table in SQL. Contains a collection of related documents (e.g. <code>products</code>, <code>articles</code>).",
            },
            {
              vi: "<b>Document</b> — Một bản ghi JSON. Đơn vị lưu trữ cơ bản trong Elasticsearch (tương đương row trong SQL).",
              en: "<b>Document</b> — A single JSON record. The basic storage unit in Elasticsearch (like a row in SQL).",
            },
            {
              vi: "<b>Mapping</b> — Schema định nghĩa kiểu dữ liệu cho từng field. Quan trọng nhất: phân biệt <code>text</code> (full-text, được analyze) và <code>keyword</code> (exact match, dùng cho filter/sort/aggregation).",
              en: "<b>Mapping</b> — Schema defining data types for each field. Most critical: the difference between <code>text</code> (full-text, analyzed) and <code>keyword</code> (exact match, used for filtering/sorting/aggregations).",
            },
            {
              vi: "<b>Analyzer / Tokenizer</b> — Pipeline xử lý text khi index và khi tìm kiếm. Mặc định: tách từ bằng whitespace/dấu câu, chuyển lowercase, bỏ stopword (\"the\", \"a\"), stemming (\"running\" → \"run\").",
              en: "<b>Analyzer / Tokenizer</b> — Text processing pipeline applied at index time and search time. Default: split on whitespace/punctuation, lowercase, remove stopwords (\"the\", \"a\"), stem (\"running\" → \"run\").",
            },
            {
              vi: "<b>Shard</b> — Mỗi index được chia thành nhiều shard (primary shard) để phân tán dữ liệu qua nhiều node. Cho phép scale ngang.",
              en: "<b>Shard</b> — Each index is split into multiple shards (primary shards) distributed across nodes. Enables horizontal scaling.",
            },
            {
              vi: "<b>Replica</b> — Bản sao của shard để tăng tính sẵn sàng (HA) và read throughput. Nếu primary shard chết, replica được promote.",
              en: "<b>Replica</b> — Copy of a shard for high availability and read throughput. If a primary shard fails, a replica is promoted.",
            },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<b>text vs keyword</b> là sai lầm phổ biến nhất. Dùng <code>text</code> cho nội dung full-text (tiêu đề, mô tả). Dùng <code>keyword</code> cho giá trị exact (tag, status, ID, email). Một field có thể có cả hai qua <b>multi-fields</b>: <code>name.keyword</code>.",
          en: "<b>text vs keyword</b> is the most common mapping mistake. Use <code>text</code> for full-text content (titles, descriptions). Use <code>keyword</code> for exact values (tags, status, IDs, emails). A field can have both via <b>multi-fields</b>: <code>name.keyword</code>.",
        },
      ],
    },
    {
      id: "query-dsl",
      title: { vi: "4. Query DSL — match, term, bool", en: "4. Query DSL — match, term, bool" },
      blocks: [
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>match</b> — Full-text query. Query string được analyze (tách từ, lowercase…) rồi so với inverted index của <code>text</code> field. <b>Dùng cho ô tìm kiếm của user</b>.",
              en: "<b>match</b> — Full-text query. The query string is analyzed (tokenized, lowercased…) then matched against the <code>text</code> field's inverted index. <b>Use for user-facing search boxes</b>.",
            },
            {
              vi: "<b>term</b> — Exact-value query. <b>Không analyze</b> query string — so khớp chính xác với <code>keyword</code> field. Dùng cho filter theo status, category, ID.",
              en: "<b>term</b> — Exact-value query. Does <b>not analyze</b> the query string — matches exactly against a <code>keyword</code> field. Use for filtering by status, category, ID.",
            },
            {
              vi: "<b>bool</b> — Kết hợp nhiều query với logic: <code>must</code> (AND, ảnh hưởng score), <code>filter</code> (AND, không ảnh hưởng score, được cache), <code>should</code> (OR, tăng score nếu match), <code>must_not</code> (NOT, loại trừ).",
              en: "<b>bool</b> — Combine multiple queries with logic: <code>must</code> (AND, affects score), <code>filter</code> (AND, does not affect score, cached), <code>should</code> (OR, boosts score if matches), <code>must_not</code> (NOT, excludes).",
            },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "<code>filter</code> trong bool query nhanh hơn <code>must</code> vì <b>không tính score</b> và kết quả được <b>cache</b>. Luôn dùng <code>filter</code> cho điều kiện Yes/No (in stock, category, date range) và để <code>must</code> chỉ cho full-text relevance.",
          en: "<code>filter</code> clauses in bool queries are faster than <code>must</code> because they <b>skip scoring</b> and results are <b>cached</b>. Always use <code>filter</code> for binary conditions (in stock, category, date range) and reserve <code>must</code> for full-text relevance.",
        },
        {
          type: "code",
          code: "// Bool query: tìm sản phẩm iphone, lọc theo category=electronics,\n// in_stock=true, boost nếu brand=Apple\nGET /products/_search\n{\n  \"query\": {\n    \"bool\": {\n      \"must\": [\n        { \"match\": { \"name\": \"iphone\" } }\n      ],\n      \"filter\": [\n        { \"term\": { \"category.keyword\": \"electronics\" } },\n        { \"term\": { \"in_stock\": true } }\n      ],\n      \"should\": [\n        { \"term\": { \"brand.keyword\": \"Apple\" } }\n      ]\n    }\n  },\n  \"highlight\": {\n    \"fields\": { \"name\": {}, \"description\": {} }\n  },\n  \"from\": 0,\n  \"size\": 10\n}",
          caption: {
            vi: "Bool query kết hợp full-text search, exact filter, và boost — cấu trúc phổ biến nhất trong thực tế",
            en: "Bool query combining full-text search, exact filter, and boost — the most common real-world pattern",
          },
        },
      ],
    },
    {
      id: "relevance-scoring",
      title: { vi: "5. Relevance & Scoring — TF-IDF / BM25 / Boosting", en: "5. Relevance & Scoring — TF-IDF / BM25 / Boosting" },
      blocks: [
        {
          type: "prose",
          vi: "Elasticsearch xếp hạng kết quả theo <b>_score</b> — càng cao thì càng liên quan. Score được tính bằng thuật toán <b>BM25</b> (phiên bản cải tiến của TF-IDF):",
          en: "Elasticsearch ranks results by <b>_score</b> — higher means more relevant. Scores are computed using the <b>BM25</b> algorithm (an improved version of TF-IDF):",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>TF (Term Frequency)</b> — Từ xuất hiện càng nhiều trong document, score càng cao. Nhưng BM25 <b>giới hạn</b> ảnh hưởng của TF để tránh spam từ khóa.",
              en: "<b>TF (Term Frequency)</b> — The more a term appears in a document, the higher the score. BM25 <b>caps</b> TF's influence to prevent keyword stuffing.",
            },
            {
              vi: "<b>IDF (Inverse Document Frequency)</b> — Từ xuất hiện trong ít document hơn thì <b>hiếm và có giá trị hơn</b>. Từ phổ biến như \"the\", \"a\" có IDF thấp.",
              en: "<b>IDF (Inverse Document Frequency)</b> — Terms appearing in fewer documents are <b>rarer and more valuable</b>. Common words like \"the\", \"a\" have low IDF.",
            },
            {
              vi: "<b>Field length normalization</b> — Document ngắn match tốt hơn document dài với cùng số lần xuất hiện của từ.",
              en: "<b>Field length normalization</b> — Short documents score higher than long ones for the same term frequency.",
            },
          ],
        },
        {
          type: "prose",
          vi: "<b>Boosting</b> cho phép tăng tầm quan trọng của một field hoặc query. Ví dụ: match trong <code>title</code> quan trọng hơn match trong <code>description</code>:",
          en: "<b>Boosting</b> lets you amplify the importance of a field or query. For example, matching in <code>title</code> should matter more than matching in <code>description</code>:",
        },
        {
          type: "code",
          code: "{\n  \"query\": {\n    \"multi_match\": {\n      \"query\": \"wireless headphones\",\n      \"fields\": [\"title^3\", \"description^1\", \"tags^2\"]\n    }\n  }\n}",
          caption: {
            vi: "<code>^3</code> boost title gấp 3x — match trong title tính score cao hơn nhiều",
            en: "<code>^3</code> boosts title 3×  — a match in the title is worth much more",
          },
        },
        {
          type: "callout",
          variant: "key",
          vi: "Nếu kết quả không như mong muốn, dùng <code>GET /index/_explain/&lt;doc_id&gt;</code> để xem Elasticsearch tính score thế nào cho một document cụ thể — cực kỳ hữu ích để debug relevance.",
          en: "If results feel wrong, use <code>GET /index/_explain/&lt;doc_id&gt;</code> to see exactly how Elasticsearch computed the score for a specific document — invaluable for debugging relevance.",
        },
      ],
    },
    {
      id: "frontend-search-ui",
      title: { vi: "6. Xây dựng Search UI (Frontend)", en: "6. Building the Search UI (Frontend)" },
      blocks: [
        {
          type: "prose",
          vi: "Tích hợp Elasticsearch vào frontend đòi hỏi xử lý nhiều vấn đề UX: <b>autocomplete</b>, <b>debounce</b>, <b>faceted search</b>, <b>highlight</b>, và <b>pagination</b>. Đây là những chủ đề thường bị hỏi trong phỏng vấn frontend.",
          en: "Integrating search into the frontend requires handling several UX challenges: <b>autocomplete</b>, <b>debounce</b>, <b>faceted search</b>, <b>highlighting</b>, and <b>pagination</b>. These are common frontend interview topics.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Autocomplete / Typeahead</b> — Gọi API khi user gõ. Dùng <code>prefix</code> query hoặc <code>search_as_you_type</code> field type trong ES. Cần debounce để tránh spam request.",
              en: "<b>Autocomplete / Typeahead</b> — Call API as user types. Use <code>prefix</code> query or the <code>search_as_you_type</code> field type in ES. Debounce is essential to avoid request spam.",
            },
            {
              vi: "<b>Debounce</b> — Trì hoãn gọi API đến khi user ngừng gõ N ms (thường 200–300 ms). Giảm load server đáng kể. Kết hợp với <b>cancel stale request</b> (AbortController) để tránh race condition: request cũ trả về sau request mới.",
              en: "<b>Debounce</b> — Delay the API call until the user stops typing for N ms (typically 200–300 ms). Dramatically reduces server load. Pair with <b>cancelling stale requests</b> (AbortController) to prevent race conditions where an old request returns after a newer one.",
            },
            {
              vi: "<b>Faceted / Filtered Search</b> — Sidebar filter (\"Category\", \"Price range\", \"Rating\"). Dùng ES <b>aggregations</b> để đếm số doc trong mỗi bucket và hiển thị count cho user. Filter dùng <code>bool.filter</code> — không ảnh hưởng score.",
              en: "<b>Faceted / Filtered Search</b> — Sidebar filters (\"Category\", \"Price range\", \"Rating\"). Use ES <b>aggregations</b> to count docs per bucket and display counts to the user. Filtering uses <code>bool.filter</code> — doesn't affect relevance score.",
            },
            {
              vi: "<b>Highlight</b> — ES trả về fragments với từ khóa được bọc trong <code>&lt;em&gt;</code>. Frontend chỉ cần render HTML đó. Dùng field <code>highlight</code> trong query (đã thấy ở ví dụ trên).",
              en: "<b>Highlighting</b> — ES returns text fragments with matched terms wrapped in <code>&lt;em&gt;</code>. The frontend just renders that HTML. Use the <code>highlight</code> field in the query (seen in the earlier example).",
            },
            {
              vi: "<b>Pagination</b> — Dùng <code>from</code> + <code>size</code> cho numbered pages. Dùng <b>search_after</b> (cursor-based) cho infinite scroll — hiệu quả hơn và không bị vấn đề deep pagination của <code>from</code>.",
              en: "<b>Pagination</b> — Use <code>from</code> + <code>size</code> for numbered pages. Use <b>search_after</b> (cursor-based) for infinite scroll — more efficient and avoids the deep-pagination problem of large <code>from</code> values.",
            },
          ],
        },
        {
          type: "code",
          code: "// Debounce + AbortController pattern (React / vanilla JS)\nlet abortController = null;\n\nfunction handleSearchInput(query) {\n  // Cancel previous in-flight request\n  if (abortController) abortController.abort();\n  abortController = new AbortController();\n\n  clearTimeout(debounceTimer);\n  debounceTimer = setTimeout(async () => {\n    try {\n      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {\n        signal: abortController.signal,\n      });\n      const data = await res.json();\n      renderResults(data.hits);\n    } catch (err) {\n      if (err.name !== 'AbortError') console.error(err);\n    }\n  }, 250);\n}",
          caption: {
            vi: "Pattern chuẩn: debounce 250 ms + AbortController hủy request cũ — tránh race condition và giảm request thừa",
            en: "Standard pattern: 250 ms debounce + AbortController to cancel stale requests — prevents race conditions and cuts wasted requests",
          },
        },
      ],
    },
    {
      id: "architecture-security",
      title: { vi: "7. Kiến trúc & Bảo mật — KHÔNG bao giờ expose ES trực tiếp", en: "7. Architecture & Security — NEVER expose ES directly to the browser" },
      blocks: [
        {
          type: "callout",
          variant: "warning",
          vi: "<b>KHÔNG BAO GIỜ</b> cho browser gọi thẳng vào Elasticsearch cluster. Elasticsearch không có authentication mạnh theo mặc định và Query DSL cho phép user làm bất cứ điều gì — đọc toàn bộ data, delete index, chiếm cluster.",
          en: "<b>NEVER</b> let the browser call Elasticsearch directly. Elasticsearch lacks strong authentication by default and the full Query DSL lets a user do anything — read all data, delete indices, take over the cluster.",
        },
        {
          type: "prose",
          vi: "Kiến trúc đúng: <b>Browser → Backend API (Node/Python/Go…) → Elasticsearch</b>. Backend chịu trách nhiệm:",
          en: "Correct architecture: <b>Browser → Backend API (Node/Python/Go…) → Elasticsearch</b>. The backend is responsible for:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Authentication & Authorization</b> — Kiểm tra user đã đăng nhập chưa, có quyền tìm kiếm tài nguyên này không.",
              en: "<b>Authentication &amp; Authorization</b> — Verify the user is logged in and has permission to search these resources.",
            },
            {
              vi: "<b>Query shaping</b> — Nhận query đơn giản từ frontend (VD: <code>{q: \"iphone\", category: \"electronics\"}</code>), xây dựng Query DSL đầy đủ với các filter bắt buộc (VD: chỉ tìm data của tenant đó).",
              en: "<b>Query shaping</b> — Accept a simple request from the frontend (e.g. <code>{q: \"iphone\", category: \"electronics\"}</code>) and build the full Query DSL with mandatory filters (e.g. scope to current tenant's data).",
            },
            {
              vi: "<b>Rate limiting</b> — Tránh một user spam search request làm quá tải cluster.",
              en: "<b>Rate limiting</b> — Prevent a single user from flooding the cluster with search requests.",
            },
            {
              vi: "<b>Response shaping</b> — Chỉ trả về fields cần thiết cho frontend, không leak internal metadata.",
              en: "<b>Response shaping</b> — Return only the fields the frontend needs; don't leak internal metadata.",
            },
          ],
        },
        {
          type: "table",
          headers: {
            vi: ["Layer", "Trách nhiệm", "Công nghệ ví dụ"],
            en: ["Layer", "Responsibility", "Example tech"],
          },
          rows: [
            { vi: ["Browser / App", "UI, debounce, render kết quả", "React, Vue, Vanilla JS"], en: ["Browser / App", "UI, debounce, render results", "React, Vue, Vanilla JS"] },
            { vi: ["Backend API", "Auth, query shaping, rate limit, response shaping", "Express, FastAPI, Spring Boot"], en: ["Backend API", "Auth, query shaping, rate limiting, response shaping", "Express, FastAPI, Spring Boot"] },
            { vi: ["Elasticsearch", "Full-text search, scoring, aggregations", "Elasticsearch 8.x, OpenSearch"], en: ["Elasticsearch", "Full-text search, scoring, aggregations", "Elasticsearch 8.x, OpenSearch"] },
          ],
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Elasticsearch là một <b>internal data store</b>, không phải public API. Treat it like your database: đặt sau firewall, chỉ cho backend service truy cập, và <b>không bao giờ</b> để client-side JavaScript kết nối trực tiếp.",
          en: "Elasticsearch is an <b>internal data store</b>, not a public API. Treat it like your database: put it behind a firewall, allow only your backend service to connect, and <b>never</b> let client-side JavaScript reach it directly.",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "SQL LIKE '%...%' có vấn đề gì ở quy mô lớn?", en: "What are the problems with SQL LIKE '%...%' at scale?" },
      back: { vi: "Quét toàn bảng O(n), không có relevance ranking, không tolerate typo, không tokenize/stem text, chậm với hàng triệu bản ghi.", en: "Full table scan O(n), no relevance ranking, no typo tolerance, no tokenization/stemming, slow beyond millions of rows." },
    },
    {
      front: { vi: "Inverted index là gì?", en: "What is an inverted index?" },
      back: { vi: "Cấu trúc dữ liệu ánh xạ từng <b>term → danh sách document</b> chứa term đó. Cho phép tìm kiếm cực nhanh bằng cách lookup thay vì scan.", en: "A data structure mapping each <b>term → list of documents</b> containing that term. Enables extremely fast search via lookup instead of scanning." },
    },
    {
      front: { vi: "Khác nhau giữa field type text và keyword?", en: "What is the difference between text and keyword field types?" },
      back: { vi: "<code>text</code>: được analyze (tokenize, lowercase…), dùng cho full-text search. <code>keyword</code>: exact match, không analyze, dùng cho filter, sort, aggregation.", en: "<code>text</code>: analyzed (tokenized, lowercased…), used for full-text search. <code>keyword</code>: exact match, not analyzed, used for filtering, sorting, aggregations." },
    },
    {
      front: { vi: "Dùng match hay term query cho ô tìm kiếm của user?", en: "Should you use match or term query for a user search box?" },
      back: { vi: "<b>match</b> — nó analyze query string giống như cách ES analyze khi index, nên sẽ so khớp đúng. <code>term</code> không analyze và sẽ fail với text fields.", en: "<b>match</b> — it analyzes the query string the same way ES analyzed the field at index time, so they align correctly. <code>term</code> is not analyzed and will fail on text fields." },
    },
    {
      front: { vi: "Tại sao nên dùng filter thay vì must trong bool query?", en: "Why prefer filter over must in a bool query?" },
      back: { vi: "<code>filter</code> không tính relevance score (nhanh hơn) và kết quả được <b>cache</b>. Dùng <code>must</code> chỉ khi muốn ảnh hưởng score (full-text relevance).", en: "<code>filter</code> skips relevance scoring (faster) and results are <b>cached</b>. Use <code>must</code> only when you want to influence the relevance score (full-text)." },
    },
    {
      front: { vi: "BM25 cải tiến TF-IDF thế nào?", en: "How does BM25 improve on TF-IDF?" },
      back: { vi: "BM25 <b>giới hạn ảnh hưởng của TF</b> (diminishing returns — thêm lần xuất hiện không tăng score mãi) và tính đến <b>độ dài field</b>. Kết quả relevance tốt hơn trong thực tế.", en: "BM25 <b>caps TF's influence</b> (diminishing returns — more occurrences don't keep boosting score indefinitely) and accounts for <b>field length</b>. Better real-world relevance than plain TF-IDF." },
    },
    {
      front: { vi: "Debounce trong search UI hoạt động thế nào?", en: "How does debounce work in a search UI?" },
      back: { vi: "Trì hoãn gọi API cho đến khi user ngừng gõ một khoảng thời gian (VD: 250 ms). Nếu user tiếp tục gõ, reset timer. Giảm đáng kể số request gửi đến backend.", en: "Delay the API call until the user stops typing for a set interval (e.g. 250 ms). If the user keeps typing, reset the timer. Significantly reduces the number of requests sent to the backend." },
    },
    {
      front: { vi: "Race condition trong search và cách fix?", en: "What is the search race condition and how do you fix it?" },
      back: { vi: "Nếu request cũ trả về sau request mới, kết quả sẽ hiển thị sai. Fix: dùng <b>AbortController</b> để cancel request cũ ngay khi user gõ thêm.", en: "If an older request resolves after a newer one, stale results are displayed. Fix: use <b>AbortController</b> to cancel the previous request as soon as the user types again." },
    },
    {
      front: { vi: "Khi nào nên dùng search_after thay vì from+size?", en: "When should you use search_after instead of from+size?" },
      back: { vi: "Cho <b>infinite scroll</b> hoặc khi page number lớn. <code>from</code> lớn rất chậm vì ES phải fetch-and-discard toàn bộ doc trước đó. <code>search_after</code> dùng cursor, luôn O(1) để lấy page tiếp theo.", en: "For <b>infinite scroll</b> or deep pages. Large <code>from</code> is slow because ES must fetch-and-discard all prior docs. <code>search_after</code> uses a cursor and is always O(1) to get the next page." },
    },
    {
      front: { vi: "Tại sao không được cho browser gọi thẳng vào Elasticsearch?", en: "Why must you never expose Elasticsearch directly to the browser?" },
      back: { vi: "ES mặc định không có auth mạnh; Query DSL toàn năng cho phép đọc/xóa/ghi bất kỳ data nào. Phải đặt một <b>backend API</b> ở giữa để xác thực, phân quyền và giới hạn query.", en: "ES has no strong auth by default; the full Query DSL lets anyone read/delete/write any data. You must put a <b>backend API</b> in between to handle authentication, authorization, and query shaping." },
    },
  ],
  quiz: [
    {
      q: {
        vi: "Query nào phù hợp nhất cho ô tìm kiếm full-text của người dùng?",
        en: "Which query type is most appropriate for a user-facing full-text search box?",
      },
      options: [
        { vi: "term query", en: "term query" },
        { vi: "match query", en: "match query" },
        { vi: "range query", en: "range query" },
        { vi: "ids query", en: "ids query" },
      ],
      answer: 1,
      explain: {
        vi: "<code>match</code> analyze query string giống như lúc index, nên so khớp đúng với <code>text</code> field. <code>term</code> là exact match và không hoạt động với analyzed text fields.",
        en: "<code>match</code> analyzes the query string the same way the field was analyzed at index time, so they align correctly on <code>text</code> fields. <code>term</code> is an exact match and doesn't work as expected on analyzed text fields.",
      },
    },
    {
      q: {
        vi: "Điều gì xảy ra khi sử dụng <code>from: 10000</code> trong Elasticsearch?",
        en: "What happens when you use <code>from: 10000</code> in an Elasticsearch query?",
      },
      options: [
        { vi: "Elasticsearch trả về ngay lập tức từ cursor đã lưu", en: "Elasticsearch returns immediately from a stored cursor" },
        { vi: "Elasticsearch phải fetch 10000 doc đầu, bỏ đi rồi mới trả page tiếp", en: "Elasticsearch must fetch the first 10,000 docs, discard them, then return the next page" },
        { vi: "Query bị từ chối vì vượt giới hạn", en: "The query is rejected because it exceeds a limit" },
        { vi: "Elasticsearch trả về random page", en: "Elasticsearch returns a random page" },
      ],
      answer: 1,
      explain: {
        vi: "Deep pagination với <code>from</code> rất chậm vì ES phải thu thập và sắp xếp từ đầu mỗi lần. Dùng <code>search_after</code> cho infinite scroll để tránh vấn đề này.",
        en: "Deep pagination with <code>from</code> is very slow because ES must collect and sort from the beginning each time. Use <code>search_after</code> for infinite scroll to avoid this.",
      },
    },
    {
      q: {
        vi: "Field type nào phù hợp để lọc (filter) theo giá trị chính xác như category='electronics'?",
        en: "Which field type is appropriate for exact-value filtering like category='electronics'?",
      },
      options: [
        { vi: "text", en: "text" },
        { vi: "keyword", en: "keyword" },
        { vi: "match_only_text", en: "match_only_text" },
        { vi: "analyzed", en: "analyzed" },
      ],
      answer: 1,
      explain: {
        vi: "<code>keyword</code> lưu giá trị nguyên vẹn, không analyze — hoàn hảo cho exact match, filter, sort và aggregation. <code>text</code> được tokenize và sẽ không hoạt động cho exact match.",
        en: "<code>keyword</code> stores the raw value without analysis — perfect for exact match, filtering, sorting and aggregations. <code>text</code> is tokenized and won't work for exact matching.",
      },
    },
    {
      q: {
        vi: "Mục đích chính của Inverted Index là gì?",
        en: "What is the primary purpose of an inverted index?",
      },
      options: [
        { vi: "Nén dữ liệu để tiết kiệm bộ nhớ", en: "Compress data to save memory" },
        { vi: "Ánh xạ term → danh sách document để tìm kiếm nhanh không cần scan", en: "Map terms → document lists for fast lookup without full-data scanning" },
        { vi: "Mã hóa dữ liệu cho bảo mật", en: "Encrypt data for security" },
        { vi: "Sắp xếp document theo alphabet", en: "Sort documents alphabetically" },
      ],
      answer: 1,
      explain: {
        vi: "Inverted index đảo ngược quan hệ: thay vì doc → words, ta có word → docs. Điều này cho phép lookup O(1) thay vì quét toàn bộ corpus.",
        en: "An inverted index reverses the relationship: instead of doc → words, we have word → docs. This enables O(1) lookup instead of scanning the entire corpus.",
      },
    },
    {
      q: {
        vi: "Tại sao filter clause trong bool query nhanh hơn must clause?",
        en: "Why is a filter clause in a bool query faster than a must clause?",
      },
      options: [
        { vi: "filter dùng network connection riêng", en: "filter uses a separate network connection" },
        { vi: "filter bỏ qua inverted index", en: "filter skips the inverted index" },
        { vi: "filter không tính relevance score và kết quả được cache", en: "filter skips relevance scoring and results are cached" },
        { vi: "filter chỉ chạy trên primary shard", en: "filter only runs on the primary shard" },
      ],
      answer: 2,
      explain: {
        vi: "<code>filter</code> context bỏ qua việc tính BM25 score và ES cache kết quả filter. Với binary conditions (yes/no) không cần ranking, luôn ưu tiên <code>filter</code> hơn <code>must</code>.",
        en: "<code>filter</code> context skips BM25 score calculation and ES caches filter results. For binary conditions (yes/no) where ranking doesn't matter, always prefer <code>filter</code> over <code>must</code>.",
      },
    },
    {
      q: {
        vi: "AbortController trong JavaScript search được dùng để làm gì?",
        en: "What is AbortController used for in a JavaScript search implementation?",
      },
      options: [
        { vi: "Dừng user gõ quá nhanh", en: "Stop the user from typing too fast" },
        { vi: "Hủy request HTTP đang bay để tránh race condition", en: "Cancel in-flight HTTP requests to prevent race conditions" },
        { vi: "Giới hạn số kết quả trả về", en: "Limit the number of results returned" },
        { vi: "Compress payload JSON", en: "Compress the JSON payload" },
      ],
      answer: 1,
      explain: {
        vi: "Khi user gõ thêm, request trước đó có thể chưa về. AbortController.abort() hủy request đó để tránh trường hợp kết quả cũ hiện ra sau kết quả mới (race condition).",
        en: "When the user types more, the previous request may still be in flight. AbortController.abort() cancels it, preventing stale results from appearing after more recent ones (race condition).",
      },
    },
    {
      q: {
        vi: "Kiến trúc nào là ĐÚNG khi tích hợp Elasticsearch với web app?",
        en: "Which architecture is CORRECT when integrating Elasticsearch with a web app?",
      },
      options: [
        { vi: "Browser → Elasticsearch trực tiếp", en: "Browser → Elasticsearch directly" },
        { vi: "Browser → Backend API → Elasticsearch", en: "Browser → Backend API → Elasticsearch" },
        { vi: "Browser → CDN → Elasticsearch", en: "Browser → CDN → Elasticsearch" },
        { vi: "Browser → WebSocket → Elasticsearch", en: "Browser → WebSocket → Elasticsearch" },
      ],
      answer: 1,
      explain: {
        vi: "Browser phải đi qua Backend API. Backend đảm nhiệm auth, phân quyền, query shaping, rate limiting. Không bao giờ expose ES cluster ra public internet cho browser gọi trực tiếp.",
        en: "The browser must go through a Backend API. The backend handles auth, authorization, query shaping, and rate limiting. Never expose the ES cluster to the public internet for direct browser access.",
      },
    },
    {
      q: {
        vi: "Boosting field với <code>title^3</code> trong multi_match query có nghĩa là gì?",
        en: "What does boosting a field with <code>title^3</code> in a multi_match query do?",
      },
      options: [
        { vi: "Title field được index 3 lần", en: "The title field is indexed 3 times" },
        { vi: "Match trong title field được tính score gấp 3x so với boost bằng 1", en: "A match in the title field contributes 3× more to the score than a field with boost 1" },
        { vi: "Chỉ trả về 3 kết quả từ title", en: "Only 3 results are returned from the title field" },
        { vi: "Title field chỉ tìm trong 3 từ đầu tiên", en: "Title field only searches the first 3 words" },
      ],
      answer: 1,
      explain: {
        vi: "Boost factor nhân vào score của match trong field đó. <code>title^3</code> làm cho match trong title đóng góp vào tổng score gấp 3 lần so với match trong một field không có boost.",
        en: "The boost factor multiplies the score contribution of a match in that field. <code>title^3</code> makes a match in the title contribute 3× as much to the total score as a match in an un-boosted field.",
      },
    },
  ],
});
