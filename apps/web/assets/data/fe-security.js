/* Front-end Security */
PREP.register({
  id: "fe-security",
  icon: "🛡️",
  category: "frontend",
  title: { vi: "Bảo mật Front-end", en: "Front-end Security" },
  blurb: {
    vi: "Bảo mật là câu hỏi ngày càng phổ biến ở vòng phỏng vấn senior/lead. Nắm XSS, CSRF, CORS, CSP và cách lưu token an toàn là đủ để gây ấn tượng.",
    en: "Security is increasingly common in senior/lead interviews. Knowing XSS, CSRF, CORS, CSP, and safe token storage is enough to stand out.",
  },
  sections: [
    {
      id: "xss",
      title: { vi: "1. XSS — Cross-Site Scripting", en: "1. XSS — Cross-Site Scripting" },
      blocks: [
        {
          type: "prose",
          vi: "<b>XSS</b> xảy ra khi kẻ tấn công chèn được JavaScript độc hại vào trang web và trình duyệt của nạn nhân thực thi đoạn script đó. Script có thể đánh cắp cookie, session token, hoặc điều hướng người dùng đến trang giả mạo.",
          en: "<b>XSS</b> occurs when an attacker injects malicious JavaScript into a web page and the victim's browser executes it. The script can steal cookies, session tokens, or redirect users to phishing pages.",
        },
        {
          type: "table",
          headers: { vi: ["Loại", "Cách hoạt động", "Ví dụ"], en: ["Type", "How it works", "Example"] },
          rows: [
            { vi: ["Stored XSS", "Script lưu vào database, hiển thị cho mọi người dùng", "Bình luận độc hại trên diễn đàn"], en: ["Stored XSS", "Script saved to DB, served to every visitor", "Malicious comment on a forum"] },
            { vi: ["Reflected XSS", "Script nằm trong URL/query, server phản chiếu lại ngay", "?q=&lt;script&gt;alert(1)&lt;/script&gt; trong kết quả tìm kiếm"], en: ["Reflected XSS", "Script lives in URL/query, server echoes it back immediately", "?q=&lt;script&gt;alert(1)&lt;/script&gt; in search results"] },
            { vi: ["DOM-based XSS", "Script được đọc từ DOM (location.hash, ...) và ghi lại vào DOM mà không qua server", "document.write(location.hash) không escape"], en: ["DOM-based XSS", "Script is read from the DOM (location.hash, …) and written back into the DOM without touching the server", "document.write(location.hash) without escaping"] },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "DOM-based XSS không chạy qua server → WAF và output encoding phía server <b>không bắt được</b>. Phải xử lý an toàn ở phía client.",
          en: "DOM-based XSS never touches the server → WAF and server-side output encoding <b>won't catch it</b>. Must be handled safely on the client.",
        },
        {
          type: "prose",
          vi: "Ví dụ lỗ hổng: đoạn code dưới đây ghi thẳng dữ liệu người dùng vào DOM mà không làm sạch.",
          en: "Vulnerable example: the code below writes user-controlled data directly into the DOM without sanitization.",
        },
        {
          type: "code",
          code: "// ❌ VULNERABLE — DOM-based XSS\nconst name = new URLSearchParams(location.search).get('name');\ndocument.getElementById('greeting').innerHTML = 'Hello, ' + name;\n// Attacker URL: ?name=<img src=x onerror=alert(document.cookie)>",
          caption: { vi: "Dùng innerHTML với dữ liệu không tin tưởng → XSS", en: "Using innerHTML with untrusted data → XSS" },
        },
        {
          type: "code",
          code: "// ✅ SAFE — use textContent for plain text\nconst name = new URLSearchParams(location.search).get('name');\ndocument.getElementById('greeting').textContent = 'Hello, ' + name;\n\n// ✅ SAFE — use DOMPurify if you must render HTML\nimport DOMPurify from 'dompurify';\nelement.innerHTML = DOMPurify.sanitize(untrustedHTML);",
          caption: { vi: "Dùng textContent hoặc DOMPurify để an toàn", en: "Use textContent or DOMPurify to stay safe" },
        },
        {
          type: "list",
          items: [
            { vi: "<b>Output escaping</b> — luôn encode &amp;, &lt;, &gt;, \", ' trước khi chèn dữ liệu vào HTML.", en: "<b>Output escaping</b> — always encode &amp;, &lt;, &gt;, \", ' before inserting data into HTML." },
            { vi: "<b>Framework auto-escaping</b> — React, Vue, Angular mặc định escape nội dung trong templates; đừng bỏ qua bằng dangerouslySetInnerHTML / v-html trừ khi đã sanitize.", en: "<b>Framework auto-escaping</b> — React, Vue, Angular escape template content by default; never bypass with dangerouslySetInnerHTML / v-html unless you have sanitized first." },
            { vi: "<b>Tránh innerHTML / eval()</b> khi dữ liệu đến từ người dùng hoặc URL.", en: "<b>Avoid innerHTML / eval()</b> when data comes from user input or the URL." },
            { vi: "<b>DOMPurify</b> — thư viện sanitize HTML phía client đáng tin cậy khi bắt buộc phải render HTML.", en: "<b>DOMPurify</b> — trusted client-side HTML sanitizer library when you must render HTML." },
            { vi: "<b>Content-Security-Policy (CSP)</b> — tầng phòng thủ cuối, giới hạn nguồn script được phép chạy (xem Mục 2).", en: "<b>Content-Security-Policy (CSP)</b> — last line of defence, restricts which script sources may run (see Section 2)." },
          ],
          ordered: false,
        },
        {
          type: "callout",
          variant: "key",
          vi: "Nguyên tắc vàng XSS: <b>không bao giờ tin tưởng dữ liệu đầu vào</b>. Escape khi OUTPUT ra HTML, không phải khi nhập vào.",
          en: "Golden XSS rule: <b>never trust input data</b>. Escape at OUTPUT time into HTML, not at input time.",
        },
      ],
    },
    {
      id: "csp",
      title: { vi: "2. Content Security Policy (CSP)", en: "2. Content Security Policy (CSP)" },
      blocks: [
        {
          type: "prose",
          vi: "<b>CSP</b> là HTTP response header cho phép bạn khai báo danh sách các nguồn (origins) được phép tải script, style, image, font, v.v. Trình duyệt từ chối bất kỳ tài nguyên nào không nằm trong danh sách đó.",
          en: "<b>CSP</b> is an HTTP response header that lets you declare an allowlist of origins permitted to load scripts, styles, images, fonts, etc. The browser blocks any resource not in that list.",
        },
        {
          type: "code",
          code: "Content-Security-Policy:\n  default-src 'self';\n  script-src 'self' 'nonce-abc123' https://cdn.example.com;\n  style-src 'self' 'unsafe-inline';\n  img-src 'self' data: https:;\n  object-src 'none';\n  report-uri /csp-violations;",
          caption: { vi: "Ví dụ CSP header — chỉ cho phép script từ cùng origin và CDN tin cậy, dùng nonce cho inline script", en: "Sample CSP header — only allows scripts from same origin and a trusted CDN, uses nonce for inline scripts" },
        },
        {
          type: "list",
          items: [
            { vi: "<b>nonce</b> — mỗi request sinh một giá trị ngẫu nhiên duy nhất; chỉ &lt;script nonce=\"abc123\"&gt; hợp lệ. Ngăn script inject từ XSS.", en: "<b>nonce</b> — a unique random value generated per request; only &lt;script nonce=\"abc123\"&gt; is valid. Blocks XSS-injected scripts." },
            { vi: "<b>hash</b> — hash SHA256/384 của nội dung script cụ thể. Phù hợp script tĩnh.", en: "<b>hash</b> — SHA-256/384 hash of a specific script body. Good for static inline scripts." },
            { vi: "<b>report-only</b> — Content-Security-Policy-Report-Only cho phép kiểm thử CSP mà không chặn thực sự, chỉ gửi báo cáo.", en: "<b>report-only</b> — Content-Security-Policy-Report-Only lets you test a policy without blocking anything, only sends reports." },
            { vi: "<b>unsafe-inline / unsafe-eval</b> — vô hiệu hóa phần lớn lợi ích của CSP; tránh dùng nếu có thể.", en: "<b>unsafe-inline / unsafe-eval</b> — nullifies most CSP benefit; avoid if possible." },
          ],
          ordered: false,
        },
        {
          type: "callout",
          variant: "tip",
          vi: "CSP <b>không thay thế</b> output escaping — nó là lớp phòng thủ thứ hai. Một số trình duyệt cũ không hỗ trợ đầy đủ; hãy dùng report-only trước khi enforce.",
          en: "CSP does <b>not replace</b> output escaping — it is a second layer of defence. Some older browsers don't fully support it; use report-only before enforcing.",
        },
      ],
    },
    {
      id: "csrf",
      title: { vi: "3. CSRF — Cross-Site Request Forgery", en: "3. CSRF — Cross-Site Request Forgery" },
      blocks: [
        {
          type: "prose",
          vi: "<b>CSRF</b> lừa trình duyệt nạn nhân gửi request đến server mà nạn nhân đã đăng nhập. Vì trình duyệt tự đính kèm cookie, server nghĩ đây là request hợp lệ của người dùng.",
          en: "<b>CSRF</b> tricks the victim's browser into sending a request to a server the victim is logged into. Because the browser auto-attaches cookies, the server thinks the request is a legitimate user action.",
        },
        {
          type: "code",
          code: "<!-- Attacker page: evil.com -->\n<!-- When victim visits this page while logged into bank.com, the form auto-submits -->\n&lt;form action=\"https://bank.com/transfer\" method=\"POST\"&gt;\n  &lt;input type=\"hidden\" name=\"amount\" value=\"9999\" /&gt;\n  &lt;input type=\"hidden\" name=\"to\" value=\"attacker\" /&gt;\n&lt;/form&gt;\n&lt;script&gt;document.forms[0].submit();&lt;/script&gt;",
          caption: { vi: "CSRF tấn công: form ẩn tự gửi sang bank.com với cookie của nạn nhân", en: "CSRF attack: hidden form auto-submits to bank.com using the victim's cookies" },
        },
        {
          type: "list",
          items: [
            { vi: "<b>Anti-CSRF token (Synchronizer Token Pattern)</b> — server tạo token ngẫu nhiên, nhúng vào form ẩn, xác minh khi nhận request. Kẻ tấn công không thể đọc token từ domain khác (same-origin policy).", en: "<b>Anti-CSRF token (Synchronizer Token Pattern)</b> — server generates a random token, embeds it in a hidden form field, verifies it on the incoming request. An attacker on a different origin cannot read the token (same-origin policy)." },
            { vi: "<b>SameSite cookie</b> — thuộc tính <code>SameSite=Strict</code> hoặc <code>SameSite=Lax</code> ngăn trình duyệt gửi cookie trong cross-site request. Đây là biện pháp phòng thủ hiện đại và đơn giản nhất.", en: "<b>SameSite cookie</b> — the <code>SameSite=Strict</code> or <code>SameSite=Lax</code> attribute prevents the browser from sending the cookie with cross-site requests. This is the simplest modern defence." },
            { vi: "<b>Double-submit cookie</b> — gửi cùng một token trong cả cookie và request body/header; server xác minh hai giá trị khớp nhau.", en: "<b>Double-submit cookie</b> — send the same token in both a cookie and the request body/header; the server verifies the two match." },
            { vi: "<b>Custom request header</b> — thêm header như <code>X-Requested-With: XMLHttpRequest</code>; CORS ngăn cross-origin request gắn header tùy ý.", en: "<b>Custom request header</b> — add a header such as <code>X-Requested-With: XMLHttpRequest</code>; CORS prevents cross-origin requests from setting arbitrary headers." },
          ],
          ordered: false,
        },
        {
          type: "callout",
          variant: "info",
          vi: "CSRF ảnh hưởng chủ yếu đến các API dùng cookie để xác thực. API dùng Bearer token trong Authorization header (JWT) <b>không bị</b> CSRF vì trình duyệt không tự gắn Authorization header.",
          en: "CSRF mainly affects APIs that use cookies for authentication. APIs that use a Bearer token in the Authorization header (JWT) are <b>not vulnerable</b> to CSRF because the browser does not auto-attach the Authorization header.",
        },
      ],
    },
    {
      id: "cors",
      title: { vi: "4. CORS — Cross-Origin Resource Sharing", en: "4. CORS — Cross-Origin Resource Sharing" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Same-Origin Policy (SOP)</b> là quy tắc bảo mật mặc định của trình duyệt: một trang chỉ được đọc response từ cùng <b>scheme + hostname + port</b>. CORS cho phép server \"mở cửa\" cho một số origin đáng tin cậy.",
          en: "<b>Same-Origin Policy (SOP)</b> is the browser's default security rule: a page may only read responses from the same <b>scheme + hostname + port</b>. CORS lets a server selectively open access to trusted origins.",
        },
        {
          type: "list",
          items: [
            { vi: "Origin A = <code>https://app.example.com</code>. Origin B = <code>https://api.example.com</code> → <b>cross-origin</b> (subdomain khác).", en: "Origin A = <code>https://app.example.com</code>. Origin B = <code>https://api.example.com</code> → <b>cross-origin</b> (different subdomain)." },
            { vi: "Trình duyệt tự động thêm header <code>Origin: https://app.example.com</code> vào request. Server phản hồi với <code>Access-Control-Allow-Origin</code>.", en: "The browser automatically adds <code>Origin: https://app.example.com</code> to the request. The server responds with <code>Access-Control-Allow-Origin</code>." },
            { vi: "<b>Preflight (OPTIONS)</b> — với \"non-simple\" request (PUT/DELETE hoặc custom header), trình duyệt gửi OPTIONS trước để hỏi server có cho phép không.", en: "<b>Preflight (OPTIONS)</b> — for \"non-simple\" requests (PUT/DELETE or custom headers), the browser sends an OPTIONS request first to ask if the server permits it." },
          ],
          ordered: false,
        },
        {
          type: "code",
          code: "// ✅ Server response headers (Node/Express example)\nres.setHeader('Access-Control-Allow-Origin', 'https://app.example.com');\nres.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');\nres.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');\nres.setHeader('Access-Control-Allow-Credentials', 'true');\n\n// ❌ DANGEROUS misconfiguration\nres.setHeader('Access-Control-Allow-Origin', '*');           // wildcard\nres.setHeader('Access-Control-Allow-Credentials', 'true');  // cannot combine with *",
          caption: { vi: "Cấu hình CORS đúng vs sai — không dùng * cùng credentials", en: "Correct vs dangerous CORS config — never combine * with credentials" },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<code>Access-Control-Allow-Origin: *</code> kết hợp với <code>Access-Control-Allow-Credentials: true</code> là <b>cấu hình không hợp lệ</b> theo spec — trình duyệt sẽ từ chối. Nhưng nhiều dev đặt origin động từ header mà không validate → toàn bộ origin bất kỳ được chấp nhận.",
          en: "<code>Access-Control-Allow-Origin: *</code> combined with <code>Access-Control-Allow-Credentials: true</code> is <b>invalid per spec</b> — browsers will reject it. But many servers reflect the Origin header dynamically without validation → any origin is accepted.",
        },
        {
          type: "callout",
          variant: "key",
          vi: "CORS là cơ chế trình duyệt — nó không bảo vệ server khỏi các request trực tiếp (curl, server-to-server). CORS bảo vệ người dùng trình duyệt, không phải server.",
          en: "CORS is a browser mechanism — it does not protect the server from direct requests (curl, server-to-server). CORS protects browser users, not the server.",
        },
      ],
    },
    {
      id: "auth-storage",
      title: { vi: "5. Lưu trữ token xác thực an toàn", en: "5. Secure auth token storage" },
      blocks: [
        {
          type: "prose",
          vi: "Câu hỏi phổ biến trong phỏng vấn: <b>\"Lưu JWT ở đâu — localStorage hay cookie?\"</b>. Không có câu trả lời hoàn hảo; cả hai đều có đánh đổi.",
          en: "A classic interview question: <b>\"Where to store a JWT — localStorage or a cookie?\"</b>. There is no perfect answer; both involve trade-offs.",
        },
        {
          type: "table",
          headers: { vi: ["Nơi lưu", "Rủi ro chính", "Chú ý"], en: ["Storage", "Main risk", "Notes"] },
          rows: [
            { vi: ["localStorage / sessionStorage", "XSS — bất kỳ script nào cũng đọc được", "Không bị CSRF; dev phải tự thêm Authorization header"], en: ["localStorage / sessionStorage", "XSS — any script can read it", "Not vulnerable to CSRF; developer must add Authorization header manually"] },
            { vi: ["httpOnly cookie", "CSRF — gửi tự động theo mọi request", "Script không đọc được; dùng SameSite + CSRF token để chống CSRF"], en: ["httpOnly cookie", "CSRF — sent automatically with every request", "Scripts cannot read it; combine with SameSite + CSRF token to mitigate CSRF"] },
            { vi: ["memory (biến JS)", "Mất khi reload trang; an toàn nhất trong runtime", "Tốt cho access token ngắn hạn; cần refresh token trong httpOnly cookie"], en: ["memory (JS variable)", "Lost on page reload; safest at runtime", "Good for short-lived access tokens; keep refresh token in httpOnly cookie"] },
          ],
        },
        {
          type: "list",
          items: [
            { vi: "<b>Không bao giờ</b> lưu private key, client secret, hay mật khẩu trong JS bundle, localStorage, hoặc cookie client-readable.", en: "<b>Never</b> store private keys, client secrets, or passwords in the JS bundle, localStorage, or a client-readable cookie." },
            { vi: "<b>JWT payload</b> chỉ được encode (base64), không được mã hóa — bất kỳ ai có token đều đọc được payload. Đừng đặt dữ liệu nhạy cảm trong payload.", en: "<b>JWT payload</b> is only encoded (base64), not encrypted — anyone with the token can read the payload. Do not put sensitive data in the payload." },
            { vi: "<b>Set httpOnly + Secure + SameSite=Lax</b> cho cookie chứa session/refresh token.", en: "<b>Set httpOnly + Secure + SameSite=Lax</b> on cookies holding session/refresh tokens." },
            { vi: "Đặt thời gian hết hạn ngắn cho access token (15 phút); dùng refresh token để gia hạn.", en: "Keep access token expiry short (15 minutes); use refresh tokens for renewal." },
          ],
          ordered: false,
        },
        {
          type: "callout",
          variant: "key",
          vi: "Khuyến nghị phổ biến: <b>access token trong memory</b> (biến JS) + <b>refresh token trong httpOnly cookie</b>. Đây là điểm cân bằng tốt nhất giữa XSS và CSRF.",
          en: "Common recommendation: <b>access token in memory</b> (JS variable) + <b>refresh token in httpOnly cookie</b>. This is the best balance between XSS and CSRF risk.",
        },
      ],
    },
    {
      id: "clickjacking",
      title: { vi: "6. Clickjacking", en: "6. Clickjacking" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Clickjacking</b> nhúng trang web của bạn vào một iframe ẩn, đặt chồng lên một UI giả. Người dùng tưởng click vào nút giả nhưng thực ra đang click vào trang của bạn bên dưới.",
          en: "<b>Clickjacking</b> embeds your website in a hidden iframe, overlaid on a fake UI. The user thinks they are clicking a decoy button but are actually clicking your page underneath.",
        },
        {
          type: "list",
          items: [
            { vi: "<b>X-Frame-Options: DENY</b> — không cho phép nhúng iframe ở bất kỳ đâu. <code>SAMEORIGIN</code> chỉ cho phép cùng origin.", en: "<b>X-Frame-Options: DENY</b> — prevents iframe embedding anywhere. <code>SAMEORIGIN</code> allows same-origin framing only." },
            { vi: "<b>CSP frame-ancestors</b> — thay thế hiện đại của X-Frame-Options. <code>frame-ancestors 'none'</code> tương đương DENY; hỗ trợ nhiều origin hơn.", en: "<b>CSP frame-ancestors</b> — modern replacement for X-Frame-Options. <code>frame-ancestors 'none'</code> is equivalent to DENY; supports multiple origins." },
          ],
          ordered: false,
        },
        {
          type: "code",
          code: "# HTTP response headers\nX-Frame-Options: DENY\n\n# Modern CSP equivalent (more flexible)\nContent-Security-Policy: frame-ancestors 'none';\n\n# Allow framing from same origin only\nContent-Security-Policy: frame-ancestors 'self';",
          caption: { vi: "Các header phòng chống clickjacking", en: "Anti-clickjacking response headers" },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Nếu cần nhúng widget của mình vào third-party site, dùng <code>frame-ancestors https://trusted-partner.com</code> thay vì DENY toàn bộ.",
          en: "If you need to allow embedding your widget on third-party sites, use <code>frame-ancestors https://trusted-partner.com</code> instead of blanket DENY.",
        },
      ],
    },
    {
      id: "transport-misc",
      title: { vi: "7. Transport & Các biện pháp bảo mật khác", en: "7. Transport & Miscellaneous security measures" },
      blocks: [
        {
          type: "list",
          items: [
            { vi: "<b>HTTPS</b> — mã hóa dữ liệu truyền tải; chứng chỉ TLS/SSL. Không dùng HTTP cho dữ liệu nhạy cảm.", en: "<b>HTTPS</b> — encrypts data in transit via TLS/SSL certificates. Never use HTTP for sensitive data." },
            { vi: "<b>HSTS (HTTP Strict Transport Security)</b> — header <code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code> yêu cầu trình duyệt luôn dùng HTTPS, ngăn downgrade attack.", en: "<b>HSTS (HTTP Strict Transport Security)</b> — the <code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code> header forces the browser to always use HTTPS, preventing downgrade attacks." },
            { vi: "<b>Mixed content</b> — trang HTTPS tải tài nguyên HTTP → trình duyệt chặn hoặc cảnh báo. Đảm bảo mọi tài nguyên đều qua HTTPS.", en: "<b>Mixed content</b> — an HTTPS page loading HTTP resources → browser blocks or warns. Ensure all resources use HTTPS." },
            { vi: "<b>rel=noopener noreferrer</b> — luôn thêm vào &lt;a target=\"_blank\"&gt;. Không có noopener, trang mới có thể truy cập window.opener và điều hướng tab cha (tabnapping).", en: "<b>rel=noopener noreferrer</b> — always add to &lt;a target=\"_blank\"&gt; links. Without noopener, the new page can access window.opener and redirect the parent tab (tabnapping)." },
            { vi: "<b>npm audit / dependency review</b> — theo dõi lỗ hổng trong dependencies. Supply-chain attack (VD: event-stream 2018) đặt backdoor trong package phổ biến.", en: "<b>npm audit / dependency review</b> — monitor vulnerabilities in dependencies. Supply-chain attacks (e.g. event-stream 2018) plant backdoors in popular packages." },
            { vi: "<b>Không lưu secret trong bundle</b> — API key, private key, database URL không được đặt trong frontend JS. Dùng biến môi trường phía server hoặc proxy.", en: "<b>Never embed secrets in the bundle</b> — API keys, private keys, database URLs must not be in frontend JS. Use server-side env vars or a proxy." },
            { vi: "<b>Subresource Integrity (SRI)</b> — thêm <code>integrity=\"sha384-...\"</code> vào &lt;script&gt; và &lt;link&gt; từ CDN để đảm bảo file không bị tamper.", en: "<b>Subresource Integrity (SRI)</b> — add <code>integrity=\"sha384-...\"</code> to &lt;script&gt; and &lt;link&gt; tags from CDNs to ensure files haven't been tampered with." },
          ],
          ordered: false,
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Bảo mật front-end = <b>nhiều lớp phòng thủ</b> (defense in depth): escape output + CSP chống XSS; SameSite + CSRF token chống CSRF; httpOnly cookie bảo vệ token; HTTPS + HSTS bảo vệ truyền tải; noopener chặn tabnapping; npm audit chặn supply-chain. Không có \"viên đạn bạc\" — hãy bật tất cả.",
          en: "Front-end security = <b>defence in depth</b>: output escaping + CSP block XSS; SameSite + CSRF tokens block CSRF; httpOnly cookies protect tokens; HTTPS + HSTS protect transit; noopener blocks tabnapping; npm audit catches supply-chain risk. There is no silver bullet — layer everything.",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "Ba loại XSS khác nhau ở đâu?", en: "How do the three XSS types differ?" },
      back: { vi: "<b>Stored</b>: script lưu DB, phục vụ cho nhiều người. <b>Reflected</b>: script trong URL, server echo ngay. <b>DOM-based</b>: script đọc từ DOM (hash/query), không qua server — WAF không bắt được.", en: "<b>Stored</b>: script in DB, served to many users. <b>Reflected</b>: script in URL, server echoes it. <b>DOM-based</b>: script read from DOM (hash/query), never hits server — WAF can't catch it." },
    },
    {
      front: { vi: "Tại sao dangerouslySetInnerHTML nguy hiểm?", en: "Why is dangerouslySetInnerHTML dangerous?" },
      back: { vi: "Nó bỏ qua cơ chế auto-escape của React, ghi HTML thô vào DOM. Nếu dữ liệu đến từ người dùng mà không sanitize → XSS. Luôn dùng DOMPurify trước khi gán.", en: "It bypasses React's auto-escaping, writing raw HTML into the DOM. If data comes from user input without sanitization → XSS. Always run DOMPurify before assigning." },
    },
    {
      front: { vi: "CSP nonce là gì và nó chặn gì?", en: "What is a CSP nonce and what does it block?" },
      back: { vi: "Chuỗi ngẫu nhiên sinh mỗi request, gắn vào cả header CSP và &lt;script&gt; tag. Chỉ script có đúng nonce được chạy — script bị inject qua XSS không có nonce → bị chặn.", en: "A per-request random string attached to both the CSP header and the &lt;script&gt; tag. Only scripts with the correct nonce run — XSS-injected scripts lack the nonce → blocked." },
    },
    {
      front: { vi: "CSRF tấn công bằng cách nào?", en: "How does a CSRF attack work?" },
      back: { vi: "Lừa trình duyệt nạn nhân (đang đăng nhập) gửi request đến server. Trình duyệt tự gắn cookie → server chấp nhận. Kẻ tấn công không cần đọc response, chỉ cần request được gửi đi.", en: "Tricks the victim's browser (while logged in) into sending a request to the server. The browser auto-attaches cookies → server accepts it. The attacker doesn't need to read the response, only needs the request sent." },
    },
    {
      front: { vi: "SameSite=Lax vs SameSite=Strict?", en: "SameSite=Lax vs SameSite=Strict?" },
      back: { vi: "<b>Strict</b>: không gửi cookie trong bất kỳ cross-site request nào (kể cả link bên ngoài). <b>Lax</b> (mặc định hiện đại): gửi cookie khi người dùng điều hướng bằng GET (click link), nhưng không gửi trong POST ẩn hay iframe. Lax là điểm cân bằng thực tế tốt.", en: "<b>Strict</b>: no cookie on any cross-site request (even top-level link navigation). <b>Lax</b> (modern default): sends cookie on top-level GET navigation (link clicks), but not hidden POST or iframes. Lax is a good practical balance." },
    },
    {
      front: { vi: "Sự khác biệt của CORS là gì — nó bảo vệ ai?", en: "What is CORS protecting — who does it protect?" },
      back: { vi: "CORS là cơ chế của <b>trình duyệt</b>, bảo vệ <b>người dùng</b> khỏi trang độc hại đọc dữ liệu từ origin khác. Không bảo vệ server khỏi curl hay server-to-server request.", en: "CORS is a <b>browser</b> mechanism protecting <b>users</b> from malicious pages reading data from another origin. It does not protect the server from curl or server-to-server requests." },
    },
    {
      front: { vi: "Tại sao Access-Control-Allow-Origin: * không dùng được với credentials?", en: "Why can't Access-Control-Allow-Origin: * be combined with credentials?" },
      back: { vi: "Theo spec, trình duyệt từ chối nếu origin là wildcard * và request có credentials (cookies/auth). Phải khai báo rõ origin cụ thể để gửi credentials.", en: "Per spec, browsers reject the combination of wildcard * and credentialed requests. You must specify an explicit origin to allow credentialed cross-origin requests." },
    },
    {
      front: { vi: "localStorage vs httpOnly cookie để lưu JWT — đánh đổi?", en: "localStorage vs httpOnly cookie for JWT — the trade-off?" },
      back: { vi: "<b>localStorage</b>: dễ dùng, nhưng bất kỳ script nào (kể cả XSS) đọc được. <b>httpOnly cookie</b>: JS không đọc được (XSS safe), nhưng dễ bị CSRF nếu thiếu SameSite. Khuyến nghị: access token trong memory + refresh token trong httpOnly cookie.", en: "<b>localStorage</b>: convenient, but any script (including XSS) can read it. <b>httpOnly cookie</b>: JS can't read it (XSS-safe), but susceptible to CSRF without SameSite. Recommendation: access token in memory + refresh token in httpOnly cookie." },
    },
    {
      front: { vi: "JWT payload có được mã hóa không?", en: "Is the JWT payload encrypted?" },
      back: { vi: "Không — payload chỉ được <b>base64-encoded</b>, bất kỳ ai có token đều decode được. Đừng đặt thông tin nhạy cảm (mật khẩu, số thẻ tín dụng) trong payload. Chữ ký chỉ đảm bảo <b>tính toàn vẹn</b>, không bảo mật nội dung.", en: "No — the payload is only <b>base64-encoded</b>; anyone with the token can decode it. Don't put sensitive data (passwords, card numbers) in the payload. The signature ensures <b>integrity</b>, not confidentiality." },
    },
    {
      front: { vi: "Clickjacking là gì? Cách phòng?", en: "What is clickjacking? How to prevent it?" },
      back: { vi: "Nhúng trang vào iframe ẩn để lừa người dùng click. Phòng bằng <code>X-Frame-Options: DENY</code> hoặc <code>Content-Security-Policy: frame-ancestors 'none'</code>.", en: "Embedding a page in a hidden iframe to trick users into clicking. Prevent with <code>X-Frame-Options: DENY</code> or <code>Content-Security-Policy: frame-ancestors 'none'</code>." },
    },
    {
      front: { vi: "rel=noopener trên target=_blank ngăn gì?", en: "What does rel=noopener on target=_blank prevent?" },
      back: { vi: "Ngăn <b>tabnapping</b>: trang mới được mở có thể truy cập <code>window.opener</code> và chuyển hướng tab cha sang trang giả mạo. noopener đặt window.opener = null.", en: "Prevents <b>tabnapping</b>: the newly opened page can access <code>window.opener</code> and redirect the parent tab to a phishing page. noopener sets window.opener to null." },
    },
    {
      front: { vi: "HSTS làm gì và tại sao cần nó?", en: "What does HSTS do and why is it needed?" },
      back: { vi: "Header <code>Strict-Transport-Security</code> yêu cầu trình duyệt <b>luôn dùng HTTPS</b> trong max-age. Ngăn SSL stripping / downgrade attack — kẻ tấn công không thể ép trình duyệt dùng HTTP.", en: "The <code>Strict-Transport-Security</code> header tells the browser to <b>always use HTTPS</b> for max-age seconds. Prevents SSL stripping / downgrade attacks — an attacker cannot force the browser to fall back to HTTP." },
    },
  ],
  quiz: [
    {
      q: { vi: "Loại XSS nào KHÔNG đi qua server và WAF không bắt được?", en: "Which type of XSS does NOT go through the server and is invisible to a WAF?" },
      options: [
        { vi: "Stored XSS", en: "Stored XSS" },
        { vi: "Reflected XSS", en: "Reflected XSS" },
        { vi: "DOM-based XSS", en: "DOM-based XSS" },
        { vi: "Persistent XSS", en: "Persistent XSS" },
      ],
      answer: 2,
      explain: { vi: "DOM-based XSS đọc và ghi vào DOM hoàn toàn phía client (ví dụ qua location.hash). Request không bao giờ đến server nên WAF và server-side filtering vô hiệu.", en: "DOM-based XSS reads from and writes to the DOM entirely client-side (e.g. via location.hash). The request never reaches the server, so WAF and server-side filtering are ineffective." },
    },
    {
      q: { vi: "Dùng React, dòng code nào có thể gây XSS?", en: "In React, which code can introduce an XSS vulnerability?" },
      options: [
        { vi: "<p>{userInput}</p>", en: "<p>{userInput}</p>" },
        { vi: "dangerouslySetInnerHTML={{ __html: userInput }}", en: "dangerouslySetInnerHTML={{ __html: userInput }}" },
        { vi: "element.textContent = userInput", en: "element.textContent = userInput" },
        { vi: "encodeURIComponent(userInput)", en: "encodeURIComponent(userInput)" },
      ],
      answer: 1,
      explain: { vi: "dangerouslySetInnerHTML bỏ qua auto-escape của React. Ba lựa chọn còn lại đều an toàn: JSX expressions tự escape, textContent không parse HTML, encodeURIComponent encode ký tự đặc biệt.", en: "dangerouslySetInnerHTML bypasses React's auto-escaping. The other three are safe: JSX expressions auto-escape, textContent doesn't parse HTML, and encodeURIComponent encodes special characters." },
    },
    {
      q: { vi: "CSP nonce giúp gì khi trang bị XSS?", en: "How does a CSP nonce help when a page has an XSS vulnerability?" },
      options: [
        { vi: "Mã hóa dữ liệu người dùng trước khi hiển thị", en: "Encrypts user data before display" },
        { vi: "Ngăn script bị inject chạy vì chúng không có nonce hợp lệ", en: "Prevents injected scripts from running because they lack the valid nonce" },
        { vi: "Xóa tất cả thẻ script khỏi trang", en: "Removes all script tags from the page" },
        { vi: "Chặn request đến các domain lạ", en: "Blocks requests to unknown domains" },
      ],
      answer: 1,
      explain: { vi: "Nonce là giá trị bí mật per-request trong header CSP. Chỉ script có &lt;script nonce=\"...\"&gt; đúng giá trị mới được chạy. Script inject qua XSS không có nonce → bị trình duyệt chặn.", en: "A nonce is a per-request secret value in the CSP header. Only scripts with the matching &lt;script nonce=\"...\"&gt; attribute may run. XSS-injected scripts lack the nonce → blocked by the browser." },
    },
    {
      q: { vi: "Điều kiện nào cần thiết để CSRF thành công?", en: "Which condition is necessary for a CSRF attack to succeed?" },
      options: [
        { vi: "Nạn nhân phải cài extension độc hại", en: "The victim must have a malicious browser extension installed" },
        { vi: "Server phải dùng HTTPS", en: "The server must use HTTPS" },
        { vi: "Nạn nhân phải đang đăng nhập và server xác thực qua cookie", en: "The victim must be logged in and the server must authenticate via cookie" },
        { vi: "Kẻ tấn công phải biết mật khẩu nạn nhân", en: "The attacker must know the victim's password" },
      ],
      answer: 2,
      explain: { vi: "CSRF lợi dụng việc trình duyệt tự đính kèm cookie. Cần: nạn nhân đang đăng nhập (có cookie hợp lệ) VÀ server tin vào cookie đó. Không cần biết mật khẩu hay extension.", en: "CSRF exploits the browser automatically attaching cookies. Requirements: the victim is logged in (valid cookie exists) AND the server trusts that cookie. No password or extension knowledge needed." },
    },
    {
      q: { vi: "Thuộc tính SameSite=Lax trên cookie ngăn điều gì?", en: "What does the SameSite=Lax cookie attribute prevent?" },
      options: [
        { vi: "Script đọc giá trị cookie", en: "Scripts reading the cookie value" },
        { vi: "Cookie gửi trong cross-site POST request ẩn (form ẩn, iframe)", en: "Cookie being sent in hidden cross-site POST requests (hidden forms, iframes)" },
        { vi: "Cookie gửi khi người dùng click link đến site", en: "Cookie being sent when the user clicks a link to the site" },
        { vi: "HTTPS downgrade", en: "HTTPS downgrade" },
      ],
      answer: 1,
      explain: { vi: "SameSite=Lax cho phép gửi cookie khi người dùng điều hướng bằng GET (top-level navigation), nhưng KHÔNG gửi trong cross-site POST, iframe, hoặc XMLHttpRequest — chặn phần lớn CSRF attack.", en: "SameSite=Lax allows the cookie on top-level GET navigation (link clicks) but NOT on cross-site POST, iframes, or XMLHttpRequest — blocking most CSRF vectors." },
    },
    {
      q: { vi: "Khi nào trình duyệt gửi preflight OPTIONS request trong CORS?", en: "When does the browser send a CORS preflight OPTIONS request?" },
      options: [
        { vi: "Mọi request cross-origin", en: "Every cross-origin request" },
        { vi: "Chỉ với GET và POST đơn giản", en: "Only for simple GET and POST requests" },
        { vi: "Với \"non-simple\" request: phương thức PUT/DELETE, hoặc có custom header", en: "For \"non-simple\" requests: PUT/DELETE method, or custom headers present" },
        { vi: "Chỉ khi credentials được gửi", en: "Only when credentials are sent" },
      ],
      answer: 2,
      explain: { vi: "\"Simple\" request (GET/POST với header chuẩn và content-type thông thường) không cần preflight. Mọi thứ ngoài đó (PUT, DELETE, Authorization header, content-type=application/json) đều trigger preflight OPTIONS.", en: "\"Simple\" requests (GET/POST with standard headers and common content types) skip preflight. Everything else (PUT, DELETE, Authorization header, content-type=application/json) triggers an OPTIONS preflight." },
    },
    {
      q: { vi: "Lý do chính KHÔNG nên lưu JWT access token trong localStorage là gì?", en: "The main reason NOT to store a JWT access token in localStorage is?" },
      options: [
        { vi: "localStorage chậm hơn cookie", en: "localStorage is slower than cookies" },
        { vi: "Mọi script trên trang đó đều đọc được localStorage — XSS có thể đánh cắp token", en: "Any script on the page can read localStorage — XSS can steal the token" },
        { vi: "localStorage bị xóa khi đóng tab", en: "localStorage is cleared when the tab closes" },
        { vi: "Trình duyệt Safari không hỗ trợ localStorage", en: "Safari doesn't support localStorage" },
      ],
      answer: 1,
      explain: { vi: "localStorage không có cơ chế httpOnly — bất kỳ script nào (kể cả script bị inject bởi XSS) đều gọi được localStorage.getItem(). Token bị đánh cắp = session hijacking.", en: "localStorage has no httpOnly mechanism — any script (including XSS-injected scripts) can call localStorage.getItem(). Stolen token = session hijacking." },
    },
    {
      q: { vi: "Header nào ngăn trang web của bạn bị nhúng trong iframe của site khác?", en: "Which header prevents your page from being embedded in an iframe on another site?" },
      options: [
        { vi: "Strict-Transport-Security", en: "Strict-Transport-Security" },
        { vi: "X-Content-Type-Options", en: "X-Content-Type-Options" },
        { vi: "X-Frame-Options: DENY", en: "X-Frame-Options: DENY" },
        { vi: "Access-Control-Allow-Origin: *", en: "Access-Control-Allow-Origin: *" },
      ],
      answer: 2,
      explain: { vi: "X-Frame-Options: DENY (hoặc CSP frame-ancestors 'none') ngăn trình duyệt render trang trong &lt;iframe&gt;, &lt;frame&gt;, &lt;embed&gt; — phòng chống clickjacking.", en: "X-Frame-Options: DENY (or CSP frame-ancestors 'none') prevents the browser from rendering the page inside &lt;iframe&gt;, &lt;frame&gt;, &lt;embed&gt; — the clickjacking defence." },
    },
    {
      q: { vi: "rel=\"noopener\" trên thẻ &lt;a target='_blank'&gt; ngăn điều gì?", en: "What does rel=\"noopener\" on an &lt;a target='_blank'&gt; tag prevent?" },
      options: [
        { vi: "Trang mới bị index bởi search engine", en: "The new page being indexed by search engines" },
        { vi: "Trang mới truy cập window.opener và điều hướng tab cha (tabnapping)", en: "The new page accessing window.opener and redirecting the parent tab (tabnapping)" },
        { vi: "Cookie bị gửi đến trang mới", en: "Cookies being sent to the new page" },
        { vi: "Trang mới tải các script từ CDN", en: "The new page loading scripts from CDN" },
      ],
      answer: 1,
      explain: { vi: "Không có noopener, trang được mở có thể gọi window.opener.location = 'https://phishing.com' để chuyển hướng tab ban đầu sang trang giả. noopener đặt window.opener = null.", en: "Without noopener, the opened page can call window.opener.location = 'https://phishing.com' to redirect the original tab to a phishing page. noopener sets window.opener to null." },
    },
    {
      q: { vi: "Phòng chống supply-chain attack trong frontend hiệu quả nhất là gì?", en: "The most effective front-end supply-chain attack mitigation is?" },
      options: [
        { vi: "Dùng TypeScript thay JavaScript", en: "Using TypeScript instead of JavaScript" },
        { vi: "Chỉ dùng npm packages nổi tiếng", en: "Only using popular npm packages" },
        { vi: "Chạy npm audit thường xuyên, pin phiên bản, dùng SRI cho CDN scripts, review dependency mới", en: "Running npm audit regularly, pinning versions, using SRI for CDN scripts, and reviewing new dependencies" },
        { vi: "Minify và obfuscate bundle", en: "Minifying and obfuscating the bundle" },
      ],
      answer: 2,
      explain: { vi: "Supply-chain attack nhắm vào dependencies, không phải code của bạn. Kết hợp: npm audit (phát hiện CVE), lock files (pin phiên bản), SRI (detect tampered CDN files), review kỹ dependency mới.", en: "Supply-chain attacks target your dependencies, not your own code. Combine: npm audit (detect CVEs), lock files (pin versions), SRI (detect tampered CDN files), and careful review of new dependencies." },
    },
  ],
});
