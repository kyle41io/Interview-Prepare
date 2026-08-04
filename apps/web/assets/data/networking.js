/* Networking — Computer Networking reference */
PREP.register({
  id: "networking",
  icon: "🌐",
  category: "cs",
  title: { vi: "Mạng máy tính", en: "Computer Networking" },
  blurb: {
    vi: "Kiến thức nền về mạng được hỏi nhiều trong phỏng vấn backend và system design: mô hình OSI/TCP-IP, TCP vs UDP, IP/DNS, HTTP/HTTPS, TLS và các chiến lược mở rộng hệ thống.",
    en: "Core networking knowledge frequently tested in backend and system design interviews: OSI/TCP-IP models, TCP vs UDP, IP/DNS, HTTP/HTTPS, TLS, and scaling strategies.",
  },
  sections: [
    {
      id: "osi-tcpip",
      title: { vi: "1. Mô hình OSI vs TCP/IP", en: "1. OSI Model vs TCP/IP Model" },
      blocks: [
        {
          type: "prose",
          vi: "Hai mô hình phân tầng mô tả cách dữ liệu truyền qua mạng. <b>OSI</b> (7 tầng) là mô hình lý thuyết chuẩn; <b>TCP/IP</b> (4 tầng) là mô hình thực tế internet dùng hàng ngày.",
          en: "Two layered models describe how data travels across a network. <b>OSI</b> (7 layers) is the canonical theoretical model; <b>TCP/IP</b> (4 layers) is the practical model the internet actually uses.",
        },
        {
          type: "table",
          headers: { vi: ["OSI tầng", "Tên OSI", "TCP/IP tầng", "Giao thức / ví dụ"], en: ["OSI Layer", "OSI Name", "TCP/IP Layer", "Protocol / Example"] },
          rows: [
            { vi: ["7", "Application (Ứng dụng)", "Application", "HTTP, HTTPS, DNS, FTP, SMTP, WebSocket"], en: ["7", "Application", "Application", "HTTP, HTTPS, DNS, FTP, SMTP, WebSocket"] },
            { vi: ["6", "Presentation (Trình bày)", "Application", "TLS/SSL, JSON, JPEG, UTF-8 encoding"], en: ["6", "Presentation", "Application", "TLS/SSL, JSON, JPEG, UTF-8 encoding"] },
            { vi: ["5", "Session (Phiên)", "Application", "RPC, NetBIOS, quản lý phiên kết nối"], en: ["5", "Session", "Application", "RPC, NetBIOS, session management"] },
            { vi: ["4", "Transport (Vận chuyển)", "Transport", "TCP, UDP — port nguồn/đích, phân đoạn"], en: ["4", "Transport", "Transport", "TCP, UDP — source/dest ports, segmentation"] },
            { vi: ["3", "Network (Mạng)", "Internet", "IP (IPv4/IPv6), ICMP, routing"], en: ["3", "Network", "Internet", "IP (IPv4/IPv6), ICMP, routing"] },
            { vi: ["2", "Data Link (Liên kết dữ liệu)", "Network Access", "Ethernet, Wi-Fi (802.11), MAC address, ARP"], en: ["2", "Data Link", "Network Access", "Ethernet, Wi-Fi (802.11), MAC address, ARP"] },
            { vi: ["1", "Physical (Vật lý)", "Network Access", "Cáp đồng, cáp quang, tín hiệu điện/sóng radio"], en: ["1", "Physical", "Network Access", "Copper cable, fiber optic, electrical/radio signals"] },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Mẹo nhớ 7 tầng OSI (từ dưới lên): <b>P</b>lease <b>D</b>o <b>N</b>ot <b>T</b>hrow <b>S</b>ausage <b>P</b>izza <b>A</b>way → Physical, Data Link, Network, Transport, Session, Presentation, Application.",
          en: "Mnemonic for 7 OSI layers (bottom to top): <b>P</b>lease <b>D</b>o <b>N</b>ot <b>T</b>hrow <b>S</b>ausage <b>P</b>izza <b>A</b>way → Physical, Data Link, Network, Transport, Session, Presentation, Application.",
        },
        {
          type: "callout",
          variant: "key",
          vi: "Phỏng vấn hay hỏi: \"HTTP hoạt động ở tầng nào?\" (tầng 7 — Application). Load balancer L4 hoạt động ở tầng Transport (dựa vào IP+port); L7 hoạt động ở tầng Application (dựa vào URL, header, cookie).",
          en: "Interviews often ask: \"Which layer does HTTP operate at?\" (Layer 7 — Application). L4 load balancers work at the Transport layer (IP+port); L7 load balancers work at the Application layer (URL, headers, cookies).",
        },
      ],
    },
    {
      id: "tcp-udp",
      title: { vi: "2. TCP vs UDP", en: "2. TCP vs UDP" },
      blocks: [
        {
          type: "prose",
          vi: "<b>TCP</b> (Transmission Control Protocol) đảm bảo giao dữ liệu <b>đúng thứ tự, không mất mát</b> qua bắt tay 3 bước. <b>UDP</b> (User Datagram Protocol) gửi nhanh hơn nhưng <b>không đảm bảo</b> thứ tự hay nhận được.",
          en: "<b>TCP</b> (Transmission Control Protocol) guarantees <b>ordered, reliable</b> delivery via a 3-way handshake. <b>UDP</b> (User Datagram Protocol) is faster but provides <b>no ordering or delivery guarantee</b>.",
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>TCP 3-way handshake:</b> (1) Client gửi <code>SYN</code>; (2) Server trả <code>SYN-ACK</code>; (3) Client gửi <code>ACK</code>. Sau đó kết nối được thiết lập và có thể truyền dữ liệu.",
          en: "<b>TCP 3-way handshake:</b> (1) Client sends <code>SYN</code>; (2) Server replies <code>SYN-ACK</code>; (3) Client sends <code>ACK</code>. Connection is then established and data transfer begins.",
        },
        {
          type: "table",
          headers: { vi: ["Tiêu chí", "TCP", "UDP"], en: ["Feature", "TCP", "UDP"] },
          rows: [
            { vi: ["Độ tin cậy", "Đảm bảo (retransmit khi mất)", "Không đảm bảo (fire-and-forget)"], en: ["Reliability", "Guaranteed (retransmits lost data)", "No guarantee (fire-and-forget)"] },
            { vi: ["Thứ tự", "Đúng thứ tự (sequence numbers)", "Không đảm bảo thứ tự"], en: ["Ordering", "In-order (sequence numbers)", "No ordering guarantee"] },
            { vi: ["Kết nối", "Connection-oriented (3-way handshake)", "Connectionless (stateless)"], en: ["Connection", "Connection-oriented (3-way handshake)", "Connectionless (stateless)"] },
            { vi: ["Flow control", "Có (sliding window)", "Không có"], en: ["Flow control", "Yes (sliding window)", "None"] },
            { vi: ["Congestion control", "Có (slow-start, AIMD)", "Không có"], en: ["Congestion control", "Yes (slow-start, AIMD)", "None"] },
            { vi: ["Tốc độ", "Chậm hơn (overhead header + ACK)", "Nhanh hơn (header nhỏ 8 byte)"], en: ["Speed", "Slower (header overhead + ACKs)", "Faster (minimal 8-byte header)"] },
            { vi: ["Dùng khi", "HTTP/HTTPS, email, file transfer, SSH", "Video streaming, VoIP, DNS, game online"], en: ["Use when", "HTTP/HTTPS, email, file transfer, SSH", "Video/audio streaming, VoIP, DNS, online gaming"] },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Quy tắc chọn: nếu mất một gói tin là <b>không chấp nhận được</b> → dùng TCP. Nếu <b>độ trễ thấp quan trọng hơn</b> độ chính xác tuyệt đối (ví dụ: cuộc gọi video — bỏ qua 1 frame còn hơn dừng lại) → dùng UDP.",
          en: "Rule of thumb: if dropping a packet is <b>unacceptable</b> → use TCP. If <b>low latency matters more</b> than perfection (e.g. video call — skip a frame rather than freeze) → use UDP.",
        },
      ],
    },
    {
      id: "ip-addressing",
      title: { vi: "3. Địa chỉ IP, Cổng và NAT", en: "3. IP Addressing, Ports, and NAT" },
      blocks: [
        {
          type: "prose",
          vi: "Địa chỉ IP định danh thiết bị trên mạng. <b>IPv4</b> dùng 32-bit (ví dụ: <code>192.168.1.1</code>); <b>IPv6</b> dùng 128-bit (<code>2001:db8::1</code>) để giải quyết cạn kiệt IPv4. <b>Cổng (port)</b> định danh tiến trình/dịch vụ trên thiết bị (0–65535).",
          en: "IP addresses identify devices on a network. <b>IPv4</b> uses 32 bits (e.g. <code>192.168.1.1</code>); <b>IPv6</b> uses 128 bits (<code>2001:db8::1</code>) to address IPv4 exhaustion. <b>Ports</b> identify processes/services on a device (0–65535).",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Địa chỉ private (RFC 1918):</b> <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code> — chỉ dùng trong mạng nội bộ, không route được trên internet.", en: "<b>Private addresses (RFC 1918):</b> <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code> — internal use only, not routable on the public internet." },
            { vi: "<b>Localhost:</b> <code>127.0.0.1</code> (IPv4) hoặc <code>::1</code> (IPv6) — trỏ về chính máy tính đó (loopback).", en: "<b>Localhost:</b> <code>127.0.0.1</code> (IPv4) or <code>::1</code> (IPv6) — points back to the machine itself (loopback)." },
            { vi: "<b>NAT (Network Address Translation):</b> bộ định tuyến ánh xạ nhiều địa chỉ private sang một địa chỉ public, giúp tiết kiệm IPv4 nhưng làm phức tạp peer-to-peer.", en: "<b>NAT (Network Address Translation):</b> a router maps many private addresses to one public address, conserving IPv4 but complicating peer-to-peer connections." },
            { vi: "<b>CIDR (Classless Inter-Domain Routing):</b> ký hiệu <code>192.168.1.0/24</code> — phần <code>/24</code> nghĩa là 24 bit đầu là network prefix, còn lại 8 bit cho 256 địa chỉ host.", en: "<b>CIDR:</b> notation <code>192.168.1.0/24</code> — the <code>/24</code> means 24 bits are the network prefix, leaving 8 bits for 256 host addresses." },
            { vi: "<b>Port quan trọng cần nhớ:</b> 80 (HTTP), 443 (HTTPS), 22 (SSH), 53 (DNS), 25 (SMTP), 3306 (MySQL), 5432 (PostgreSQL), 6379 (Redis).", en: "<b>Important ports to know:</b> 80 (HTTP), 443 (HTTPS), 22 (SSH), 53 (DNS), 25 (SMTP), 3306 (MySQL), 5432 (PostgreSQL), 6379 (Redis)." },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Đừng nhầm: subnet mask <code>/24</code> cho 254 host <b>có thể dùng</b> (không tính network address và broadcast address). Câu hỏi phỏng vấn đôi khi hỏi \"bao nhiêu host trong /24?\" → 254.",
          en: "Don't confuse: a <code>/24</code> subnet provides 254 <b>usable</b> hosts (excluding the network address and broadcast address). Interviews sometimes ask \"how many hosts in a /24?\" → 254.",
        },
      ],
    },
    {
      id: "dns",
      title: { vi: "4. DNS — Hệ thống phân giải tên miền", en: "4. DNS — Domain Name System" },
      blocks: [
        {
          type: "prose",
          vi: "DNS dịch tên miền dễ nhớ (<code>example.com</code>) thành địa chỉ IP mà máy tính hiểu. Quá trình phân giải gồm nhiều bước, có <b>cache</b> ở nhiều tầng để tăng tốc.",
          en: "DNS translates human-readable domain names (<code>example.com</code>) into IP addresses computers understand. Resolution involves multiple steps, with <b>caching</b> at several layers to speed things up.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            { vi: "Trình duyệt kiểm tra <b>cache local</b> (OS cache / browser cache).", en: "Browser checks the <b>local cache</b> (OS cache / browser cache)." },
            { vi: "Nếu không có, hỏi <b>Recursive Resolver</b> (thường do ISP hoặc 8.8.8.8 Google cung cấp).", en: "If not cached, query the <b>Recursive Resolver</b> (usually provided by ISP or e.g. Google 8.8.8.8)." },
            { vi: "Resolver hỏi <b>Root Name Server</b> (.) → được giới thiệu đến TLD server (<code>.com</code>, <code>.vn</code>…).", en: "Resolver asks a <b>Root Name Server</b> (.) → referred to the TLD server (<code>.com</code>, <code>.vn</code>, etc.)." },
            { vi: "TLD server giới thiệu đến <b>Authoritative Name Server</b> của domain (lưu bản ghi thực tế).", en: "TLD server refers to the domain's <b>Authoritative Name Server</b> (which holds the actual records)." },
            { vi: "Authoritative NS trả về địa chỉ IP. Resolver <b>cache</b> kết quả theo TTL rồi trả về cho client.", en: "Authoritative NS returns the IP address. Resolver <b>caches</b> the result per TTL then returns it to the client." },
          ],
        },
        {
          type: "table",
          headers: { vi: ["Loại bản ghi", "Dùng để"], en: ["Record Type", "Purpose"] },
          rows: [
            { vi: ["A", "Ánh xạ domain → địa chỉ IPv4"], en: ["A", "Maps domain → IPv4 address"] },
            { vi: ["AAAA", "Ánh xạ domain → địa chỉ IPv6"], en: ["AAAA", "Maps domain → IPv6 address"] },
            { vi: ["CNAME", "Alias: domain này trỏ về domain khác (VD: www → example.com)"], en: ["CNAME", "Alias: this domain points to another domain (e.g. www → example.com)"] },
            { vi: ["MX", "Mail Exchange: máy chủ nhận email cho domain"], en: ["MX", "Mail Exchange: which server handles email for the domain"] },
            { vi: ["TXT", "Dữ liệu văn bản tuỳ ý — dùng cho SPF, DKIM, xác minh domain"], en: ["TXT", "Arbitrary text — used for SPF, DKIM, domain verification"] },
            { vi: ["NS", "Chỉ định Authoritative Name Server cho domain"], en: ["NS", "Specifies the Authoritative Name Servers for a domain"] },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>TTL (Time To Live):</b> bao lâu (giây) bản ghi DNS được cache trước khi cần tra lại. TTL thấp (60s) → thay đổi IP nhanh nhưng tốn nhiều truy vấn. TTL cao (86400s = 1 ngày) → ít truy vấn nhưng thay đổi lan truyền chậm.",
          en: "<b>TTL (Time To Live):</b> how long (seconds) a DNS record is cached before re-querying. Low TTL (60s) → fast IP changes but more queries. High TTL (86400s = 1 day) → fewer queries but slow propagation of changes.",
        },
      ],
    },
    {
      id: "http-https",
      title: { vi: "5. HTTP/HTTPS — Phiên bản và đặc điểm", en: "5. HTTP/HTTPS — Versions and Key Features" },
      blocks: [
        {
          type: "prose",
          vi: "HTTP (HyperText Transfer Protocol) là giao thức tầng ứng dụng cho web. HTTPS = HTTP + TLS (mã hóa). Ba phiên bản chính có sự khác biệt quan trọng về hiệu năng.",
          en: "HTTP (HyperText Transfer Protocol) is the application-layer protocol for the web. HTTPS = HTTP + TLS (encryption). Three major versions have important performance differences.",
        },
        {
          type: "table",
          headers: { vi: ["Phương thức", "Ý nghĩa", "Idempotent?", "Có body?"], en: ["Method", "Meaning", "Idempotent?", "Has Body?"] },
          rows: [
            { vi: ["GET", "Lấy tài nguyên", "Có", "Không (thường)"], en: ["GET", "Retrieve resource", "Yes", "No (usually)"] },
            { vi: ["POST", "Tạo mới / gửi dữ liệu", "Không", "Có"], en: ["POST", "Create / submit data", "No", "Yes"] },
            { vi: ["PUT", "Thay thế toàn bộ tài nguyên", "Có", "Có"], en: ["PUT", "Replace entire resource", "Yes", "Yes"] },
            { vi: ["PATCH", "Cập nhật một phần tài nguyên", "Không (thường)", "Có"], en: ["PATCH", "Partial update of resource", "No (usually)", "Yes"] },
            { vi: ["DELETE", "Xóa tài nguyên", "Có", "Không (thường)"], en: ["DELETE", "Delete resource", "Yes", "No (usually)"] },
            { vi: ["HEAD", "Giống GET nhưng chỉ trả header", "Có", "Không"], en: ["HEAD", "Like GET but headers only", "Yes", "No"] },
            { vi: ["OPTIONS", "Hỏi các phương thức được hỗ trợ (CORS preflight)", "Có", "Không"], en: ["OPTIONS", "Query supported methods (CORS preflight)", "Yes", "No"] },
          ],
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>1xx Informational:</b> 100 Continue — server đã nhận phần đầu, tiếp tục gửi.", en: "<b>1xx Informational:</b> 100 Continue — server received headers, continue sending." },
            { vi: "<b>2xx Success:</b> 200 OK, 201 Created, 204 No Content.", en: "<b>2xx Success:</b> 200 OK, 201 Created, 204 No Content." },
            { vi: "<b>3xx Redirect:</b> 301 Moved Permanently, 302 Found (tạm thời), 304 Not Modified (cache hit).", en: "<b>3xx Redirect:</b> 301 Moved Permanently, 302 Found (temporary), 304 Not Modified (cache hit)." },
            { vi: "<b>4xx Client Error:</b> 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests.", en: "<b>4xx Client Error:</b> 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests." },
            { vi: "<b>5xx Server Error:</b> 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout.", en: "<b>5xx Server Error:</b> 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout." },
          ],
        },
        {
          type: "table",
          headers: { vi: ["Phiên bản", "Đặc điểm chính", "Cơ chế nổi bật"], en: ["Version", "Key Characteristic", "Notable Mechanism"] },
          rows: [
            { vi: ["HTTP/1.1", "Persistent connections (keep-alive), pipeline (thực tế ít dùng)", "Head-of-line blocking: chờ từng request"], en: ["HTTP/1.1", "Persistent connections (keep-alive), pipelining (rarely used in practice)", "Head-of-line blocking: must wait for each request"] },
            { vi: ["HTTP/2", "Multiplexing — nhiều stream trên 1 TCP connection, header compression (HPACK), server push", "Giải quyết HOL blocking ở tầng HTTP; vẫn có TCP HOL blocking"], en: ["HTTP/2", "Multiplexing — multiple streams over one TCP connection, header compression (HPACK), server push", "Resolves HTTP HOL blocking; TCP HOL blocking remains"] },
            { vi: ["HTTP/3", "Chạy trên QUIC (UDP), mã hóa mặc định, 0-RTT reconnect", "Không có TCP HOL blocking; nhanh hơn trên mạng kém"], en: ["HTTP/3", "Runs over QUIC (UDP), encryption by default, 0-RTT reconnect", "No TCP HOL blocking; faster on lossy networks"] },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Cookie được gửi tự động trong mỗi request đến đúng domain. Header <code>Set-Cookie</code> (server → client) và <code>Cookie</code> (client → server). Dùng <code>HttpOnly</code> chặn JS đọc cookie; <code>Secure</code> chỉ gửi qua HTTPS; <code>SameSite</code> chống CSRF.",
          en: "Cookies are automatically sent with every request to the matching domain. <code>Set-Cookie</code> header (server → client); <code>Cookie</code> header (client → server). Use <code>HttpOnly</code> to block JS access; <code>Secure</code> to send only over HTTPS; <code>SameSite</code> to prevent CSRF.",
        },
      ],
    },
    {
      id: "tls",
      title: { vi: "6. TLS — Bắt tay mã hóa", en: "6. TLS — Encryption Handshake" },
      blocks: [
        {
          type: "prose",
          vi: "TLS (Transport Layer Security) cung cấp <b>3 đảm bảo</b> cho kết nối: <b>Confidentiality</b> (mã hóa — kẻ nghe không đọc được), <b>Integrity</b> (MAC — dữ liệu không bị sửa), <b>Authentication</b> (certificate — xác thực server thật sự là ai).",
          en: "TLS (Transport Layer Security) provides <b>3 guarantees</b>: <b>Confidentiality</b> (encryption — eavesdroppers can't read data), <b>Integrity</b> (MAC — data isn't tampered with), <b>Authentication</b> (certificate — server is who it claims to be).",
        },
        {
          type: "list",
          ordered: true,
          items: [
            { vi: "Client gửi <code>ClientHello</code>: phiên bản TLS, các cipher suite hỗ trợ, client random.", en: "Client sends <code>ClientHello</code>: TLS version, supported cipher suites, client random." },
            { vi: "Server gửi <code>ServerHello</code>: cipher suite đã chọn, server random, <b>certificate</b> (chứa public key).", en: "Server sends <code>ServerHello</code>: chosen cipher suite, server random, <b>certificate</b> (contains public key)." },
            { vi: "Client <b>xác thực certificate</b>: kiểm tra chữ ký của CA (Certificate Authority) có trong trusted store của OS.", en: "Client <b>validates the certificate</b>: checks the CA (Certificate Authority) signature against the OS trusted store." },
            { vi: "Client và server trao đổi để tạo <b>session key</b> đối xứng (dùng Diffie-Hellman hoặc RSA key exchange).", en: "Client and server exchange to derive a shared <b>session key</b> (via Diffie-Hellman or RSA key exchange)." },
            { vi: "Từ đây tất cả dữ liệu được mã hóa bằng <b>mã đối xứng</b> (AES) dùng session key — nhanh hơn bất đối xứng nhiều.", en: "All subsequent data is encrypted with <b>symmetric encryption</b> (AES) using the session key — much faster than asymmetric." },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>Asymmetric vs Symmetric:</b> Bất đối xứng (RSA, ECC) dùng cặp public/private key — an toàn để trao đổi key nhưng <b>chậm</b>. Đối xứng (AES) dùng một key dùng chung — <b>nhanh</b> nhưng cần trao đổi key an toàn trước. TLS dùng bất đối xứng <b>chỉ để bootstrap</b> session key, rồi chuyển sang đối xứng.",
          en: "<b>Asymmetric vs Symmetric:</b> Asymmetric (RSA, ECC) uses a public/private key pair — secure for key exchange but <b>slow</b>. Symmetric (AES) uses one shared key — <b>fast</b> but requires secure key exchange first. TLS uses asymmetric <b>only to bootstrap</b> the session key, then switches to symmetric.",
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Certificate không đủ — bạn cũng cần kiểm tra <b>certificate chain</b> (từ leaf certificate đến root CA). MITM attack xảy ra khi client chấp nhận certificate giả mạo (ví dụ: không kiểm tra chain, hoặc trust store bị nhiễm).",
          en: "A certificate alone isn't enough — you also need to verify the <b>certificate chain</b> (from the leaf certificate up to a root CA). MITM attacks succeed when a client accepts a forged certificate (e.g. skipping chain validation, or a poisoned trust store).",
        },
      ],
    },
    {
      id: "scaling",
      title: { vi: "7. Mở rộng hệ thống mạng", en: "7. Scaling the Network Layer" },
      blocks: [
        {
          type: "prose",
          vi: "Khi lưu lượng tăng, cần các chiến lược phân tán tải và đưa nội dung đến gần người dùng hơn. Đây là kiến thức cốt lõi của <b>System Design interviews</b>.",
          en: "As traffic grows, you need strategies to distribute load and bring content closer to users. This is core <b>System Design interview</b> knowledge.",
        },
        {
          type: "table",
          headers: { vi: ["Kỹ thuật", "Tầng OSI", "Cách hoạt động", "Ưu điểm"], en: ["Technique", "OSI Layer", "How It Works", "Advantage"] },
          rows: [
            { vi: ["Load Balancer L4", "Transport (4)", "Phân tải dựa vào IP+port, không đọc payload", "Nhanh, đơn giản, không cần parse HTTP"], en: ["L4 Load Balancer", "Transport (4)", "Distributes by IP+port, doesn't inspect payload", "Fast, simple, no HTTP parsing"] },
            { vi: ["Load Balancer L7", "Application (7)", "Phân tải dựa vào URL/header/cookie/content", "Routing thông minh, canary deploy, A/B testing"], en: ["L7 Load Balancer", "Application (7)", "Routes by URL/header/cookie/content", "Smart routing, canary deploys, A/B testing"] },
            { vi: ["CDN", "Application (7)", "Lưu cache nội dung tĩnh ở PoP gần người dùng nhất", "Giảm độ trễ, tiết kiệm băng thông origin server"], en: ["CDN", "Application (7)", "Caches static content at PoPs closest to the user", "Reduces latency, saves origin bandwidth"] },
            { vi: ["Reverse Proxy", "Application (7)", "Đứng trước server, xử lý TLS, cache, gzip", "Bảo vệ backend, tập trung TLS termination"], en: ["Reverse Proxy", "Application (7)", "Sits in front of servers, handles TLS, caching, gzip", "Protects backend, centralizes TLS termination"] },
          ],
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Keep-alive connections:</b> tái sử dụng TCP connection thay vì mở mới mỗi request (TCP handshake tốn ~1 RTT). HTTP/1.1 mặc định keep-alive; HTTP/2 đã multiplexed.", en: "<b>Keep-alive connections:</b> reuse a TCP connection instead of opening a new one per request (TCP handshake costs ~1 RTT). HTTP/1.1 defaults to keep-alive; HTTP/2 is multiplexed." },
            { vi: "<b>Caching headers:</b> <code>Cache-Control: max-age=3600</code> cho phép browser/CDN cache; <code>ETag</code> + <code>If-None-Match</code> cho conditional requests (304 Not Modified).", en: "<b>Caching headers:</b> <code>Cache-Control: max-age=3600</code> lets browsers/CDNs cache; <code>ETag</code> + <code>If-None-Match</code> enable conditional requests (304 Not Modified)." },
            { vi: "<b>Thuật toán phân tải:</b> Round Robin (lần lượt), Least Connections (ít kết nối nhất), IP Hash (cùng client → cùng server, sticky session), Weighted Round Robin.", en: "<b>Load balancing algorithms:</b> Round Robin (sequential), Least Connections (fewest active), IP Hash (same client → same server, sticky sessions), Weighted Round Robin." },
            { vi: "<b>Health checks:</b> LB định kỳ ping backend (HTTP GET /health); nếu fail thì loại khỏi pool tự động.", en: "<b>Health checks:</b> the LB periodically probes backends (HTTP GET /health); failing backends are automatically removed from the pool." },
          ],
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Mạng máy tính = <b>phân tầng + trừu tượng hóa</b>: mỗi tầng chỉ biết tầng ngay trên/dưới nó. HTTP không biết TCP; TCP không biết IP; IP không biết Ethernet. Hiểu được điều này là nắm chắc mô hình OSI và có thể debug bất kỳ vấn đề mạng nào.",
          en: "Networking = <b>layering + abstraction</b>: each layer only knows the layer directly above and below it. HTTP doesn't know TCP; TCP doesn't know IP; IP doesn't know Ethernet. Understanding this is the key to the OSI model and debugging any network issue.",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "7 tầng OSI từ dưới lên là gì?", en: "What are the 7 OSI layers from bottom to top?" },
      back: { vi: "<b>Physical → Data Link → Network → Transport → Session → Presentation → Application</b>. Nhớ: Please Do Not Throw Sausage Pizza Away.", en: "<b>Physical → Data Link → Network → Transport → Session → Presentation → Application</b>. Mnemonic: Please Do Not Throw Sausage Pizza Away." },
    },
    {
      front: { vi: "TCP bắt tay 3 bước là gì?", en: "What is the TCP 3-way handshake?" },
      back: { vi: "Client gửi <b>SYN</b> → Server trả <b>SYN-ACK</b> → Client gửi <b>ACK</b>. Sau đó kết nối được thiết lập. Tốn ~1 RTT.", en: "Client sends <b>SYN</b> → Server replies <b>SYN-ACK</b> → Client sends <b>ACK</b>. Connection is then established. Costs ~1 RTT." },
    },
    {
      front: { vi: "Khi nào dùng UDP thay TCP?", en: "When should you use UDP instead of TCP?" },
      back: { vi: "Khi <b>độ trễ thấp quan trọng hơn độ chính xác tuyệt đối</b>: video streaming, VoIP, game online, DNS. UDP header chỉ 8 byte, không có overhead ACK/retransmit.", en: "When <b>low latency matters more than absolute reliability</b>: video streaming, VoIP, online gaming, DNS. UDP header is just 8 bytes with no ACK/retransmit overhead." },
    },
    {
      front: { vi: "CIDR /24 cho phép bao nhiêu host?", en: "How many usable hosts does a /24 CIDR block provide?" },
      back: { vi: "<b>254 host</b> (256 − 2: trừ network address và broadcast address). /24 = 24 bit network prefix, 8 bit host = 2^8 = 256 địa chỉ tổng.", en: "<b>254 usable hosts</b> (256 − 2: minus network address and broadcast address). /24 = 24-bit prefix, 8-bit host = 2^8 = 256 total addresses." },
    },
    {
      front: { vi: "Thứ tự phân giải DNS khi truy cập example.com?", en: "What is the DNS resolution order when visiting example.com?" },
      back: { vi: "Local cache → Recursive Resolver → Root NS → TLD NS (.com) → Authoritative NS → trả về IP. Kết quả được cache theo TTL.", en: "Local cache → Recursive Resolver → Root NS → TLD NS (.com) → Authoritative NS → returns IP. Result is cached per TTL." },
    },
    {
      front: { vi: "CNAME record là gì? Khác A record thế nào?", en: "What is a CNAME record? How does it differ from an A record?" },
      back: { vi: "<b>A record</b> ánh xạ domain → địa chỉ IPv4. <b>CNAME</b> ánh xạ domain → domain khác (alias). CNAME không thể dùng ở apex domain (ví dụ: không thể CNAME example.com, chỉ www.example.com).", en: "<b>A record</b> maps domain → IPv4 address. <b>CNAME</b> maps domain → another domain (alias). CNAME cannot be used at the zone apex (e.g. can't CNAME example.com itself, only www.example.com)." },
    },
    {
      front: { vi: "HTTP/2 cải thiện gì so với HTTP/1.1?", en: "What does HTTP/2 improve over HTTP/1.1?" },
      back: { vi: "<b>Multiplexing</b> (nhiều request/response song song trên 1 TCP conn), <b>header compression</b> (HPACK), <b>server push</b>. Loại bỏ head-of-line blocking ở tầng HTTP.", en: "<b>Multiplexing</b> (multiple parallel streams over one TCP conn), <b>header compression</b> (HPACK), <b>server push</b>. Eliminates HTTP-layer head-of-line blocking." },
    },
    {
      front: { vi: "TLS cung cấp 3 đảm bảo gì?", en: "What 3 guarantees does TLS provide?" },
      back: { vi: "<b>Confidentiality</b> (mã hóa dữ liệu), <b>Integrity</b> (MAC — dữ liệu không bị sửa giữa chừng), <b>Authentication</b> (certificate xác thực danh tính server).", en: "<b>Confidentiality</b> (data encryption), <b>Integrity</b> (MAC — data not tampered with in transit), <b>Authentication</b> (certificate verifies server identity)." },
    },
    {
      front: { vi: "Tại sao TLS dùng mã hóa bất đối xứng rồi chuyển sang đối xứng?", en: "Why does TLS use asymmetric encryption then switch to symmetric?" },
      back: { vi: "Bất đối xứng (RSA/ECC) <b>an toàn</b> để trao đổi session key qua kênh không tin cậy nhưng <b>chậm</b>. Đối xứng (AES) <b>rất nhanh</b> nhưng cần key dùng chung trước. TLS dùng bất đối xứng chỉ để bootstrap session key.", en: "Asymmetric (RSA/ECC) is <b>secure</b> for key exchange over an untrusted channel but <b>slow</b>. Symmetric (AES) is <b>very fast</b> but requires a pre-shared key. TLS uses asymmetric only to bootstrap the session key." },
    },
    {
      front: { vi: "L4 vs L7 Load Balancer khác nhau thế nào?", en: "How do L4 and L7 load balancers differ?" },
      back: { vi: "<b>L4</b> (Transport layer) phân tải dựa trên IP+port — nhanh, không đọc nội dung. <b>L7</b> (Application layer) phân tải dựa vào URL/header/cookie — thông minh hơn, hỗ trợ routing nâng cao như canary deploy.", en: "<b>L4</b> (Transport layer) routes by IP+port — fast, no payload inspection. <b>L7</b> (Application layer) routes by URL/headers/cookies — smarter, supports advanced routing like canary deployments." },
    },
    {
      front: { vi: "CDN hoạt động thế nào?", en: "How does a CDN work?" },
      back: { vi: "CDN có nhiều <b>PoP (Point of Presence)</b> trải khắp thế giới. Nội dung tĩnh được cache tại PoP gần người dùng nhất. Request không cần đến origin server → giảm độ trễ và băng thông.", en: "A CDN has many <b>PoPs (Points of Presence)</b> distributed globally. Static content is cached at the nearest PoP to the user. Requests never reach the origin server → reduced latency and bandwidth." },
    },
    {
      front: { vi: "NAT là gì và tại sao cần nó?", en: "What is NAT and why is it needed?" },
      back: { vi: "<b>NAT (Network Address Translation)</b> cho phép nhiều thiết bị trong mạng nội bộ (dùng IP private) chia sẻ một IP public. Cần thiết vì IPv4 chỉ có ~4.3 tỷ địa chỉ không đủ cho toàn bộ thiết bị trên thế giới.", en: "<b>NAT (Network Address Translation)</b> lets multiple devices on a private network share a single public IP. Needed because IPv4 only has ~4.3 billion addresses — insufficient for all devices worldwide." },
    },
  ],
  quiz: [
    {
      q: { vi: "HTTP hoạt động ở tầng nào của mô hình OSI?", en: "Which OSI layer does HTTP operate at?" },
      options: [{ vi: "Tầng 4 — Transport", en: "Layer 4 — Transport" }, { vi: "Tầng 5 — Session", en: "Layer 5 — Session" }, { vi: "Tầng 6 — Presentation", en: "Layer 6 — Presentation" }, { vi: "Tầng 7 — Application", en: "Layer 7 — Application" }],
      answer: 3,
      explain: { vi: "HTTP là giao thức tầng Application (tầng 7 OSI / tầng Application của TCP/IP). TCP hoạt động ở tầng 4 Transport.", en: "HTTP is an Application layer protocol (OSI Layer 7 / TCP/IP Application layer). TCP operates at Layer 4 Transport." },
    },
    {
      q: { vi: "Bước nào KHÔNG có trong TCP 3-way handshake?", en: "Which step is NOT part of the TCP 3-way handshake?" },
      options: [{ vi: "Client gửi SYN", en: "Client sends SYN" }, { vi: "Server gửi SYN-ACK", en: "Server sends SYN-ACK" }, { vi: "Client gửi ACK", en: "Client sends ACK" }, { vi: "Server gửi FIN", en: "Server sends FIN" }],
      answer: 3,
      explain: { vi: "FIN là bước kết thúc kết nối (4-way teardown), không phải bước thiết lập. Handshake gồm: SYN → SYN-ACK → ACK.", en: "FIN is part of the 4-way teardown (closing), not the establishment. The handshake is: SYN → SYN-ACK → ACK." },
    },
    {
      q: { vi: "Giao thức nào dùng UDP thay vì TCP?", en: "Which protocol uses UDP instead of TCP?" },
      options: [{ vi: "HTTP", en: "HTTP" }, { vi: "SSH", en: "SSH" }, { vi: "DNS", en: "DNS" }, { vi: "FTP", en: "FTP" }],
      answer: 2,
      explain: { vi: "DNS dùng UDP (port 53) cho các truy vấn thông thường — gói nhỏ, cần nhanh, retransmit ở tầng ứng dụng nếu cần. HTTP, SSH, FTP đều dùng TCP.", en: "DNS uses UDP (port 53) for standard queries — small packets, needs speed, retransmits at the application layer if needed. HTTP, SSH, and FTP all use TCP." },
    },
    {
      q: { vi: "CNAME record làm gì?", en: "What does a CNAME record do?" },
      options: [{ vi: "Ánh xạ domain sang địa chỉ IPv4", en: "Maps a domain to an IPv4 address" }, { vi: "Xác định mail server cho domain", en: "Identifies the mail server for a domain" }, { vi: "Ánh xạ domain sang domain khác (alias)", en: "Maps a domain to another domain (alias)" }, { vi: "Ánh xạ domain sang địa chỉ IPv6", en: "Maps a domain to an IPv6 address" }],
      answer: 2,
      explain: { vi: "CNAME là canonical name record — tạo alias từ domain này sang domain khác. A record → IPv4; AAAA record → IPv6; MX record → mail server.", en: "CNAME is a canonical name record — creates an alias from one domain to another. A record → IPv4; AAAA record → IPv6; MX record → mail server." },
    },
    {
      q: { vi: "HTTP status code nào chỉ ra rằng tài nguyên được tìm thấy trong cache (không thay đổi)?", en: "Which HTTP status code indicates a resource was found in cache (unchanged)?" },
      options: [{ vi: "200 OK", en: "200 OK" }, { vi: "301 Moved Permanently", en: "301 Moved Permanently" }, { vi: "304 Not Modified", en: "304 Not Modified" }, { vi: "404 Not Found", en: "404 Not Found" }],
      answer: 2,
      explain: { vi: "304 Not Modified được trả về khi client gửi conditional request (ETag / If-Modified-Since) và tài nguyên chưa thay đổi — client dùng bản cache sẵn có.", en: "304 Not Modified is returned when the client sends a conditional request (ETag / If-Modified-Since) and the resource hasn't changed — the client uses its cached copy." },
    },
    {
      q: { vi: "TLS sử dụng mã hóa bất đối xứng để làm gì?", en: "What does TLS use asymmetric encryption for?" },
      back: { vi: "Encrypt toàn bộ dữ liệu", en: "Encrypt all data" },
      options: [{ vi: "Mã hóa toàn bộ dữ liệu truyền tải", en: "Encrypt all data in transit" }, { vi: "Trao đổi session key một lần duy nhất khi handshake", en: "Exchange the session key once during the handshake" }, { vi: "Nén dữ liệu HTTP", en: "Compress HTTP data" }, { vi: "Xác thực cả client và server mọi request", en: "Authenticate both client and server on every request" }],
      answer: 1,
      explain: { vi: "TLS dùng mã hóa bất đối xứng (RSA/DH) <b>chỉ để trao đổi session key</b> một lần. Sau đó toàn bộ dữ liệu được mã hóa bằng AES (đối xứng) — nhanh hơn nhiều.", en: "TLS uses asymmetric encryption (RSA/DH) <b>only to exchange the session key</b> once. Thereafter all data is encrypted with AES (symmetric) — much faster." },
    },
    {
      q: { vi: "Load balancer L7 có thể làm gì mà L4 không làm được?", en: "What can an L7 load balancer do that an L4 cannot?" },
      options: [{ vi: "Phân tải dựa trên IP nguồn", en: "Route based on source IP" }, { vi: "Phân tải dựa trên URL path hoặc HTTP header", en: "Route based on URL path or HTTP header" }, { vi: "Chuyển tiếp TCP packets", en: "Forward TCP packets" }, { vi: "Kiểm tra port đích", en: "Inspect the destination port" }],
      answer: 1,
      explain: { vi: "L7 LB đọc và hiểu HTTP — có thể route <code>/api/*</code> đến API servers và <code>/static/*</code> đến CDN, hỗ trợ canary deploy, A/B testing. L4 chỉ thấy IP+port.", en: "L7 LB reads and understands HTTP — it can route <code>/api/*</code> to API servers and <code>/static/*</code> to a CDN, enabling canary deploys and A/B testing. L4 only sees IP+port." },
    },
    {
      q: { vi: "Cổng (port) mặc định của HTTPS là bao nhiêu?", en: "What is the default port for HTTPS?" },
      options: [{ vi: "80", en: "80" }, { vi: "443", en: "443" }, { vi: "8080", en: "8080" }, { vi: "8443", en: "8443" }],
      answer: 1,
      explain: { vi: "HTTPS dùng cổng <b>443</b> theo mặc định. HTTP dùng cổng 80. 8080 và 8443 thường dùng cho môi trường dev để tránh cần quyền root.", en: "HTTPS defaults to port <b>443</b>. HTTP uses port 80. Ports 8080 and 8443 are common in development to avoid needing root privileges." },
    },
    {
      q: { vi: "Điều gì xảy ra khi TTL của một bản ghi DNS hết hạn?", en: "What happens when a DNS record's TTL expires?" },
      options: [{ vi: "Domain ngừng hoạt động", en: "The domain stops working" }, { vi: "Resolver phải tra lại Authoritative NS để lấy bản ghi mới", en: "The resolver must re-query the Authoritative NS for a fresh record" }, { vi: "Client phải khởi động lại", en: "The client must restart" }, { vi: "Bản ghi DNS bị xóa vĩnh viễn", en: "The DNS record is permanently deleted" }],
      answer: 1,
      explain: { vi: "Khi TTL hết, bản ghi cache không còn hợp lệ — Recursive Resolver phải tra lại từ Authoritative NS. Đây là cách thay đổi DNS lan truyền: giảm TTL trước khi đổi IP, chờ cache cũ hết hạn.", en: "When TTL expires, the cached record is stale — the Recursive Resolver must re-query the Authoritative NS. This is how DNS changes propagate: lower TTL before changing the IP, wait for old caches to expire." },
    },
    {
      q: { vi: "HTTP/3 khác HTTP/2 ở điểm cơ bản nào?", en: "What is the fundamental difference between HTTP/3 and HTTP/2?" },
      options: [{ vi: "HTTP/3 chạy trên UDP (QUIC) thay vì TCP", en: "HTTP/3 runs over UDP (QUIC) instead of TCP" }, { vi: "HTTP/3 không hỗ trợ TLS", en: "HTTP/3 does not support TLS" }, { vi: "HTTP/3 chỉ dùng cho video streaming", en: "HTTP/3 is only for video streaming" }, { vi: "HTTP/3 loại bỏ multiplexing", en: "HTTP/3 removes multiplexing" }],
      answer: 0,
      explain: { vi: "HTTP/3 chạy trên <b>QUIC</b> (giao thức dựa UDP) thay vì TCP, giải quyết hoàn toàn TCP head-of-line blocking và hỗ trợ 0-RTT reconnect. Mã hóa là bắt buộc (built-in).", en: "HTTP/3 runs over <b>QUIC</b> (a UDP-based protocol) instead of TCP, fully eliminating TCP head-of-line blocking and enabling 0-RTT reconnects. Encryption is mandatory (built-in)." },
    },
  ],
});
