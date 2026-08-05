/* E-commerce Platforms — WooCommerce, Shopify, Magento */
PREP.register({
  id: "ecommerce",
  icon: "🛒",
  category: "backend",
  title: {
    vi: "Nền tảng TMĐT (WooCommerce, Shopify, Magento)",
    en: "E-commerce Platforms (WooCommerce, Shopify, Magento)",
  },
  blurb: {
    vi: "Ba nền tảng thương mại điện tử phổ biến nhất: WooCommerce (WordPress plugin miễn phí), Shopify (SaaS dễ dùng), và Magento/Adobe Commerce (mạnh mẽ cho doanh nghiệp lớn). Hiểu khi nào chọn cái nào là kỹ năng thực chiến.",
    en: "The three most popular e-commerce platforms: WooCommerce (free WordPress plugin), Shopify (easy-to-use SaaS), and Magento/Adobe Commerce (powerful for large enterprises). Knowing when to pick each is a practical skill.",
  },
  sections: [
    {
      id: "overview",
      title: { vi: "1. Tổng quan — Nền tảng TMĐT là gì?", en: "1. Overview — What is an e-commerce platform?" },
      blocks: [
        {
          type: "prose",
          vi: "Một <b>nền tảng thương mại điện tử (e-commerce platform)</b> là phần mềm cho phép tạo và quản lý cửa hàng trực tuyến: danh mục sản phẩm, giỏ hàng, thanh toán, vận chuyển, quản lý đơn hàng và tồn kho. Có hai mô hình chính:",
          en: "An <b>e-commerce platform</b> is software that lets you create and manage an online store: product catalog, shopping cart, checkout, payments, shipping, order and inventory management. There are two main models:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Hosted / SaaS</b> — nhà cung cấp lo toàn bộ server, bảo mật, cập nhật. Bạn chỉ trả phí thuê bao và tập trung bán hàng. Ví dụ: <b>Shopify</b>, BigCommerce.",
              en: "<b>Hosted / SaaS</b> — the provider manages all servers, security, and updates. You pay a subscription and focus on selling. Example: <b>Shopify</b>, BigCommerce.",
            },
            {
              vi: "<b>Self-hosted / Open-source</b> — bạn tự cài đặt, quản lý server, chịu trách nhiệm bảo mật và cập nhật. Chi phí bản quyền thấp (hoặc miễn phí) nhưng đòi hỏi kỹ thuật. Ví dụ: <b>WooCommerce</b>, <b>Magento Open Source</b>.",
              en: "<b>Self-hosted / Open-source</b> — you install, manage the server, and handle security and updates yourself. Low (or zero) license cost but requires technical skill. Examples: <b>WooCommerce</b>, <b>Magento Open Source</b>.",
            },
          ],
        },
        {
          type: "table",
          headers: {
            vi: ["Nền tảng", "Loại", "Công nghệ", "Chi phí", "Phù hợp nhất"],
            en: ["Platform", "Type", "Tech stack", "Cost model", "Best for"],
          },
          rows: [
            {
              vi: ["WooCommerce", "Self-hosted (open-source)", "PHP / MySQL / WordPress", "Miễn phí plugin; tự trả tiền hosting", "Cửa hàng nhỏ-vừa đã dùng WordPress"],
              en: ["WooCommerce", "Self-hosted (open-source)", "PHP / MySQL / WordPress", "Free plugin; pay for hosting yourself", "Small–medium stores already on WordPress"],
            },
            {
              vi: ["Shopify", "Hosted SaaS", "Liquid (templates); Ruby backend", "Thuê bao hàng tháng + phí giao dịch", "Ra mắt nhanh, đội ngũ không chuyên kỹ thuật"],
              en: ["Shopify", "Hosted SaaS", "Liquid (templates); Ruby backend", "Monthly subscription + transaction fees", "Fast launch, non-technical teams"],
            },
            {
              vi: ["Magento / Adobe Commerce", "Self-hosted (open-source) hoặc Cloud", "PHP / MySQL / Elasticsearch", "Miễn phí (Open Source) hoặc giá doanh nghiệp (Adobe Commerce)", "Doanh nghiệp lớn, catalog phức tạp, B2B"],
              en: ["Magento / Adobe Commerce", "Self-hosted (open-source) or Cloud", "PHP / MySQL / Elasticsearch", "Free (Open Source) or enterprise pricing (Adobe Commerce)", "Large enterprises, complex catalogs, B2B"],
            },
          ],
        },
      ],
    },
    {
      id: "woocommerce",
      title: { vi: "2. WooCommerce", en: "2. WooCommerce" },
      blocks: [
        {
          type: "prose",
          vi: "<b>WooCommerce</b> là một plugin WordPress miễn phí, mã nguồn mở, viết bằng PHP và sử dụng MySQL. Nó biến bất kỳ website WordPress nào thành cửa hàng trực tuyến. Bạn hoàn toàn tự quản lý hosting, bảo mật và cập nhật — đây là điểm mạnh (kiểm soát hoàn toàn) lẫn điểm yếu (gánh nặng vận hành).",
          en: "<b>WooCommerce</b> is a free, open-source WordPress plugin written in PHP, using MySQL. It turns any WordPress site into an online store. You fully manage hosting, security, and updates — this is both its strength (full control) and its weakness (operational burden).",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Ưu điểm:</b> miễn phí bản quyền; hệ sinh thái plugin/theme khổng lồ (hơn 59,000 WordPress plugin); tùy biến không giới hạn bằng code PHP; quyền truy cập toàn bộ database.", en: "<b>Pros:</b> free license; massive plugin/theme ecosystem (59,000+ WordPress plugins); unlimited PHP code customization; full database access." },
            { vi: "<b>Nhược điểm:</b> bạn tự lo hosting, SSL, backup, cập nhật WordPress+WooCommerce+plugin; hiệu năng phụ thuộc vào server bạn chọn; bảo mật là trách nhiệm của bạn.", en: "<b>Cons:</b> you handle hosting, SSL, backups, WordPress+WooCommerce+plugin updates; performance depends on your server; security is your responsibility." },
            { vi: "<b>Phù hợp nhất:</b> cửa hàng nhỏ đến vừa đã có website WordPress; dự án có đội dev PHP; cần tùy biến sâu mà không muốn trả phí bản quyền cao.", en: "<b>Best for:</b> small-to-medium stores already on WordPress; projects with a PHP dev team; deep customization without high licensing costs." },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "WooCommerce miễn phí nhưng <b>tổng chi phí thực tế (TCO)</b> bao gồm: hosting (VPS, managed WordPress), domain, SSL, plugin trả phí (payment gateway, shipping, SEO), và nhân lực kỹ thuật duy trì.",
          en: "WooCommerce is free, but the <b>total cost of ownership (TCO)</b> includes: hosting (VPS or managed WordPress), domain, SSL, paid plugins (payment gateway, shipping, SEO), and technical staff to maintain it.",
        },
      ],
    },
    {
      id: "shopify",
      title: { vi: "3. Shopify", en: "3. Shopify" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Shopify</b> là nền tảng SaaS (Software-as-a-Service) được host hoàn toàn bởi Shopify. Bạn không quản lý server, không lo bảo mật hạ tầng — Shopify xử lý tất cả. Giao diện cửa hàng dùng ngôn ngữ template riêng gọi là <b>Liquid</b>.",
          en: "<b>Shopify</b> is a fully hosted SaaS platform. You do not manage servers or infrastructure security — Shopify handles everything. Store themes use a proprietary template language called <b>Liquid</b>.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Ưu điểm:</b> ra mắt cực nhanh (vài giờ); không cần lo server; App Store lớn; tích hợp thanh toán sẵn (Shopify Payments); hỗ trợ 24/7; uptime cao.", en: "<b>Pros:</b> very fast to launch (hours); no server management; large App Store; built-in payment processing (Shopify Payments); 24/7 support; high uptime." },
            { vi: "<b>Nhược điểm:</b> phí thuê bao hàng tháng (~$29–$299+); phí giao dịch nếu không dùng Shopify Payments; ít kiểm soát cấp thấp hơn self-hosted; khó tùy biến logic backend phức tạp.", en: "<b>Cons:</b> monthly subscription (~$29–$299+); transaction fees if not using Shopify Payments; less low-level control than self-hosted; difficult to customize complex backend logic." },
            { vi: "<b>Shopify Plus</b> — tier doanh nghiệp với script tùy chỉnh checkout, API nâng cao, và giá thương lượng; phù hợp cho doanh thu triệu đô.", en: "<b>Shopify Plus</b> — enterprise tier with custom checkout scripts, advanced APIs, and negotiated pricing; suited for million-dollar revenue stores." },
            { vi: "<b>Phù hợp nhất:</b> startup, SMB muốn ra mắt nhanh; đội ngũ không chuyên kỹ thuật; dropshipping; brand cần trải nghiệm mua sắm đẹp mà không tốn resource dev.", en: "<b>Best for:</b> startups and SMBs wanting fast launch; non-technical teams; dropshipping; brands needing polished shopping UX without heavy dev resources." },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>Liquid</b> là ngôn ngữ template của Shopify (tương tự Jinja2/Twig). Ví dụ: <code>{% for product in collections.frontpage.products %}{{ product.title }}{% endfor %}</code>. Shopify cũng hỗ trợ <b>Storefront API</b> (GraphQL) để xây headless storefront.",
          en: "<b>Liquid</b> is Shopify's template language (similar to Jinja2/Twig). Example: <code>{% for product in collections.frontpage.products %}{{ product.title }}{% endfor %}</code>. Shopify also exposes the <b>Storefront API</b> (GraphQL) for building headless storefronts.",
        },
      ],
    },
    {
      id: "magento",
      title: { vi: "4. Magento / Adobe Commerce", en: "4. Magento / Adobe Commerce" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Magento</b> là nền tảng TMĐT PHP mã nguồn mở, rất mạnh mẽ và có khả năng mở rộng cao. Có hai phiên bản: <b>Magento Open Source</b> (miễn phí, tự host) và <b>Adobe Commerce</b> (trả phí, thêm tính năng B2B, cloud managed, AI). Adobe mua lại Magento năm 2018.",
          en: "<b>Magento</b> is a powerful, highly scalable open-source PHP e-commerce platform. Two editions: <b>Magento Open Source</b> (free, self-hosted) and <b>Adobe Commerce</b> (paid, adds B2B features, cloud-managed, AI). Adobe acquired Magento in 2018.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Ưu điểm:</b> cực kỳ linh hoạt và mạnh mẽ; hỗ trợ catalog hàng triệu sản phẩm; tính năng B2B phong phú (giá theo nhóm khách, báo giá, mua theo hợp đồng); đa cửa hàng, đa tiền tệ, đa ngôn ngữ tích hợp sẵn.", en: "<b>Pros:</b> extremely flexible and powerful; supports millions of products; rich B2B features (customer group pricing, quotes, contract purchasing); multi-store, multi-currency, multi-language built-in." },
            { vi: "<b>Nhược điểm:</b> <b>rất phức tạp</b> — cần dev có kinh nghiệm Magento; tốn tài nguyên server (cần server mạnh, Elasticsearch); chi phí xây dựng và vận hành cao; thời gian ra mắt lâu.", en: "<b>Cons:</b> <b>very complex</b> — requires experienced Magento developers; resource-heavy server requirements (strong server, Elasticsearch); high build and operational cost; long time-to-launch." },
            { vi: "<b>Adobe Commerce (Magento Enterprise)</b> — thêm Page Builder, B2B module, live search AI, cloud hosting managed bởi Adobe, và hỗ trợ doanh nghiệp; giá từ hàng chục nghìn USD/năm.", en: "<b>Adobe Commerce (Magento Enterprise)</b> — adds Page Builder, B2B module, AI live search, cloud hosting managed by Adobe, and enterprise support; pricing starts at tens of thousands USD/year." },
            { vi: "<b>Phù hợp nhất:</b> doanh nghiệp lớn, B2B, catalog phức tạp (nhiều variant, nhiều thuộc tính), cần tùy chỉnh sâu và có đội dev Magento chuyên nghiệp.", en: "<b>Best for:</b> large enterprises, B2B, complex catalogs (many variants/attributes), deep customization, and a dedicated Magento development team." },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Đừng chọn Magento vì nó \"nghe có vẻ mạnh\". Chi phí thực tế (dev Magento chuyên biệt + server mạnh + thời gian phát triển dài) rất cao. Nếu chưa phải doanh nghiệp lớn, WooCommerce hoặc Shopify thường là lựa chọn tốt hơn.",
          en: "Don't pick Magento just because it 'sounds powerful.' Real costs (specialized Magento devs + heavy servers + long development time) are substantial. Unless you're a large enterprise, WooCommerce or Shopify are usually better choices.",
        },
      ],
    },
    {
      id: "comparison",
      title: { vi: "5. So sánh nhanh ba nền tảng", en: "5. Side-by-side comparison" },
      blocks: [
        {
          type: "table",
          headers: {
            vi: ["Tiêu chí", "WooCommerce", "Shopify", "Magento Open Source"],
            en: ["Feature", "WooCommerce", "Shopify", "Magento Open Source"],
          },
          rows: [
            {
              vi: ["Hosting", "Tự lo (bất kỳ PHP host)", "Shopify lo hoàn toàn", "Tự lo (server mạnh, Elasticsearch)"],
              en: ["Hosting", "Self-managed (any PHP host)", "Fully managed by Shopify", "Self-managed (strong server, Elasticsearch)"],
            },
            {
              vi: ["Chi phí bản quyền", "Miễn phí", "$29–$299+/tháng", "Miễn phí"],
              en: ["License cost", "Free", "$29–$299+/month", "Free"],
            },
            {
              vi: ["Dễ dùng", "Trung bình (cần biết WordPress)", "Dễ nhất", "Khó — cần dev chuyên biệt"],
              en: ["Ease of use", "Moderate (requires WordPress knowledge)", "Easiest", "Hard — requires specialist devs"],
            },
            {
              vi: ["Tùy biến / Kiểm soát", "Cao (mã nguồn mở PHP)", "Trung bình (bị giới hạn bởi Shopify)", "Rất cao (mã nguồn mở PHP đầy đủ)"],
              en: ["Customization / Control", "High (open-source PHP)", "Moderate (constrained by Shopify)", "Very high (full open-source PHP)"],
            },
            {
              vi: ["Khả năng mở rộng", "Trung bình (phụ thuộc hosting)", "Tốt (Shopify lo scaling)", "Rất tốt (thiết kế cho hàng triệu SKU)"],
              en: ["Scalability", "Moderate (depends on your hosting)", "Good (Shopify handles scaling)", "Excellent (designed for millions of SKUs)"],
            },
            {
              vi: ["Kỹ năng kỹ thuật cần", "PHP/WordPress cơ bản", "Không cần nhiều; Liquid cho theme", "PHP/Magento nâng cao, DevOps"],
              en: ["Tech skill required", "Basic PHP/WordPress", "Minimal; Liquid for theming", "Advanced PHP/Magento, DevOps"],
            },
            {
              vi: ["Trường hợp dùng điển hình", "Blog/site WordPress thêm shop", "Startup, D2C brand, dropshipping", "B2B, catalog lớn, doanh nghiệp"],
              en: ["Typical use case", "WordPress blog/site adding a shop", "Startup, D2C brand, dropshipping", "B2B, large catalogs, enterprise"],
            },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Không có nền tảng \"tốt nhất\" tuyệt đối — chỉ có nền tảng <b>phù hợp nhất</b> với ngân sách, kỹ năng đội ngũ, quy mô và mục tiêu của bạn.",
          en: "There is no single 'best' platform — only the one that best fits your budget, team skills, scale, and goals.",
        },
      ],
    },
    {
      id: "core-concepts",
      title: { vi: "6. Khái niệm TMĐT cốt lõi (độc lập nền tảng)", en: "6. Core e-commerce concepts (platform-agnostic)" },
      blocks: [
        {
          type: "prose",
          vi: "Dù dùng nền tảng nào, bạn cũng cần hiểu các khái niệm sau:",
          en: "Regardless of platform, you need to understand these concepts:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Product &amp; Variants / SKU</b> — một sản phẩm (ví dụ: áo thun) có thể có nhiều variant (màu + size). Mỗi variant có <b>SKU</b> (Stock Keeping Unit) riêng để theo dõi tồn kho.", en: "<b>Product &amp; Variants / SKU</b> — one product (e.g. a T-shirt) may have many variants (color + size). Each variant has a unique <b>SKU</b> (Stock Keeping Unit) for inventory tracking." },
            { vi: "<b>Cart &amp; Checkout</b> — giỏ hàng lưu tạm sản phẩm; checkout là luồng nhập địa chỉ → chọn vận chuyển → thanh toán → xác nhận đơn hàng.", en: "<b>Cart &amp; Checkout</b> — cart temporarily stores items; checkout is the flow: enter address → choose shipping → pay → order confirmation." },
            { vi: "<b>Payment Gateway</b> — dịch vụ xử lý thanh toán (Stripe, PayPal, VNPay, Momo). Gateway mã hóa thông tin thẻ và giao tiếp với ngân hàng.", en: "<b>Payment Gateway</b> — service that processes payments (Stripe, PayPal, VNPay, Momo). The gateway encrypts card data and communicates with banks." },
            { vi: "<b>Shipping &amp; Tax</b> — tính phí vận chuyển theo vùng/trọng lượng; tính thuế (VAT/GST) tự động theo địa chỉ người mua. Cả ba nền tảng đều có module này.", en: "<b>Shipping &amp; Tax</b> — calculate shipping rates by zone/weight; auto-calculate tax (VAT/GST) by buyer location. All three platforms have modules for this." },
            { vi: "<b>Orders &amp; Inventory</b> — đơn hàng có vòng đời: pending → processing → shipped → delivered → (refunded). Inventory tracking tự giảm tồn kho khi bán.", en: "<b>Orders &amp; Inventory</b> — orders have a lifecycle: pending → processing → shipped → delivered → (refunded). Inventory tracking auto-decrements stock on purchase." },
            { vi: "<b>Themes vs Apps/Plugins</b> — <b>theme</b> kiểm soát giao diện; <b>app/plugin</b> thêm tính năng (đánh giá sản phẩm, loyalty points, upsell, live chat). Phân biệt này có ở cả ba nền tảng.", en: "<b>Themes vs Apps/Plugins</b> — a <b>theme</b> controls UI/design; <b>apps/plugins</b> add features (product reviews, loyalty points, upsell, live chat). This distinction exists across all three platforms." },
            { vi: "<b>Webhooks</b> — HTTP callback khi sự kiện xảy ra (ví dụ: <code>order.created</code>, <code>product.updated</code>, <code>refund.created</code>). Dùng để tích hợp ERP, gửi email, cập nhật kho bên ngoài theo thời gian thực.", en: "<b>Webhooks</b> — HTTP callbacks fired on events (e.g. <code>order.created</code>, <code>product.updated</code>, <code>refund.created</code>). Used to integrate ERPs, send emails, and sync external warehouses in real time." },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>Headless commerce</b> tách <b>frontend</b> (UI/storefront) khỏi <b>backend</b> (catalog, cart, checkout) — giao tiếp qua API. Shopify cung cấp <b>Storefront API</b> (GraphQL) và framework <b>Hydrogen</b> (React). WooCommerce và Magento có REST &amp; GraphQL API riêng. Headless cho phép dùng Next.js/Nuxt làm frontend trong khi vẫn tận dụng backend thương mại điện tử trưởng thành. Đánh đổi: linh hoạt hơn nhưng phức tạp hơn và mất một số tính năng out-of-the-box.",
          en: "<b>Headless commerce</b> decouples the <b>frontend</b> (storefront UI) from the <b>backend</b> (catalog, cart, checkout) — communicating via API. Shopify provides the <b>Storefront API</b> (GraphQL) and the <b>Hydrogen</b> framework (React). WooCommerce and Magento expose their own REST &amp; GraphQL APIs. Headless lets you use Next.js/Nuxt as the frontend while leveraging a mature commerce backend. Trade-off: more flexibility but more complexity and lost out-of-the-box features.",
        },
      ],
    },
    {
      id: "how-to-choose",
      title: { vi: "7. Cách chọn nền tảng phù hợp", en: "7. How to choose the right platform" },
      blocks: [
        {
          type: "prose",
          vi: "Dưới đây là hướng dẫn quyết định ngắn gọn dựa trên các yếu tố thực tế:",
          en: "Here is a concise decision guide based on practical factors:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Ngân sách thấp + đã có WordPress?</b> → <b>WooCommerce</b>. Plugin miễn phí, chi phí chỉ là hosting và plugin bổ sung.", en: "<b>Low budget + already on WordPress?</b> → <b>WooCommerce</b>. Free plugin, cost is just hosting and add-on plugins." },
            { vi: "<b>Ra mắt nhanh, ít kỹ thuật?</b> → <b>Shopify</b>. Vài giờ là có cửa hàng chạy được, không cần lo hạ tầng.", en: "<b>Fast launch, low tech expertise?</b> → <b>Shopify</b>. Up and running in hours, no infrastructure worries." },
            { vi: "<b>Doanh nghiệp lớn, catalog phức tạp, B2B?</b> → <b>Magento / Adobe Commerce</b>. Mạnh mẽ nhất nhưng đòi hỏi team dev chuyên và ngân sách lớn.", en: "<b>Large enterprise, complex catalog, B2B?</b> → <b>Magento / Adobe Commerce</b>. Most powerful, but requires a specialist dev team and large budget." },
            { vi: "<b>Cần kiểm soát tuyệt đối + có đội PHP?</b> → <b>WooCommerce hoặc Magento Open Source</b>. Mã nguồn mở, tùy chỉnh không giới hạn.", en: "<b>Need full control + have a PHP team?</b> → <b>WooCommerce or Magento Open Source</b>. Open-source, unlimited customization." },
            { vi: "<b>Headless / Jamstack frontend?</b> → <b>Shopify</b> (Storefront API + Hydrogen) hoặc <b>WooCommerce</b> (REST/GraphQL) là lựa chọn phổ biến nhất.", en: "<b>Headless / Jamstack frontend?</b> → <b>Shopify</b> (Storefront API + Hydrogen) or <b>WooCommerce</b> (REST/GraphQL) are the most common choices." },
            { vi: "<b>Khả năng mở rộng dài hạn?</b> → Shopify tự scale, nhưng Magento thắng về xử lý catalog khổng lồ + logic B2B phức tạp.", en: "<b>Long-term scalability?</b> → Shopify auto-scales, but Magento wins for massive catalogs and complex B2B logic." },
          ],
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "WooCommerce = tự do nhưng tự lo | Shopify = dễ dùng nhưng bị ràng buộc | Magento = mạnh nhất nhưng tốn kém nhất. Shopify cho tốc độ, WooCommerce cho linh hoạt vừa phải, Magento cho quy mô doanh nghiệp.",
          en: "WooCommerce = freedom but you own the ops | Shopify = easy but you're locked in | Magento = most powerful but most expensive. Shopify for speed, WooCommerce for moderate flexibility, Magento for enterprise scale.",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "WooCommerce là gì và chạy trên nền tảng nào?", en: "What is WooCommerce and what does it run on?" },
      back: { vi: "Một plugin WordPress mã nguồn mở miễn phí (PHP/MySQL). Biến website WordPress thành cửa hàng TMĐT. Bạn tự quản lý hosting, bảo mật và cập nhật.", en: "A free, open-source WordPress plugin (PHP/MySQL). Turns any WordPress site into an e-commerce store. You self-manage hosting, security, and updates." },
    },
    {
      front: { vi: "Ngôn ngữ template của Shopify là gì?", en: "What is Shopify's template language?" },
      back: { vi: "<b>Liquid</b> — ngôn ngữ template riêng của Shopify (tương tự Jinja2/Twig), dùng để xây dựng theme cửa hàng. Shopify cũng có Storefront API (GraphQL) cho headless.", en: "<b>Liquid</b> — Shopify's proprietary template language (similar to Jinja2/Twig), used to build store themes. Shopify also has a Storefront API (GraphQL) for headless storefronts." },
    },
    {
      front: { vi: "Sự khác biệt giữa Magento Open Source và Adobe Commerce là gì?", en: "What is the difference between Magento Open Source and Adobe Commerce?" },
      back: { vi: "<b>Magento Open Source</b>: miễn phí, tự host, tính năng cơ bản. <b>Adobe Commerce</b>: trả phí (enterprise), thêm B2B module, Page Builder, AI search, và tùy chọn cloud managed bởi Adobe.", en: "<b>Magento Open Source</b>: free, self-hosted, core features. <b>Adobe Commerce</b>: paid (enterprise), adds B2B module, Page Builder, AI live search, and Adobe-managed cloud option." },
    },
    {
      front: { vi: "Hosted vs Self-hosted trong TMĐT khác nhau như thế nào?", en: "What is the difference between hosted and self-hosted in e-commerce?" },
      back: { vi: "<b>Hosted (SaaS)</b>: nhà cung cấp lo server/bảo mật/cập nhật (ví dụ: Shopify). <b>Self-hosted</b>: bạn tự quản lý server, bảo mật, cập nhật (ví dụ: WooCommerce, Magento).", en: "<b>Hosted (SaaS)</b>: provider manages servers, security, updates (e.g. Shopify). <b>Self-hosted</b>: you manage the server, security, and updates yourself (e.g. WooCommerce, Magento)." },
    },
    {
      front: { vi: "SKU là gì trong bối cảnh thương mại điện tử?", en: "What is a SKU in e-commerce?" },
      back: { vi: "<b>SKU (Stock Keeping Unit)</b> — mã định danh duy nhất cho mỗi variant sản phẩm (ví dụ: áo-xanh-L). Dùng để theo dõi tồn kho và xử lý đơn hàng.", en: "<b>SKU (Stock Keeping Unit)</b> — a unique identifier for each product variant (e.g. shirt-blue-L). Used for inventory tracking and order fulfillment." },
    },
    {
      front: { vi: "Webhook trong TMĐT hoạt động như thế nào? Cho ví dụ.", en: "How do webhooks work in e-commerce? Give an example." },
      back: { vi: "Webhook là HTTP POST callback mà nền tảng gửi đến URL của bạn khi một sự kiện xảy ra. Ví dụ: khi có đơn hàng mới, Shopify POST dữ liệu đơn hàng đến <code>https://yourapp.com/webhooks/order-created</code>.", en: "A webhook is an HTTP POST callback sent by the platform to your URL when an event occurs. Example: on a new order, Shopify POSTs order data to <code>https://yourapp.com/webhooks/order-created</code>." },
    },
    {
      front: { vi: "Headless commerce là gì?", en: "What is headless commerce?" },
      back: { vi: "Kiến trúc tách frontend (UI) khỏi backend TMĐT, giao tiếp qua API (REST/GraphQL). Frontend có thể là Next.js/Nuxt trong khi backend là Shopify/WooCommerce/Magento. Linh hoạt hơn nhưng phức tạp hơn.", en: "Architecture that decouples the frontend (UI) from the commerce backend, communicating via API (REST/GraphQL). Frontend can be Next.js/Nuxt while the backend is Shopify/WooCommerce/Magento. More flexible but more complex." },
    },
    {
      front: { vi: "Payment gateway là gì và ví dụ một số phổ biến?", en: "What is a payment gateway? Name some examples." },
      back: { vi: "Dịch vụ xử lý thanh toán: mã hóa thông tin thẻ, giao tiếp với ngân hàng, trả kết quả về cho cửa hàng. Ví dụ: <b>Stripe</b>, <b>PayPal</b>, VNPay, Momo (Việt Nam), Shopify Payments.", en: "A service that processes payments: encrypts card data, communicates with banks, returns the result to the store. Examples: <b>Stripe</b>, <b>PayPal</b>, VNPay, Momo (Vietnam), Shopify Payments." },
    },
    {
      front: { vi: "Khi nào nên chọn Shopify thay vì WooCommerce?", en: "When should you choose Shopify over WooCommerce?" },
      back: { vi: "Chọn Shopify khi: cần ra mắt nhanh, đội ngũ ít kỹ thuật, không muốn quản lý server/bảo mật, hoặc đang làm dropshipping/D2C brand. WooCommerce tốt hơn nếu đã có WordPress hoặc cần kiểm soát sâu hơn.", en: "Choose Shopify when: fast launch is needed, team is non-technical, you don't want to manage servers/security, or you're doing dropshipping/D2C. WooCommerce is better if already on WordPress or deeper control is needed." },
    },
    {
      front: { vi: "Tại sao Magento lại tốn kém dù bản Open Source miễn phí?", en: "Why is Magento expensive even though Open Source is free?" },
      back: { vi: "Vì cần: dev Magento chuyên biệt (lương cao), server mạnh (Elasticsearch, Redis, nhiều RAM), thời gian phát triển lâu, và bảo trì liên tục. TCO của Magento thường cao hơn Shopify Plus cho cùng quy mô.", en: "Because you need: specialist Magento developers (high salaries), powerful servers (Elasticsearch, Redis, lots of RAM), long development time, and ongoing maintenance. Magento's TCO often exceeds Shopify Plus at the same scale." },
    },
  ],
  quiz: [
    {
      q: { vi: "WooCommerce được xây dựng trên nền tảng nào?", en: "WooCommerce is built on top of which platform?" },
      options: [
        { vi: "Laravel (PHP framework)", en: "Laravel (PHP framework)" },
        { vi: "WordPress (PHP/MySQL)", en: "WordPress (PHP/MySQL)" },
        { vi: "Ruby on Rails", en: "Ruby on Rails" },
        { vi: "Node.js / Express", en: "Node.js / Express" },
      ],
      answer: 1,
      explain: {
        vi: "WooCommerce là một plugin WordPress, do đó chạy trên nền PHP/MySQL cùng với WordPress. Nó không phải một ứng dụng độc lập.",
        en: "WooCommerce is a WordPress plugin, so it runs on PHP/MySQL alongside WordPress. It is not a standalone application.",
      },
    },
    {
      q: { vi: "Shopify là loại nền tảng nào?", en: "What type of platform is Shopify?" },
      options: [
        { vi: "Open-source, self-hosted", en: "Open-source, self-hosted" },
        { vi: "Hosted SaaS (Software-as-a-Service)", en: "Hosted SaaS (Software-as-a-Service)" },
        { vi: "Desktop application", en: "Desktop application" },
        { vi: "Serverless framework", en: "Serverless framework" },
      ],
      answer: 1,
      explain: {
        vi: "Shopify là SaaS — bạn trả phí thuê bao hàng tháng và Shopify quản lý toàn bộ hạ tầng server, bảo mật, cập nhật.",
        en: "Shopify is SaaS — you pay a monthly subscription and Shopify manages all server infrastructure, security, and updates.",
      },
    },
    {
      q: { vi: "Ngôn ngữ template mặc định để tạo theme trong Shopify là gì?", en: "What is the default template language for building Shopify themes?" },
      options: [
        { vi: "Twig", en: "Twig" },
        { vi: "Handlebars", en: "Handlebars" },
        { vi: "Liquid", en: "Liquid" },
        { vi: "Blade", en: "Blade" },
      ],
      answer: 2,
      explain: {
        vi: "Shopify dùng ngôn ngữ template độc quyền là <b>Liquid</b>. Nó tương tự Jinja2 hay Twig về cú pháp nhưng chỉ dùng trong hệ sinh thái Shopify.",
        en: "Shopify uses its own proprietary template language called <b>Liquid</b>. It is syntactically similar to Jinja2 or Twig but is specific to the Shopify ecosystem.",
      },
    },
    {
      q: { vi: "Điều nào sau đây mô tả đúng nhất về Magento Open Source?", en: "Which best describes Magento Open Source?" },
      options: [
        { vi: "Hosted SaaS, không cần quản lý server", en: "Hosted SaaS, no server management needed" },
        { vi: "Plugin WordPress miễn phí", en: "Free WordPress plugin" },
        { vi: "Nền tảng PHP mã nguồn mở, tự host, phù hợp cho doanh nghiệp lớn", en: "Open-source PHP platform, self-hosted, suited for large enterprises" },
        { vi: "Framework Node.js cho headless commerce", en: "Node.js framework for headless commerce" },
      ],
      answer: 2,
      explain: {
        vi: "Magento Open Source là nền tảng PHP mã nguồn mở, tự host, thiết kế cho catalog phức tạp và doanh nghiệp lớn.",
        en: "Magento Open Source is an open-source PHP platform, self-hosted, designed for complex catalogs and large enterprises.",
      },
    },
    {
      q: { vi: "SKU (Stock Keeping Unit) dùng để làm gì?", en: "What is a SKU (Stock Keeping Unit) used for?" },
      options: [
        { vi: "Xác định địa chỉ kho hàng", en: "Identify the warehouse address" },
        { vi: "Định danh duy nhất mỗi variant sản phẩm để theo dõi tồn kho", en: "Uniquely identify each product variant for inventory tracking" },
        { vi: "Tính phí vận chuyển", en: "Calculate shipping fees" },
        { vi: "Mã hóa thông tin thẻ thanh toán", en: "Encrypt payment card information" },
      ],
      answer: 1,
      explain: {
        vi: "SKU là mã định danh duy nhất cho từng variant sản phẩm (ví dụ: màu + size). Hệ thống dùng SKU để theo dõi tồn kho và xử lý đơn hàng chính xác.",
        en: "A SKU uniquely identifies each product variant (e.g. color + size). The system uses SKUs for accurate inventory tracking and order fulfillment.",
      },
    },
    {
      q: { vi: "Webhook trong thương mại điện tử là gì?", en: "What is a webhook in e-commerce?" },
      options: [
        { vi: "Một loại payment gateway đặc biệt", en: "A special type of payment gateway" },
        { vi: "HTTP POST callback mà nền tảng gửi đến URL của bạn khi có sự kiện", en: "An HTTP POST callback the platform sends to your URL when an event occurs" },
        { vi: "API để tìm kiếm sản phẩm", en: "An API for searching products" },
        { vi: "Cơ chế cache CDN cho ảnh sản phẩm", en: "A CDN cache mechanism for product images" },
      ],
      answer: 1,
      explain: {
        vi: "Webhook là cơ chế event-driven: khi có sự kiện (đơn hàng mới, hoàn tiền...), nền tảng POST dữ liệu đến endpoint bạn đăng ký, cho phép tích hợp real-time với hệ thống bên ngoài.",
        en: "A webhook is an event-driven mechanism: when an event occurs (new order, refund...), the platform POSTs data to your registered endpoint, enabling real-time integration with external systems.",
      },
    },
    {
      q: { vi: "Headless commerce có nghĩa là gì?", en: "What does 'headless commerce' mean?" },
      options: [
        { vi: "Cửa hàng không có tên miền (domain)", en: "A store with no domain name" },
        { vi: "Tách frontend (UI) khỏi backend TMĐT, giao tiếp qua API", en: "Decoupling the frontend (UI) from the commerce backend, communicating via API" },
        { vi: "Chạy Magento không có giao diện admin", en: "Running Magento without an admin interface" },
        { vi: "Dùng Shopify mà không cần theme", en: "Using Shopify without a theme" },
      ],
      answer: 1,
      explain: {
        vi: "Headless commerce tách storefront (frontend có thể là Next.js, Nuxt) khỏi commerce backend (Shopify/WooCommerce/Magento). Giao tiếp qua REST hoặc GraphQL API. Linh hoạt hơn nhưng phức tạp hơn.",
        en: "Headless commerce separates the storefront (frontend, e.g. Next.js, Nuxt) from the commerce backend (Shopify/WooCommerce/Magento). They communicate via REST or GraphQL API. More flexible but more complex.",
      },
    },
    {
      q: { vi: "Điều nào là nhược điểm CHÍNH khi dùng Magento Open Source?", en: "What is the main drawback of using Magento Open Source?" },
      options: [
        { vi: "Không hỗ trợ đa ngôn ngữ", en: "No multi-language support" },
        { vi: "Không có REST API", en: "No REST API" },
        { vi: "Rất phức tạp, tốn tài nguyên, cần dev chuyên biệt và server mạnh", en: "Very complex, resource-heavy, requires specialist devs and a powerful server" },
        { vi: "Không thể tùy chỉnh giao diện", en: "Cannot customize the storefront" },
      ],
      answer: 2,
      explain: {
        vi: "Magento nổi tiếng về độ phức tạp và nặng về tài nguyên. Cần server mạnh (Elasticsearch, Redis), dev có kinh nghiệm Magento, và thời gian phát triển lâu — đây là rào cản lớn cho doanh nghiệp nhỏ.",
        en: "Magento is notorious for complexity and resource demands. It needs powerful servers (Elasticsearch, Redis), experienced Magento developers, and long development time — a major barrier for smaller businesses.",
      },
    },
    {
      q: { vi: "Bạn muốn mở cửa hàng trực tuyến trong 24 giờ, đội ngũ không có developer. Bạn nên chọn nền tảng nào?", en: "You want to launch an online store within 24 hours and your team has no developers. Which platform should you choose?" },
      options: [
        { vi: "Magento Open Source", en: "Magento Open Source" },
        { vi: "WooCommerce", en: "WooCommerce" },
        { vi: "Shopify", en: "Shopify" },
        { vi: "Adobe Commerce Cloud", en: "Adobe Commerce Cloud" },
      ],
      answer: 2,
      explain: {
        vi: "Shopify được thiết kế để ra mắt nhanh mà không cần kỹ thuật. WooCommerce cần WordPress và một chút cấu hình. Magento hoàn toàn không phù hợp cho trường hợp này.",
        en: "Shopify is designed for fast, no-code launches. WooCommerce requires WordPress setup and some configuration. Magento is entirely unsuitable for this scenario.",
      },
    },
    {
      q: { vi: "Điều nào sau đây là ĐÚNG về chi phí của WooCommerce?", en: "Which of the following is TRUE about WooCommerce's cost?" },
      options: [
        { vi: "Hoàn toàn miễn phí — không có chi phí ẩn nào", en: "Completely free — no hidden costs at all" },
        { vi: "Plugin miễn phí nhưng tổng chi phí (TCO) gồm hosting, plugin trả phí, và nhân lực kỹ thuật", en: "Free plugin but total cost of ownership includes hosting, paid plugins, and technical staff" },
        { vi: "Phí cố định $30/tháng như Shopify Basic", en: "Fixed $30/month fee like Shopify Basic" },
        { vi: "Miễn phí nhưng giới hạn 100 sản phẩm", en: "Free but limited to 100 products" },
      ],
      answer: 1,
      explain: {
        vi: "WooCommerce plugin miễn phí nhưng TCO bao gồm: hosting (VPS/managed WP), domain, SSL, plugin bổ sung (payment, SEO, shipping), và chi phí nhân lực kỹ thuật duy trì hệ thống.",
        en: "The WooCommerce plugin is free, but TCO includes: hosting (VPS/managed WP), domain, SSL, add-on plugins (payment, SEO, shipping), and the cost of technical staff to maintain the system.",
      },
    },
  ],
});
