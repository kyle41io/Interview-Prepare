/* Skeleton Loading — Frontend topic */
PREP.register({
  id: "skeleton-loading",
  icon: "💀",
  category: "frontend",
  title: { vi: "Skeleton Loading", en: "Skeleton Loading" },
  blurb: {
    vi: "Skeleton loading là kỹ thuật hiển thị khung xám mờ thay cho nội dung đang tải — giúp trang trông nhanh hơn, giảm bounce rate và đặt kỳ vọng đúng cho người dùng.",
    en: "Skeleton loading displays grey placeholder shapes while content loads — making pages feel faster, reducing bounce rate, and correctly setting user expectations.",
  },
  sections: [
    {
      id: "what-and-why",
      title: { vi: "1. Skeleton Loading là gì & Tại sao dùng?", en: "1. What is Skeleton Loading & Why use it?" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Skeleton loading</b> (hay skeleton screen) là kỹ thuật UX hiển thị các khối hình dạng mờ giống cấu trúc của nội dung thật trong khi dữ liệu đang được tải về. Thay vì màn hình trắng trống hoặc spinner quay vô tận, người dùng thấy ngay bố cục sắp xuất hiện.",
          en: "<b>Skeleton loading</b> (or skeleton screen) is a UX technique that displays low-fidelity placeholder shapes matching the real content structure while data is being fetched. Instead of a blank screen or an infinite spinner, users immediately see the layout about to appear.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Perceived performance</b> — Trang trông nhanh hơn vì người dùng thấy nội dung xuất hiện ngay lập tức (dù chỉ là khung). Nghiên cứu của Luke Wroblewski cho thấy skeleton screens cảm giác nhanh hơn 10–15% so với spinner dù thời gian tải thực sự như nhau.",
              en: "<b>Perceived performance</b> — The page feels faster because users see something immediately (even a placeholder). Research by Luke Wroblewski shows skeleton screens feel 10–15% faster than spinners even with identical actual load times.",
            },
            {
              vi: "<b>Giảm bounce rate</b> — Người dùng ít bỏ trang hơn khi thấy trang đang tiến triển thay vì trắng xóa. Màn hình trắng gây cảm giác \"trang bị lỗi\".",
              en: "<b>Reduces bounce rate</b> — Users are less likely to leave when they see progress rather than a blank page. A blank screen feels like a broken page.",
            },
            {
              vi: "<b>Đặt kỳ vọng đúng</b> — Skeleton có hình dạng giống nội dung thật (thẻ bài viết, ảnh, text) cho người dùng biết trước bố cục sắp xuất hiện, giảm sự bất ngờ khi nội dung hiện ra.",
              en: "<b>Sets correct expectations</b> — Skeletons shaped like the real content (cards, images, text) tell users what layout is coming, reducing cognitive surprise when content appears.",
            },
            {
              vi: "<b>Tránh layout shift (CLS)</b> — Khi skeleton có kích thước trùng khớp với nội dung thật, trang sẽ không bị nhảy khi dữ liệu đến, giúp điểm Core Web Vital CLS tốt hơn.",
              en: "<b>Prevents layout shift (CLS)</b> — When skeleton dimensions match real content, the page does not jump when data arrives, improving the CLS Core Web Vital score.",
            },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "Skeleton screens được Facebook phổ biến vào khoảng 2013 qua thiết kế News Feed. Ngày nay LinkedIn, YouTube, Airbnb, Twitter đều dùng skeleton loading làm chuẩn.",
          en: "Skeleton screens were popularized by Facebook around 2013 for their News Feed design. Today LinkedIn, YouTube, Airbnb, and Twitter all use skeleton loading as standard practice.",
        },
      ],
    },
    {
      id: "skeleton-vs-alternatives",
      title: { vi: "2. Skeleton vs Spinner vs Progress Bar vs Blur-up", en: "2. Skeleton vs Spinner vs Progress Bar vs Blur-up" },
      blocks: [
        {
          type: "prose",
          vi: "Không phải lúc nào skeleton cũng là lựa chọn tốt nhất. Dưới đây là so sánh các kỹ thuật loading phổ biến và khi nào nên dùng từng loại:",
          en: "Skeleton is not always the best choice. Here is a comparison of common loading techniques and when to use each:",
        },
        {
          type: "table",
          headers: {
            vi: ["Kỹ thuật", "Trông như thế nào", "Dùng khi", "Không nên dùng khi"],
            en: ["Technique", "Looks like", "Use when", "Avoid when"],
          },
          rows: [
            {
              vi: ["Skeleton Screen", "Khung xám/pulse có hình dạng nội dung", "Tải nội dung có cấu trúc rõ (thẻ, list, bài viết)", "Hành động ngắn &lt;300ms hoặc nội dung không có hình dạng cố định"],
              en: ["Skeleton Screen", "Grey/pulsing shapes matching content layout", "Loading structured content (cards, lists, articles)", "Actions &lt;300ms fast or content with no fixed shape"],
            },
            {
              vi: ["Spinner / Thunk", "Vòng tròn hoặc chấm xoay", "Hành động ngắn (submit form, mutation)", "Tải toàn bộ trang — gây cảm giác \"không biết bao giờ xong\""],
              en: ["Spinner / Thunk", "Rotating circle or dots", "Short actions (form submit, mutations)", "Full page loads — feels indefinite and uncertain"],
            },
            {
              vi: ["Progress Bar", "Thanh ngang tiến dần 0→100%", "Tải file, upload, quy trình có bước rõ ràng", "Tải API không có thông tin tiến độ thực"],
              en: ["Progress Bar", "Horizontal bar advancing 0→100%", "File loads, uploads, step-based processes", "API fetches without real progress info (fake progress = bad)"],
            },
            {
              vi: ["Blur-up / LQIP", "Ảnh mờ chất lượng thấp rồi rõ dần", "Tải ảnh lớn (giống Medium, Gatsby Image)", "Nội dung text hoặc dữ liệu không phải ảnh"],
              en: ["Blur-up / LQIP", "Low-quality blurry image sharpens in", "Loading large images (Medium, Gatsby Image style)", "Text content or non-image data"],
            },
            {
              vi: ["Optimistic UI", "Nội dung giả lập như đã hoàn thành ngay", "Hành động gần như chắc chắn thành công (like, add to cart)", "Thao tác có thể thất bại thường xuyên"],
              en: ["Optimistic UI", "Content shown as if already done", "Near-certain actions (like, add to cart)", "Operations that fail frequently"],
            },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Quy tắc ngón tay cái: &lt;100ms → không cần gì cả; 100–300ms → spinner nhỏ; &gt;300ms và nội dung có cấu trúc → skeleton. Đừng flash skeleton cho những request nhanh — dùng delay nhỏ (xem Section 6).",
          en: "Rule of thumb: &lt;100ms → nothing needed; 100–300ms → small spinner; &gt;300ms with structured content → skeleton. Don't flash skeleton for fast requests — use a small delay (see Section 6).",
        },
      ],
    },
    {
      id: "implementation",
      title: { vi: "3. Triển khai — CSS Shimmer & Khớp Layout", en: "3. Implementation — CSS Shimmer & Layout Matching" },
      blocks: [
        {
          type: "prose",
          vi: "Skeleton hiệu quả nhất khi nó <b>khớp kích thước và hình dạng</b> với nội dung thật. Hiệu ứng phổ biến nhất là <b>shimmer</b> (ánh sáng chạy ngang) hoặc <b>pulse</b> (nhấp nháy nhẹ). Cả hai đều làm bằng CSS thuần.",
          en: "Skeletons are most effective when they <b>match the size and shape</b> of the real content. The most common effects are <b>shimmer</b> (a light sweep across) or <b>pulse</b> (gentle fade in/out). Both are pure CSS.",
        },
        {
          type: "code",
          code: "/* ── Skeleton base ── */\n.skeleton {\n  background-color: #e0e0e0;\n  border-radius: 4px;\n  overflow: hidden;\n  position: relative;\n}\n\n/* ── Shimmer effect via pseudo-element ── */\n.skeleton::after {\n  content: '';\n  position: absolute;\n  inset: 0;\n  background: linear-gradient(\n    90deg,\n    transparent 0%,\n    rgba(255, 255, 255, 0.5) 50%,\n    transparent 100%\n  );\n  animation: shimmer 1.5s infinite;\n}\n\n@keyframes shimmer {\n  0%   { transform: translateX(-100%); }\n  100% { transform: translateX(100%); }\n}\n\n/* ── Pulse alternative ── */\n.skeleton-pulse {\n  animation: pulse 1.5s ease-in-out infinite;\n}\n@keyframes pulse {\n  0%, 100% { opacity: 1; }\n  50%       { opacity: 0.4; }\n}\n\n/* ── Reduced motion: disable animation ── */\n@media (prefers-reduced-motion: reduce) {\n  .skeleton::after,\n  .skeleton-pulse { animation: none; }\n}\n\n/* ── Example card skeleton ── */\n.card-skeleton {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  padding: 16px;\n}\n.card-skeleton .sk-avatar   { width: 48px;  height: 48px; border-radius: 50%; }\n.card-skeleton .sk-title    { width: 60%;   height: 16px; }\n.card-skeleton .sk-subtitle { width: 40%;   height: 12px; }\n.card-skeleton .sk-body     { width: 100%;  height: 80px; }",
          caption: {
            vi: "CSS shimmer thuần — pseudo-element chạy ngang tạo hiệu ứng ánh sáng. Kích thước skeleton phải khớp với nội dung thật để tránh CLS.",
            en: "Pure CSS shimmer — a pseudo-element sweeps across to create the light effect. Skeleton dimensions must match real content to avoid CLS.",
          },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Nếu skeleton và nội dung thật <b>khác kích thước</b>, trang sẽ bị layout shift khi dữ liệu đến — đây là điểm CLS xấu. Luôn đo hoặc cố định chiều cao/rộng của skeleton bằng cách khớp với thiết kế thật.",
          en: "If skeleton and real content <b>differ in size</b>, the page will shift when data arrives — that is a bad CLS score. Always measure or fix skeleton height/width to match the real design.",
        },
      ],
    },
    {
      id: "framework-patterns",
      title: { vi: "4. Patterns trong Framework — React, Vue & Libraries", en: "4. Framework Patterns — React, Vue & Libraries" },
      blocks: [
        {
          type: "prose",
          vi: "Trong các framework hiện đại, skeleton thường được triển khai như một component thay thế (fallback) khi đang chờ dữ liệu. React có hai cách phổ biến: <b>conditional render</b> và <b>Suspense fallback</b>.",
          en: "In modern frameworks, skeletons are typically implemented as fallback components while waiting for data. React has two common approaches: <b>conditional rendering</b> and <b>Suspense fallback</b>.",
        },
        {
          type: "code",
          code: "// ── Approach 1: Conditional render (simple, works everywhere) ──\nfunction ArticleCard({ articleId }) {\n  const { data, isLoading } = useFetchArticle(articleId);\n\n  if (isLoading) return <ArticleSkeleton />;\n\n  return (\n    &lt;div className=\"card\"&gt;\n      &lt;h2&gt;{data.title}&lt;/h2&gt;\n      &lt;p&gt;{data.body}&lt;/p&gt;\n    &lt;/div&gt;\n  );\n}\n\nfunction ArticleSkeleton() {\n  return (\n    &lt;div className=\"card\"&gt;\n      &lt;div className=\"skeleton sk-title\" /&gt;\n      &lt;div className=\"skeleton sk-body\" /&gt;\n    &lt;/div&gt;\n  );\n}\n\n// ── Approach 2: React Suspense (React 18+, works with use() or lazy()) ──\nfunction App() {\n  return (\n    &lt;Suspense fallback={&lt;ArticleSkeleton /&gt;}&gt;\n      &lt;ArticleCard articleId={42} /&gt;\n    &lt;/Suspense&gt;\n  );\n}\n\n// ── Vue 3: v-if / v-else ──\n// &lt;template&gt;\n//   &lt;ArticleSkeleton v-if=\"isLoading\" /&gt;\n//   &lt;ArticleCard v-else :article=\"data\" /&gt;\n// &lt;/template&gt;",
          caption: {
            vi: "Conditional render đơn giản nhất. React Suspense gọn hơn với async components/data fetching (React 18+). Vue dùng v-if/v-else theo cùng logic.",
            en: "Conditional render is simplest. React Suspense is cleaner with async components/data fetching (React 18+). Vue uses v-if/v-else with the same logic.",
          },
        },
        {
          type: "prose",
          vi: "Các <b>thư viện component skeleton</b> sẵn có giúp tạo nhanh mà không cần viết CSS từ đầu:",
          en: "Ready-made <b>skeleton component libraries</b> let you scaffold quickly without writing CSS from scratch:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>react-loading-skeleton</b> — thư viện nhẹ, linh hoạt. Dùng <code>&lt;Skeleton /&gt;</code> với prop <code>count</code>, <code>height</code>, <code>circle</code>. Tự khớp màu với theme.",
              en: "<b>react-loading-skeleton</b> — lightweight and flexible. Use <code>&lt;Skeleton /&gt;</code> with <code>count</code>, <code>height</code>, <code>circle</code> props. Auto-matches theme colors.",
            },
            {
              vi: "<b>MUI Skeleton</b> (Material UI) — component <code>&lt;Skeleton variant=\"text|circular|rectangular|rounded\" /&gt;</code>. Tích hợp sẵn trong hệ sinh thái MUI.",
              en: "<b>MUI Skeleton</b> (Material UI) — <code>&lt;Skeleton variant=\"text|circular|rectangular|rounded\" /&gt;</code> component. Built into the MUI ecosystem.",
            },
            {
              vi: "<b>shadcn/ui Skeleton</b> — component đơn giản (chỉ là div với <code>animate-pulse</code> của Tailwind). Dễ tùy chỉnh vì bạn sở hữu code.",
              en: "<b>shadcn/ui Skeleton</b> — a simple component (just a div with Tailwind's <code>animate-pulse</code>). Easy to customize because you own the code.",
            },
            {
              vi: "<b>Nuxt / Vue</b> — <code>v-skeleton-loader</code> từ Vuetify, hoặc tự build bằng CSS animation.",
              en: "<b>Nuxt / Vue</b> — <code>v-skeleton-loader</code> from Vuetify, or build your own with CSS animation.",
            },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Với Next.js App Router và React Server Components, bọc phần async trong <code>&lt;Suspense&gt;</code> và truyền skeleton vào <code>fallback</code> prop — đây là cách chính thức của Next.js 13+.",
          en: "With Next.js App Router and React Server Components, wrap the async part in <code>&lt;Suspense&gt;</code> and pass the skeleton as the <code>fallback</code> prop — this is the official Next.js 13+ approach.",
        },
      ],
    },
    {
      id: "accessibility",
      title: { vi: "5. Accessibility — Thông báo trạng thái Loading", en: "5. Accessibility — Announcing Loading State" },
      blocks: [
        {
          type: "prose",
          vi: "Skeleton screens là <b>vô hình với screen readers</b> nếu không thêm ngữ nghĩa đúng. Người dùng với công nghệ hỗ trợ cần được thông báo khi trang đang tải và khi nội dung đã sẵn sàng.",
          en: "Skeleton screens are <b>invisible to screen readers</b> without proper semantics. Users with assistive technology need to know when the page is loading and when content is ready.",
        },
        {
          type: "code",
          code: "// ── aria-busy: signal loading state on the container ──\nfunction ArticleCard({ isLoading, data }) {\n  return (\n    &lt;section\n      aria-busy={isLoading}\n      aria-label={isLoading ? \"Loading article\" : data.title}\n    &gt;\n      {isLoading ? &lt;ArticleSkeleton /&gt; : &lt;ArticleContent data={data} /&gt;}\n    &lt;/section&gt;\n  );\n}\n\n// ── aria-live: announce when content arrives ──\nfunction StatusAnnouncer({ isLoading }) {\n  return (\n    &lt;div\n      role=\"status\"\n      aria-live=\"polite\"\n      aria-atomic=\"true\"\n      className=\"sr-only\"     // visually hidden, readable by screen reader\n    &gt;\n      {isLoading ? \"Loading content, please wait.\" : \"Content loaded.\"}\n    &lt;/div&gt;\n  );\n}\n\n// ── prefers-reduced-motion: already handled in CSS, but also in JS ──\nconst prefersReduced = window.matchMedia(\n  '(prefers-reduced-motion: reduce)'\n).matches;\n// If true, skip animation or use instant swap instead of fade",
          caption: {
            vi: "<code>aria-busy</code> báo trạng thái đang tải trên container. <code>role=\"status\"</code> + <code>aria-live=\"polite\"</code> thông báo khi nội dung đến mà không làm gián đoạn người dùng.",
            en: "<code>aria-busy</code> signals loading state on the container. <code>role=\"status\"</code> + <code>aria-live=\"polite\"</code> announces when content arrives without interrupting the user.",
          },
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>aria-busy=\"true\"</b> trên container — báo cho screen reader biết khu vực đang cập nhật.",
              en: "<b>aria-busy=\"true\"</b> on the container — tells screen readers the region is updating.",
            },
            {
              vi: "<b>role=\"status\" + aria-live=\"polite\"</b> — thông báo khi loading xong mà không ngắt đọc nội dung hiện tại.",
              en: "<b>role=\"status\" + aria-live=\"polite\"</b> — announces when loading finishes without interrupting current reading.",
            },
            {
              vi: "<b>prefers-reduced-motion</b> — disable hoặc giảm animation shimmer/pulse cho người dùng bật chế độ giảm chuyển động (vestibular disorders).",
              en: "<b>prefers-reduced-motion</b> — disable or reduce shimmer/pulse animation for users who enable reduced motion (vestibular disorders).",
            },
            {
              vi: "Ẩn skeleton element khỏi accessibility tree bằng <b>aria-hidden=\"true\"</b> nếu bạn đã có live region riêng — tránh đọc to \"skeleton\" với screen reader.",
              en: "Hide skeleton elements from the accessibility tree with <b>aria-hidden=\"true\"</b> if you already have a separate live region — avoids screen readers announcing \"skeleton\".",
            },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Ba thuộc tính cần nhớ: <code>aria-busy</code> trên container, <code>role=\"status\"</code> trên vùng thông báo, và <code>@media (prefers-reduced-motion)</code> trong CSS. Cả ba cần nhau để trải nghiệm đầy đủ.",
          en: "Three attributes to remember: <code>aria-busy</code> on the container, <code>role=\"status\"</code> on the announcer, and <code>@media (prefers-reduced-motion)</code> in CSS. All three are needed for a complete accessible experience.",
        },
      ],
    },
    {
      id: "pitfalls-best-practices",
      title: { vi: "6. Bẫy & Best Practices", en: "6. Pitfalls & Best Practices" },
      blocks: [
        {
          type: "prose",
          vi: "Skeleton loading dùng sai cũng gây hại. Dưới đây là những lỗi thường gặp và cách tránh:",
          en: "Skeleton loading used incorrectly can do more harm than good. Here are common mistakes and how to avoid them:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Flash skeleton với request nhanh (&lt;300ms)</b> — Nếu data đến trước 300ms mà skeleton đã hiện, người dùng sẽ thấy chớp màn hình khó chịu. Giải pháp: dùng delay nhỏ (ví dụ 200ms) trước khi hiện skeleton, hoặc chỉ hiện nếu loading &gt; ngưỡng.",
              en: "<b>Flashing skeleton for fast requests (&lt;300ms)</b> — If data arrives before 300ms but skeleton already appeared, users see an annoying flash. Fix: use a small delay (e.g. 200ms) before showing skeleton, or only show it if loading exceeds a threshold.",
            },
            {
              vi: "<b>Skeleton không khớp kích thước nội dung</b> — Gây CLS (layout shift) khi nội dung thật thay thế skeleton và đẩy các phần tử khác. Khớp chính xác width/height.",
              en: "<b>Skeleton dimensions don't match real content</b> — Causes CLS (layout shift) when real content replaces skeleton and pushes other elements. Match width/height precisely.",
            },
            {
              vi: "<b>Quá nhiều skeleton cùng lúc</b> — Skeleton quá nhiều hay quá phức tạp gây rối mắt. Chỉ skeleton các phần quan trọng, không phải mọi element nhỏ.",
              en: "<b>Too many skeletons at once</b> — Too many or overly complex skeletons are visually noisy. Only skeleton the key content areas, not every tiny element.",
            },
            {
              vi: "<b>Skeleton không có animation</b> — Skeleton tĩnh (không pulse, không shimmer) trông như lỗi hoặc placeholder bị quên. Luôn thêm ít nhất pulse để báo hiệu \"đang tải\".",
              en: "<b>Static skeleton without animation</b> — A non-animated skeleton looks like a bug or forgotten placeholder. Always add at least a pulse to signal \"loading in progress\".",
            },
            {
              vi: "<b>Quên xử lý trạng thái lỗi</b> — Nếu request thất bại, đừng để skeleton hiện mãi. Chuyển sang trạng thái error với thông báo rõ ràng.",
              en: "<b>Forgetting error state</b> — If the request fails, don't let the skeleton spin forever. Transition to an error state with a clear message.",
            },
          ],
        },
        {
          type: "table",
          headers: {
            vi: ["Thực hành", "Nên làm ✓", "Không nên ✗"],
            en: ["Practice", "Do ✓", "Don't ✗"],
          },
          rows: [
            {
              vi: ["Thời điểm hiện skeleton", "Chờ 200–300ms trước khi show", "Hiện ngay lập tức luôn"],
              en: ["When to show skeleton", "Wait 200–300ms before showing", "Always show immediately"],
            },
            {
              vi: ["Kích thước", "Khớp chính xác với nội dung thật", "Dùng kích thước tùy ý"],
              en: ["Dimensions", "Match real content exactly", "Use arbitrary sizes"],
            },
            {
              vi: ["Animation", "Dùng shimmer hoặc pulse", "Skeleton tĩnh không có hiệu ứng"],
              en: ["Animation", "Use shimmer or pulse", "Static skeleton with no animation"],
            },
            {
              vi: ["Error handling", "Chuyển sang error UI khi thất bại", "Để skeleton hiện mãi"],
              en: ["Error handling", "Transition to error UI on failure", "Let skeleton spin forever"],
            },
            {
              vi: ["Accessibility", "Thêm aria-busy, role=status", "Bỏ qua screen reader"],
              en: ["Accessibility", "Add aria-busy, role=status", "Ignore screen reader users"],
            },
          ],
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Skeleton loading không phải là phép màu — nó chỉ che giấu thời gian chờ bằng kỳ vọng. Kết hợp với cache, prefetch, và tối ưu API để giảm thời gian chờ thật sự. Skeleton là lớp sơn cuối, không phải nền tảng.",
          en: "Skeleton loading is not magic — it hides wait time by setting expectations. Pair it with caching, prefetching, and API optimization to reduce actual wait time. Skeleton is the final coat of paint, not the foundation.",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: {
        vi: "Skeleton loading là gì và mục đích chính của nó?",
        en: "What is skeleton loading and its main purpose?",
      },
      back: {
        vi: "Hiển thị khung placeholder có hình dạng giống nội dung thật trong khi data đang tải. Mục đích: cải thiện perceived performance, giảm bounce rate, và tránh layout shift (CLS).",
        en: "Displaying placeholder shapes matching real content structure while data loads. Purpose: improve perceived performance, reduce bounce rate, and prevent layout shift (CLS).",
      },
    },
    {
      front: {
        vi: "Khi nào NÊN dùng skeleton thay vì spinner?",
        en: "When should you use a skeleton instead of a spinner?",
      },
      back: {
        vi: "Khi loading &gt;300ms VÀ nội dung có cấu trúc rõ (thẻ, list, bài viết). Spinner tốt hơn cho các hành động ngắn như submit form hoặc mutation.",
        en: "When loading &gt;300ms AND content has a clear structure (cards, lists, articles). Spinners are better for short actions like form submit or mutations.",
      },
    },
    {
      front: {
        vi: "Hiệu ứng shimmer hoạt động như thế nào về mặt CSS?",
        en: "How does the shimmer effect work in CSS?",
      },
      back: {
        vi: "Một pseudo-element (::after) với gradient trắng được animate translateX từ -100% đến 100% trên nền xám, tạo cảm giác ánh sáng quét qua. Container cần overflow:hidden.",
        en: "A pseudo-element (::after) with a white gradient is animated translateX from -100% to 100% over a grey background, creating a light sweep effect. Container needs overflow:hidden.",
      },
    },
    {
      front: {
        vi: "Tại sao skeleton cần khớp kích thước với nội dung thật?",
        en: "Why must skeleton dimensions match the real content?",
      },
      back: {
        vi: "Nếu không khớp, khi nội dung thật thay thế skeleton sẽ gây layout shift — đây là chỉ số CLS (Cumulative Layout Shift) xấu trong Core Web Vitals và gây trải nghiệm tệ.",
        en: "If they don't match, replacing the skeleton with real content causes layout shift — a bad CLS (Cumulative Layout Shift) score in Core Web Vitals and a jarring user experience.",
      },
    },
    {
      front: {
        vi: "Trong React, hai cách chính để implement skeleton loading là gì?",
        en: "In React, what are the two main ways to implement skeleton loading?",
      },
      back: {
        vi: "1. Conditional render: <code>if (isLoading) return &lt;Skeleton/&gt;</code>. 2. React Suspense: bọc component async trong <code>&lt;Suspense fallback={&lt;Skeleton/&gt;}&gt;</code> (React 18+).",
        en: "1. Conditional render: <code>if (isLoading) return &lt;Skeleton/&gt;</code>. 2. React Suspense: wrap the async component in <code>&lt;Suspense fallback={&lt;Skeleton/&gt;}&gt;</code> (React 18+).",
      },
    },
    {
      front: {
        vi: "Ba thuộc tính accessibility cần thiết khi dùng skeleton loading?",
        en: "What are three accessibility attributes needed with skeleton loading?",
      },
      back: {
        vi: "1. <code>aria-busy=\"true\"</code> trên container khi đang tải. 2. <code>role=\"status\" aria-live=\"polite\"</code> để thông báo khi done. 3. <code>@media (prefers-reduced-motion)</code> để tắt animation shimmer.",
        en: "1. <code>aria-busy=\"true\"</code> on the container while loading. 2. <code>role=\"status\" aria-live=\"polite\"</code> to announce completion. 3. <code>@media (prefers-reduced-motion)</code> to disable shimmer animation.",
      },
    },
    {
      front: {
        vi: "Tại sao không nên hiện skeleton ngay lập tức cho mọi request?",
        en: "Why should you not show the skeleton immediately for every request?",
      },
      back: {
        vi: "Nếu request hoàn thành trong &lt;200–300ms, skeleton hiện rồi biến mất ngay gây flash khó chịu — trải nghiệm còn tệ hơn không có skeleton. Dùng delay nhỏ hoặc chỉ show khi loading vượt ngưỡng.",
        en: "If the request completes in &lt;200–300ms, showing then immediately hiding the skeleton causes an annoying flash — worse than no skeleton at all. Use a small delay or only show when loading exceeds a threshold.",
      },
    },
    {
      front: {
        vi: "blur-up (LQIP) là gì và khi nào dùng nó thay vì skeleton?",
        en: "What is blur-up (LQIP) and when should you use it instead of skeleton?",
      },
      back: {
        vi: "Low-Quality Image Placeholder — tải trước ảnh chất lượng thấp, mờ, rồi chuyển dần sang ảnh chất lượng cao khi tải xong. Dùng khi loading ảnh lớn (không phải text/data). Phổ biến trên Medium và Gatsby.",
        en: "Low-Quality Image Placeholder — loads a tiny blurry version first, then transitions to the full-quality image. Use when loading large images (not text/data). Popular on Medium and with Gatsby Image.",
      },
    },
  ],
  quiz: [
    {
      q: {
        vi: "Facebook phổ biến skeleton screens vào khoảng năm nào?",
        en: "Around what year did Facebook popularize skeleton screens?",
      },
      options: [
        { vi: "2008", en: "2008" },
        { vi: "2013", en: "2013" },
        { vi: "2017", en: "2017" },
        { vi: "2020", en: "2020" },
      ],
      answer: 1,
      explain: {
        vi: "Facebook phổ biến skeleton screens khoảng 2013 cho News Feed. Sau đó LinkedIn, YouTube, Airbnb đều áp dụng kỹ thuật này.",
        en: "Facebook popularized skeleton screens around 2013 for the News Feed. LinkedIn, YouTube, and Airbnb all followed this approach.",
      },
    },
    {
      q: {
        vi: "Kỹ thuật nào phù hợp nhất khi cần loading một ảnh lớn dần dần rõ nét hơn?",
        en: "Which technique is best suited for progressively sharpening a large image as it loads?",
      },
      options: [
        { vi: "Skeleton screen", en: "Skeleton screen" },
        { vi: "Spinner", en: "Spinner" },
        { vi: "Blur-up / LQIP", en: "Blur-up / LQIP" },
        { vi: "Progress bar", en: "Progress bar" },
      ],
      answer: 2,
      explain: {
        vi: "Blur-up (LQIP — Low-Quality Image Placeholder) tải ảnh mờ chất lượng thấp rồi chuyển dần sang ảnh cao cấp. Skeleton dùng cho nội dung có cấu trúc, không phải ảnh.",
        en: "Blur-up (LQIP) loads a low-quality blurry image then transitions to the full-quality version. Skeleton is for structured content, not images.",
      },
    },
    {
      q: {
        vi: "Để tạo hiệu ứng shimmer trong CSS, cần thuộc tính nào trên container skeleton?",
        en: "To create a CSS shimmer effect, what property is required on the skeleton container?",
      },
      options: [
        { vi: "position: fixed", en: "position: fixed" },
        { vi: "overflow: hidden", en: "overflow: hidden" },
        { vi: "display: flex", en: "display: flex" },
        { vi: "clip-path: inset(0)", en: "clip-path: inset(0)" },
      ],
      answer: 1,
      explain: {
        vi: "<code>overflow: hidden</code> cần thiết để giới hạn pseudo-element shimmer (::after) không chạy ra ngoài container khi animate translateX.",
        en: "<code>overflow: hidden</code> is required to clip the shimmer pseudo-element (::after) so it doesn't extend outside the container during the translateX animation.",
      },
    },
    {
      q: {
        vi: "Skeleton loading ảnh hưởng đến chỉ số Core Web Vital nào nếu kích thước không khớp với nội dung thật?",
        en: "Which Core Web Vital is impacted if skeleton dimensions don't match real content?",
      },
      options: [
        { vi: "LCP (Largest Contentful Paint)", en: "LCP (Largest Contentful Paint)" },
        { vi: "FID (First Input Delay)", en: "FID (First Input Delay)" },
        { vi: "CLS (Cumulative Layout Shift)", en: "CLS (Cumulative Layout Shift)" },
        { vi: "TTFB (Time To First Byte)", en: "TTFB (Time To First Byte)" },
      ],
      answer: 2,
      explain: {
        vi: "Khi skeleton và nội dung thật có kích thước khác nhau, nội dung thật sẽ đẩy layout khi thay thế skeleton — đây chính xác là điều CLS đo: sự dịch chuyển bố cục không mong muốn.",
        en: "When skeleton and real content differ in size, the real content shifts the layout when it replaces the skeleton — exactly what CLS measures: unexpected layout shifts.",
      },
    },
    {
      q: {
        vi: "Trong React 18+, cách khuyến nghị để tích hợp skeleton với Next.js App Router là gì?",
        en: "In React 18+, what is the recommended way to integrate skeletons with Next.js App Router?",
      },
      options: [
        { vi: "Dùng useEffect và useState để quản lý loading state", en: "Use useEffect and useState to manage loading state" },
        { vi: "Bọc async component trong &lt;Suspense fallback={&lt;Skeleton /&gt;}&gt;", en: "Wrap async component in &lt;Suspense fallback={&lt;Skeleton /&gt;}&gt;" },
        { vi: "Thêm loading={true} prop trực tiếp vào component", en: "Add loading={true} prop directly to the component" },
        { vi: "Dùng React.lazy() cho mọi component", en: "Use React.lazy() for every component" },
      ],
      answer: 1,
      explain: {
        vi: "Next.js 13+ App Router với React Server Components khuyến nghị dùng <code>&lt;Suspense&gt;</code> với <code>fallback</code> prop. File <code>loading.js</code> trong App Router cũng tự động tạo Suspense boundary.",
        en: "Next.js 13+ App Router with React Server Components recommends using <code>&lt;Suspense&gt;</code> with the <code>fallback</code> prop. The <code>loading.js</code> file in App Router also automatically creates a Suspense boundary.",
      },
    },
    {
      q: {
        vi: "Thuộc tính nào thông báo cho screen reader biết một vùng đang cập nhật/tải?",
        en: "Which attribute tells a screen reader that a region is currently updating/loading?",
      },
      options: [
        { vi: "aria-loading=\"true\"", en: "aria-loading=\"true\"" },
        { vi: "aria-busy=\"true\"", en: "aria-busy=\"true\"" },
        { vi: "aria-live=\"assertive\"", en: "aria-live=\"assertive\"" },
        { vi: "role=\"progressbar\"", en: "role=\"progressbar\"" },
      ],
      answer: 1,
      explain: {
        vi: "<code>aria-busy=\"true\"</code> là thuộc tính ARIA chính thức báo cho screen reader biết container đang được cập nhật. Kết hợp với <code>role=\"status\" aria-live=\"polite\"</code> để thông báo khi loading xong.",
        en: "<code>aria-busy=\"true\"</code> is the official ARIA attribute that tells screen readers the container is being updated. Combine with <code>role=\"status\" aria-live=\"polite\"</code> to announce when loading completes.",
      },
    },
    {
      q: {
        vi: "Điều gì xảy ra khi hiện skeleton cho request hoàn thành trong &lt;200ms?",
        en: "What happens when you show a skeleton for a request that completes in &lt;200ms?",
      },
      options: [
        { vi: "Không có vấn đề gì — skeleton sẽ tắt nhanh", en: "No problem — the skeleton just disappears quickly" },
        { vi: "Gây flash (chớp màn hình) khó chịu, trải nghiệm còn tệ hơn không có skeleton", en: "Causes an annoying flash, making the experience worse than no skeleton at all" },
        { vi: "CLS score xấu đi đáng kể", en: "CLS score deteriorates significantly" },
        { vi: "Screen reader sẽ đọc to \"loading\" liên tục", en: "Screen reader will continuously announce \"loading\"" },
      ],
      answer: 1,
      explain: {
        vi: "Skeleton hiện rồi biến ngay trong &lt;200ms tạo ra flash khó chịu — người dùng cảm nhận là lỗi. Giải pháp: delay hiển thị skeleton 200–300ms, hoặc dùng logic chỉ show nếu loading kéo dài hơn ngưỡng.",
        en: "A skeleton appearing and vanishing within &lt;200ms creates an annoying flash — users perceive it as a glitch. Fix: delay showing the skeleton by 200–300ms, or use logic to only show it when loading exceeds a threshold.",
      },
    },
    {
      q: {
        vi: "Thư viện nào là skeleton component mà bạn \"sở hữu code\" vì nó là copy-paste vào project của bạn?",
        en: "Which skeleton library gives you code you 'own' because it is copy-pasted into your project?",
      },
      options: [
        { vi: "react-loading-skeleton", en: "react-loading-skeleton" },
        { vi: "MUI Skeleton", en: "MUI Skeleton" },
        { vi: "shadcn/ui Skeleton", en: "shadcn/ui Skeleton" },
        { vi: "Vuetify v-skeleton-loader", en: "Vuetify v-skeleton-loader" },
      ],
      answer: 2,
      explain: {
        vi: "shadcn/ui không phải là thư viện dependency truyền thống — bạn copy code component vào project. Điều này có nghĩa bạn kiểm soát hoàn toàn code và có thể tùy chỉnh tự do.",
        en: "shadcn/ui is not a traditional library dependency — you copy the component code into your project. This means you fully control the code and can freely customize it.",
      },
    },
  ],
});
