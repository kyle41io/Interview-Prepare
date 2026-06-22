/* Logging & Observability */
PREP.register({
  id: "logging",
  icon: "📋",
  category: "cs",
  title: { vi: "Logging & Observability", en: "Logging & Observability" },
  blurb: {
    vi: "Ba trụ cột của observability: logs, metrics, traces. Hiểu cách ghi log đúng cách, tập trung hóa, và xây dựng hệ thống cảnh báo hiệu quả là kỹ năng thiết yếu với mọi kỹ sư backend.",
    en: "The three pillars of observability: logs, metrics, traces. Knowing how to log correctly, centralize output, and build effective alerting is essential for every backend engineer.",
  },
  sections: [
    {
      id: "why-logging",
      title: { vi: "1. Tại sao cần Logging — 3 trụ cột Observability", en: "1. Why Logging — The 3 Pillars of Observability" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Observability</b> (khả năng quan sát) là năng lực hiểu trạng thái bên trong một hệ thống từ các tín hiệu bên ngoài. Ba trụ cột cốt lõi là <b>Logs</b>, <b>Metrics</b> và <b>Traces</b>. Chúng bổ trợ nhau — không cái nào thay thế hoàn toàn cái kia.",
          en: "<b>Observability</b> is the ability to understand the internal state of a system from its external signals. The three core pillars are <b>Logs</b>, <b>Metrics</b>, and <b>Traces</b>. They complement each other — none fully replaces the others.",
        },
        {
          type: "table",
          headers: {
            vi: ["Trụ cột", "Là gì?", "Dùng khi nào", "Ví dụ công cụ"],
            en: ["Pillar", "What is it?", "When to use", "Example tools"],
          },
          rows: [
            {
              vi: ["Logs", "Bản ghi sự kiện rời rạc, có timestamp", "Debug lỗi cụ thể, kiểm tra luồng xử lý", "Loki, ELK, CloudWatch Logs"],
              en: ["Logs", "Discrete timestamped event records", "Debug specific errors, audit request flow", "Loki, ELK, CloudWatch Logs"],
            },
            {
              vi: ["Metrics", "Số liệu tổng hợp theo thời gian (số đếm, giá trị, phân phối)", "Giám sát xu hướng, alerting, capacity planning", "Prometheus, Datadog, CloudWatch Metrics"],
              en: ["Metrics", "Aggregated numeric time-series (counts, values, distributions)", "Monitor trends, alerting, capacity planning", "Prometheus, Datadog, CloudWatch Metrics"],
            },
            {
              vi: ["Traces", "Chuỗi span mô tả hành trình một request qua nhiều service", "Tìm điểm nghẽn trong microservices, đo latency từng bước", "Jaeger, Zipkin, AWS X-Ray, Tempo"],
              en: ["Traces", "Chain of spans describing a request's journey across services", "Find bottlenecks in microservices, measure per-step latency", "Jaeger, Zipkin, AWS X-Ray, Tempo"],
            },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Câu hỏi nhanh để chọn đúng trụ cột: <b>\"Chuyện gì đã xảy ra?\"</b> → Logs. <b>\"Hệ thống đang khỏe không?\"</b> → Metrics. <b>\"Request này đi đâu, mất bao lâu ở đâu?\"</b> → Traces.",
          en: "Quick rule to pick the right pillar: <b>\"What happened?\"</b> → Logs. <b>\"Is the system healthy?\"</b> → Metrics. <b>\"Where did this request go and what took so long?\"</b> → Traces.",
        },
      ],
    },
    {
      id: "log-levels",
      title: { vi: "2. Log Levels — Ghi gì ở mức nào", en: "2. Log Levels — What to Log at Each Level" },
      blocks: [
        {
          type: "prose",
          vi: "Mỗi log entry có một <b>mức độ nghiêm trọng</b> (severity). Dùng đúng mức giúp lọc noise và tìm vấn đề nhanh hơn. Thứ tự từ chi tiết nhất đến nghiêm trọng nhất:",
          en: "Every log entry carries a <b>severity level</b>. Using the right level reduces noise and speeds up troubleshooting. In order from most verbose to most severe:",
        },
        {
          type: "table",
          headers: {
            vi: ["Mức", "Mục đích", "Nên log gì", "Môi trường thường bật"],
            en: ["Level", "Purpose", "What to log", "Typical environments"],
          },
          rows: [
            {
              vi: ["TRACE", "Cực kỳ chi tiết, từng bước nhỏ", "Vào/ra từng hàm, giá trị biến trung gian", "Dev (tắt ở production)"],
              en: ["TRACE", "Extremely granular, step-by-step", "Function entry/exit, intermediate variable values", "Dev only (off in production)"],
            },
            {
              vi: ["DEBUG", "Thông tin hỗ trợ debug", "Câu SQL, payload request/response (không chứa secret)", "Dev, Staging"],
              en: ["DEBUG", "Helpful debugging info", "SQL queries, request/response payload (no secrets)", "Dev, Staging"],
            },
            {
              vi: ["INFO", "Sự kiện nghiệp vụ bình thường", "User đăng nhập, order tạo thành công, service khởi động", "Tất cả môi trường"],
              en: ["INFO", "Normal business events", "User login, order created, service started", "All environments"],
            },
            {
              vi: ["WARN", "Tình huống bất thường, chưa lỗi", "Retry lần 2, config thiếu (dùng default), disk > 80%", "Tất cả môi trường"],
              en: ["WARN", "Abnormal but not failing yet", "2nd retry attempt, missing config (using default), disk > 80%", "All environments"],
            },
            {
              vi: ["ERROR", "Lỗi cần chú ý, service vẫn chạy", "Exception không xử lý được, DB connection thất bại", "Tất cả môi trường"],
              en: ["ERROR", "Failure needing attention, service still running", "Unhandled exception, DB connection failure", "All environments"],
            },
            {
              vi: ["FATAL", "Lỗi khiến service dừng hẳn", "Không bind được port, config thiết yếu bị thiếu", "Tất cả môi trường"],
              en: ["FATAL", "Error causing service shutdown", "Cannot bind port, critical config missing", "All environments"],
            },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<b>KHÔNG BAO GIỜ log</b>: password, token/API key, số thẻ tín dụng, mật khẩu hash, số CMND/CCCD, địa chỉ IP riêng tư nếu không cần thiết. Vi phạm có thể dẫn đến phạt GDPR/PCI-DSS và rò rỉ dữ liệu người dùng.",
          en: "<b>NEVER log</b>: passwords, tokens/API keys, credit card numbers, password hashes, national ID numbers, private IPs unless required. Violations can trigger GDPR/PCI-DSS fines and expose user data.",
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Trong production, mặc định đặt level <b>INFO</b>. Chỉ bật DEBUG/TRACE tạm thời khi điều tra sự cố, và tắt ngay sau đó để tránh log quá nhiều gây tốn tài nguyên.",
          en: "In production, default to <b>INFO</b> level. Only enable DEBUG/TRACE temporarily during incident investigation — turn it off immediately after to avoid excessive log volume.",
        },
      ],
    },
    {
      id: "structured-logging",
      title: { vi: "3. Structured Logging — Log có cấu trúc", en: "3. Structured Logging — Logs with Structure" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Structured logging</b> nghĩa là log dưới dạng key-value có thể phân tích máy (thường là JSON), thay vì chuỗi văn bản tự do. Điều này cho phép tìm kiếm, lọc và tổng hợp hiệu quả trong hệ thống log tập trung.",
          en: "<b>Structured logging</b> means logging in a machine-parseable key-value format (usually JSON) instead of free-form text strings. This enables efficient search, filtering, and aggregation in centralized logging systems.",
        },
        {
          type: "table",
          headers: {
            vi: ["Kiểu", "Ví dụ", "Ưu/Nhược"],
            en: ["Type", "Example", "Pros/Cons"],
          },
          rows: [
            {
              vi: ["Plain text", "2024-01-15 ERROR User 42 login failed after 3 retries", "Dễ đọc bằng mắt; khó parse tự động, khó filter"],
              en: ["Plain text", "2024-01-15 ERROR User 42 login failed after 3 retries", "Human-readable; hard to parse programmatically, hard to filter"],
            },
            {
              vi: ["JSON (structured)", "{\"level\":\"error\",\"user_id\":42,\"event\":\"login_failed\",\"retries\":3}", "Dễ query, lọc, tổng hợp; hơi dài hơn"],
              en: ["JSON (structured)", "{\"level\":\"error\",\"user_id\":42,\"event\":\"login_failed\",\"retries\":3}", "Easy to query, filter, aggregate; slightly more verbose"],
            },
          ],
        },
        {
          type: "prose",
          vi: "Một <b>request ID</b> (hay correlation ID) là giá trị duy nhất gắn vào mỗi request khi vào hệ thống và truyền xuyên suốt qua các service. Nó cho phép lọc tất cả log liên quan đến một request cụ thể dù chúng nằm ở nhiều service khác nhau.",
          en: "A <b>request ID</b> (or correlation ID) is a unique value attached to each incoming request and propagated across all services. It lets you filter all log lines related to a specific request even when they span multiple services.",
        },
        {
          type: "code",
          code: "// Express middleware: attach request ID to every log\nconst { v4: uuidv4 } = require('uuid');\nconst logger = require('./logger'); // e.g. winston / pino\n\nfunction requestIdMiddleware(req, res, next) {\n  // Accept from upstream (e.g. API gateway) or generate a new one\n  req.requestId = req.headers['x-request-id'] || uuidv4();\n  // Echo back so the client / upstream can correlate\n  res.setHeader('x-request-id', req.requestId);\n  next();\n}\n\n// A structured log line produced inside a route handler:\n// logger.info({\n//   level: 'info',\n//   timestamp: new Date().toISOString(),\n//   request_id: req.requestId,   // <-- correlation key\n//   user_id: req.user?.id,\n//   event: 'order_created',\n//   order_id: order.id,\n//   duration_ms: Date.now() - req.startTime\n// });\n\n// Resulting JSON log line:\n// {\n//   \"level\": \"info\",\n//   \"timestamp\": \"2024-01-15T10:23:45.123Z\",\n//   \"request_id\": \"f47ac10b-58cc-4372-a567-0e02b2c3d479\",\n//   \"user_id\": 42,\n//   \"event\": \"order_created\",\n//   \"order_id\": 9901,\n//   \"duration_ms\": 34\n// }",
          caption: {
            vi: "Middleware gắn request ID và ví dụ một log line JSON đầy đủ",
            en: "Middleware that attaches a request ID and an example complete JSON log line",
          },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Dùng thư viện có sẵn như <b>pino</b> (Node.js), <b>structlog</b> (Python), <b>zerolog</b> (Go), hoặc <b>logback + logstash-encoder</b> (Java). Đừng tự format JSON thủ công.",
          en: "Use existing libraries: <b>pino</b> (Node.js), <b>structlog</b> (Python), <b>zerolog</b> (Go), or <b>logback + logstash-encoder</b> (Java). Don't hand-craft JSON strings.",
        },
      ],
    },
    {
      id: "centralized-logging",
      title: { vi: "4. Centralized Logging — Tập trung hóa Log", en: "4. Centralized Logging — Aggregating Logs" },
      blocks: [
        {
          type: "prose",
          vi: "Khi có nhiều instance hoặc nhiều service, log nằm rải rác trên nhiều máy. <b>Centralized logging</b> thu thập tất cả về một nơi để tìm kiếm và phân tích.",
          en: "With multiple instances or services, logs scatter across many machines. <b>Centralized logging</b> collects them all in one place for unified search and analysis.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>ELK Stack</b>: <b>E</b>lasticsearch (lưu trữ & tìm kiếm), <b>L</b>ogstash (thu thập, biến đổi, gửi log), <b>K</b>ibana (dashboard, query). Phổ biến nhất trong on-premise.",
              en: "<b>ELK Stack</b>: <b>E</b>lasticsearch (storage & search), <b>L</b>ogstash (collect, transform, ship), <b>K</b>ibana (dashboard, querying). Most common on-premise stack.",
            },
            {
              vi: "<b>EFK Stack</b>: thay Logstash bằng <b>F</b>luentd hoặc Fluent Bit — nhẹ hơn, phù hợp Kubernetes, cấu hình dễ hơn.",
              en: "<b>EFK Stack</b>: replaces Logstash with <b>F</b>luentd or Fluent Bit — lighter weight, Kubernetes-friendly, easier to configure.",
            },
            {
              vi: "<b>Grafana Loki</b>: lưu log theo label (không full-text index), chi phí thấp, tích hợp tốt với Grafana. Phù hợp khi đã dùng Prometheus.",
              en: "<b>Grafana Loki</b>: indexes logs by label (not full text), low cost, integrates naturally with Grafana. Great when you already run Prometheus.",
            },
            {
              vi: "<b>Cloud-managed</b>: AWS CloudWatch Logs, GCP Cloud Logging, Azure Monitor — zero ops, tích hợp sẵn với hạ tầng cloud.",
              en: "<b>Cloud-managed</b>: AWS CloudWatch Logs, GCP Cloud Logging, Azure Monitor — zero ops, native cloud integration.",
            },
          ],
        },
        {
          type: "prose",
          vi: "<b>Log shipping</b> là quá trình chuyển log từ ứng dụng tới hệ thống tập trung. Có hai mô hình chính:",
          en: "<b>Log shipping</b> is the process of moving logs from the application to the centralized system. Two main models:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Agent-based (pull/push)</b>: một agent nhỏ (Filebeat, Fluent Bit) chạy trên mỗi máy, đọc log file hoặc stdout của container rồi gửi đi. Ứng dụng không cần biết.",
              en: "<b>Agent-based (pull/push)</b>: a lightweight agent (Filebeat, Fluent Bit) runs on each host, reads log files or container stdout, and ships them. The application is unaware.",
            },
            {
              vi: "<b>Direct logging</b>: ứng dụng gửi thẳng qua HTTP/gRPC tới log backend (Loki, Datadog). Đơn giản hơn nhưng tạo dependency và tốn tài nguyên ứng dụng.",
              en: "<b>Direct logging</b>: the application sends logs directly via HTTP/gRPC to the log backend (Loki, Datadog). Simpler but adds a dependency and consumes app resources.",
            },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>Log retention</b>: xác định rõ chính sách lưu trữ — DEBUG log thường chỉ giữ 7–14 ngày, INFO 30–90 ngày, ERROR/AUDIT có thể 1 năm+ tùy yêu cầu compliance. Log quá nhiều = chi phí cao và tìm kiếm chậm.",
          en: "<b>Log retention</b>: define a clear policy — DEBUG logs typically kept 7–14 days, INFO 30–90 days, ERROR/AUDIT up to 1 year+ depending on compliance requirements. Keeping too much = high cost and slow searches.",
        },
      ],
    },
    {
      id: "metrics",
      title: { vi: "5. Metrics — Số liệu & Phương pháp RED/USE", en: "5. Metrics — Numbers & RED/USE Methods" },
      blocks: [
        {
          type: "prose",
          vi: "Metrics là các số liệu được tổng hợp theo thời gian. Khác với log (ghi sự kiện riêng lẻ), metrics phù hợp để theo dõi xu hướng, vẽ đồ thị và cảnh báo.",
          en: "Metrics are numeric measurements aggregated over time. Unlike logs (individual events), metrics are ideal for tracking trends, drawing graphs, and alerting.",
        },
        {
          type: "table",
          headers: {
            vi: ["Kiểu metric", "Mô tả", "Ví dụ"],
            en: ["Metric type", "Description", "Example"],
          },
          rows: [
            {
              vi: ["Counter", "Chỉ tăng, không giảm (reset khi restart)", "Tổng số request, tổng lỗi, tổng byte gửi"],
              en: ["Counter", "Only increases (resets on restart)", "Total requests, total errors, total bytes sent"],
            },
            {
              vi: ["Gauge", "Có thể tăng lẫn giảm, thể hiện trạng thái hiện tại", "CPU%, RAM dùng, số kết nối đang mở, queue size"],
              en: ["Gauge", "Can go up or down, represents current state", "CPU%, RAM used, open connections, queue size"],
            },
            {
              vi: ["Histogram", "Phân phối giá trị theo bucket; tính được percentile", "Latency p50/p95/p99, kích thước response"],
              en: ["Histogram", "Distributes values into buckets; enables percentiles", "Latency p50/p95/p99, response size"],
            },
            {
              vi: ["Summary", "Tương tự histogram nhưng tính percentile phía client", "Ít dùng hơn histogram vì khó aggregate"],
              en: ["Summary", "Like histogram but computes percentiles client-side", "Less common than histogram; hard to aggregate"],
            },
          ],
        },
        {
          type: "prose",
          vi: "Hai phương pháp phổ biến để chọn metric nào cần theo dõi:",
          en: "Two popular methods for deciding which metrics to track:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>RED method</b> (cho service-level): <b>R</b>ate (số request/giây), <b>E</b>rrors (tỷ lệ lỗi), <b>D</b>uration (latency). Áp dụng cho mọi API/microservice.",
              en: "<b>RED method</b> (service-level): <b>R</b>ate (requests/second), <b>E</b>rrors (error rate), <b>D</b>uration (latency). Apply to every API/microservice.",
            },
            {
              vi: "<b>USE method</b> (cho resource-level): <b>U</b>tilization (% thời gian resource bận), <b>S</b>aturation (hàng chờ), <b>E</b>rrors (lỗi hardware/driver). Áp dụng cho CPU, disk, network.",
              en: "<b>USE method</b> (resource-level): <b>U</b>tilization (% time resource is busy), <b>S</b>aturation (queue depth), <b>E</b>rrors (hardware/driver errors). Apply to CPU, disk, network.",
            },
          ],
        },
        {
          type: "code",
          code: "# Prometheus + Python example (prometheus_client library)\nfrom prometheus_client import Counter, Histogram, start_http_server\nimport time\n\n# Counter: total HTTP requests by method and status code\nREQUESTS_TOTAL = Counter(\n    'http_requests_total',\n    'Total HTTP requests',\n    ['method', 'status_code']\n)\n\n# Histogram: request latency in seconds\nREQUEST_LATENCY = Histogram(\n    'http_request_duration_seconds',\n    'HTTP request latency',\n    ['endpoint'],\n    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]\n)\n\ndef handle_request(method, endpoint, status_code, duration_s):\n    REQUESTS_TOTAL.labels(method=method, status_code=status_code).inc()\n    REQUEST_LATENCY.labels(endpoint=endpoint).observe(duration_s)\n\n# Prometheus scrapes /metrics endpoint every 15s (default)\n# Grafana queries Prometheus to build dashboards",
          caption: {
            vi: "Định nghĩa Counter và Histogram trong Python với prometheus_client",
            en: "Defining a Counter and Histogram in Python using prometheus_client",
          },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "<b>Prometheus + Grafana</b> là bộ đôi mặc định trong Kubernetes. Prometheus scrape (pull) metrics từ các /metrics endpoint, Grafana vẽ dashboard và gửi alert. AlertManager xử lý routing cảnh báo.",
          en: "<b>Prometheus + Grafana</b> is the default stack in Kubernetes. Prometheus scrapes (pull) metrics from /metrics endpoints, Grafana renders dashboards and alerts. AlertManager handles alert routing.",
        },
      ],
    },
    {
      id: "distributed-tracing",
      title: { vi: "6. Distributed Tracing — Theo dõi request trong Microservices", en: "6. Distributed Tracing — Following Requests Across Microservices" },
      blocks: [
        {
          type: "prose",
          vi: "Trong kiến trúc microservices, một request người dùng có thể đi qua 5–10 service. Log riêng lẻ của từng service không cho ta thấy bức tranh toàn cảnh. <b>Distributed tracing</b> giải quyết điều này bằng cách theo dõi toàn bộ hành trình của một request.",
          en: "In a microservices architecture, a single user request may pass through 5–10 services. Per-service logs don't give the full picture. <b>Distributed tracing</b> solves this by tracking the entire journey of a request end-to-end.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Trace</b>: toàn bộ hành trình của một request, được xác định bởi một <b>trace ID</b> duy nhất.",
              en: "<b>Trace</b>: the complete journey of a single request, identified by a unique <b>trace ID</b>.",
            },
            {
              vi: "<b>Span</b>: một đơn vị công việc trong trace (ví dụ: một HTTP call, một query DB, một hàm). Mỗi span có start time, duration, và metadata (tags/attributes).",
              en: "<b>Span</b>: a single unit of work within a trace (e.g. one HTTP call, one DB query, one function). Each span has a start time, duration, and metadata (tags/attributes).",
            },
            {
              vi: "<b>Context propagation</b>: trace ID và span ID được truyền qua HTTP header (ví dụ: <code>traceparent</code> theo W3C Trace Context) để các service con có thể tạo span con đúng chỗ.",
              en: "<b>Context propagation</b>: the trace ID and span ID are passed via HTTP headers (e.g. <code>traceparent</code> per W3C Trace Context) so downstream services can create child spans correctly.",
            },
          ],
        },
        {
          type: "code",
          code: "// OpenTelemetry JS — instrument an Express service\nconst { NodeSDK } = require('@opentelemetry/sdk-node');\nconst { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');\nconst { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');\nconst { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');\n\nconst sdk = new NodeSDK({\n  serviceName: 'order-service',\n  traceExporter: new OTLPTraceExporter({\n    url: 'http://otel-collector:4318/v1/traces', // OTLP endpoint\n  }),\n  instrumentations: [\n    new HttpInstrumentation(),      // auto-instrument HTTP in/out\n    new ExpressInstrumentation(),   // auto-instrument Express routes\n  ],\n});\nsdk.start(); // must be first, before importing app code\n\n// W3C traceparent header propagated automatically:\n// traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01\n//                  ^^trace-id (32 hex)^^  ^^parent-span-id^^  flags",
          caption: {
            vi: "Bootstrap OpenTelemetry SDK trong Node.js — HTTP và Express được instrument tự động",
            en: "Bootstrap the OpenTelemetry SDK in Node.js — HTTP and Express are auto-instrumented",
          },
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>OpenTelemetry (OTel)</b> là chuẩn mở (CNCF) cho logs, metrics và traces. Dùng OTel SDK để instrument một lần, sau đó export tới bất kỳ backend nào (Jaeger, Zipkin, Datadog, Grafana Tempo) mà không sửa code.",
          en: "<b>OpenTelemetry (OTel)</b> is the open standard (CNCF) for logs, metrics, and traces. Instrument once with the OTel SDK, then export to any backend (Jaeger, Zipkin, Datadog, Grafana Tempo) without code changes.",
        },
        {
          type: "callout",
          variant: "key",
          vi: "Khi nào traces hữu ích nhất: (1) latency cao bất thường nhưng không rõ service nào gây ra; (2) debug fan-out request (service A gọi B, C, D song song); (3) tìm hiểu dependency ẩn giữa các service.",
          en: "Traces shine when: (1) latency is high but you can't tell which service is the culprit; (2) debugging fan-out requests (service A calling B, C, D in parallel); (3) discovering hidden service dependencies.",
        },
      ],
    },
    {
      id: "alerting-slo",
      title: { vi: "7. Alerting, SLI/SLO/SLA & Alert Fatigue", en: "7. Alerting, SLI/SLO/SLA & Alert Fatigue" },
      blocks: [
        {
          type: "prose",
          vi: "Log và metric chỉ có ý nghĩa khi có người hoặc hệ thống <b>phản ứng</b> với chúng. Alerting là cầu nối giữa observability và hành động.",
          en: "Logs and metrics only matter if someone or something <b>acts</b> on them. Alerting is the bridge between observability and action.",
        },
        {
          type: "table",
          headers: {
            vi: ["Khái niệm", "Ý nghĩa", "Ví dụ"],
            en: ["Concept", "Meaning", "Example"],
          },
          rows: [
            {
              vi: ["SLI (Service Level Indicator)", "Số liệu đo lường thực tế", "Tỷ lệ request thành công trong 5 phút = 99.2%"],
              en: ["SLI (Service Level Indicator)", "The actual measured metric", "Successful request ratio over 5 min = 99.2%"],
            },
            {
              vi: ["SLO (Service Level Objective)", "Mục tiêu nội bộ cho SLI", "99.5% request thành công trong 30 ngày rolling"],
              en: ["SLO (Service Level Objective)", "Internal target for an SLI", "99.5% successful requests over 30-day rolling window"],
            },
            {
              vi: ["SLA (Service Level Agreement)", "Cam kết hợp đồng với khách hàng, kèm hậu quả", "99.9% uptime/tháng; vi phạm → hoàn tiền 10%"],
              en: ["SLA (Service Level Agreement)", "Contractual commitment to customers with penalties", "99.9% monthly uptime; breach → 10% credit"],
            },
            {
              vi: ["Error Budget", "SLO - thực tế = ngân sách lỗi còn lại", "SLO 99.5%, thực tế 99.2% → tiêu 60% error budget"],
              en: ["Error Budget", "SLO minus actual = remaining error budget", "SLO 99.5%, actual 99.2% → 60% of error budget spent"],
            },
          ],
        },
        {
          type: "prose",
          vi: "<b>Alert fatigue</b> xảy ra khi có quá nhiều cảnh báo, hầu hết không quan trọng, đến mức kỹ sư bắt đầu bỏ qua hoặc tắt chúng — nguy hiểm khi có sự cố thật. Cách phòng tránh:",
          en: "<b>Alert fatigue</b> occurs when there are so many alerts — mostly unimportant — that engineers start ignoring or silencing them, which is dangerous when a real incident hits. How to prevent it:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            {
              vi: "<b>Alert trên symptom, không phải cause</b>: cảnh báo \"error rate > 1%\" tốt hơn \"CPU > 80%\" vì người dùng cảm nhận symptom, không phải cause.",
              en: "<b>Alert on symptoms, not causes</b>: \"error rate > 1%\" beats \"CPU > 80%\" because users feel symptoms, not causes.",
            },
            {
              vi: "<b>Alert phải actionable</b>: mỗi alert phải có runbook hoặc bước xử lý cụ thể. Nếu không biết làm gì với alert đó, đừng tạo nó.",
              en: "<b>Alerts must be actionable</b>: every alert should have a runbook or clear action. If you don't know what to do when it fires, don't create it.",
            },
            {
              vi: "<b>Dùng burn rate alert cho SLO</b>: thay vì cảnh báo tại ngưỡng cố định, cảnh báo khi error budget đang tiêu hết quá nhanh (ví dụ: đang dùng hết budget 30 ngày trong 1 tiếng).",
              en: "<b>Use burn-rate alerts for SLOs</b>: instead of a fixed threshold, alert when the error budget is burning too fast (e.g. consuming 30 days of budget in 1 hour).",
            },
            {
              vi: "<b>Log sampling</b>: ở traffic cao, không nhất thiết phải log 100% request DEBUG — sampling 1–10% giảm chi phí mà vẫn đủ để debug.",
              en: "<b>Log sampling</b>: at high traffic, you don't need to log 100% of DEBUG requests — 1–10% sampling cuts cost while still giving enough signal for debugging.",
            },
          ],
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Bộ ba hoàn hảo: <b>Logs</b> cho bạn biết \"chuyện gì xảy ra\", <b>Metrics</b> cho bạn biết \"đang xảy ra bao nhiêu\", <b>Traces</b> cho bạn biết \"xảy ra ở đâu\". Không có observability tốt = debug bằng cách đoán mò trong bóng tối.",
          en: "The perfect triad: <b>Logs</b> tell you \"what happened\", <b>Metrics</b> tell you \"how much is happening\", <b>Traces</b> tell you \"where it happened\". Without good observability, debugging means guessing in the dark.",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "3 trụ cột của Observability là gì?", en: "What are the 3 pillars of Observability?" },
      back: { vi: "<b>Logs</b> (sự kiện rời rạc), <b>Metrics</b> (số liệu tổng hợp theo thời gian), <b>Traces</b> (hành trình request qua nhiều service). Chúng bổ trợ nhau.", en: "<b>Logs</b> (discrete events), <b>Metrics</b> (aggregated time-series numbers), <b>Traces</b> (request journey across services). They complement each other." },
    },
    {
      front: { vi: "Khi nào dùng log level WARN vs ERROR?", en: "When do you use WARN vs ERROR log level?" },
      back: { vi: "<b>WARN</b>: bất thường nhưng service vẫn xử lý được (retry, dùng default). <b>ERROR</b>: thao tác thất bại, cần can thiệp nhưng service vẫn chạy. <b>FATAL</b>: service buộc phải dừng.", en: "<b>WARN</b>: abnormal but recoverable (retry, using defaults). <b>ERROR</b>: operation failed, needs attention but service keeps running. <b>FATAL</b>: service must shut down." },
    },
    {
      front: { vi: "Structured logging là gì và tại sao tốt hơn plain text?", en: "What is structured logging and why is it better than plain text?" },
      back: { vi: "Log dưới dạng key-value (thường JSON) thay vì chuỗi tự do. Cho phép <b>tìm kiếm, lọc, tổng hợp</b> bằng máy trong hệ thống log tập trung (ELK, Loki, v.v.).", en: "Logging in key-value format (usually JSON) instead of free-form strings. Enables <b>machine search, filtering, and aggregation</b> in centralized log systems (ELK, Loki, etc.)." },
    },
    {
      front: { vi: "Request ID (Correlation ID) là gì?", en: "What is a Request ID (Correlation ID)?" },
      back: { vi: "Giá trị UUID duy nhất gắn vào mỗi request khi vào hệ thống, truyền qua mọi service, ghi vào mọi log line. Cho phép lọc toàn bộ log của một request dù nằm ở nhiều service.", en: "A unique UUID attached to each incoming request, propagated across all services, included in every log line. Allows filtering all logs for one request even when they span multiple services." },
    },
    {
      front: { vi: "ELK Stack gồm những thành phần nào?", en: "What components make up the ELK Stack?" },
      back: { vi: "<b>E</b>lasticsearch (lưu trữ & full-text search), <b>L</b>ogstash (thu thập, parse, gửi log), <b>K</b>ibana (UI dashboard & query). EFK thay Logstash bằng Fluentd/Fluent Bit.", en: "<b>E</b>lasticsearch (storage & full-text search), <b>L</b>ogstash (collect, parse, ship), <b>K</b>ibana (UI dashboard & querying). EFK replaces Logstash with Fluentd/Fluent Bit." },
    },
    {
      front: { vi: "Sự khác nhau giữa Counter, Gauge và Histogram trong Prometheus?", en: "What is the difference between Counter, Gauge, and Histogram in Prometheus?" },
      back: { vi: "<b>Counter</b>: chỉ tăng (tổng request). <b>Gauge</b>: tăng/giảm (CPU%, queue size). <b>Histogram</b>: phân phối giá trị theo bucket, tính được p50/p95/p99 (latency).", en: "<b>Counter</b>: only increases (total requests). <b>Gauge</b>: can go up or down (CPU%, queue size). <b>Histogram</b>: distributes values into buckets, computes p50/p95/p99 (latency)." },
    },
    {
      front: { vi: "RED method trong metrics là gì?", en: "What is the RED method for metrics?" },
      back: { vi: "<b>R</b>ate (số request/giây), <b>E</b>rrors (tỷ lệ lỗi), <b>D</b>uration (latency/thời gian xử lý). Áp dụng cho mọi API hoặc microservice để đo sức khỏe.", en: "<b>R</b>ate (requests/second), <b>E</b>rrors (error rate), <b>D</b>uration (latency). Apply to every API or microservice to gauge health." },
    },
    {
      front: { vi: "Trace và Span trong distributed tracing là gì?", en: "What are a Trace and a Span in distributed tracing?" },
      back: { vi: "<b>Trace</b>: toàn bộ hành trình của một request (có trace ID duy nhất). <b>Span</b>: một đơn vị công việc trong trace (một HTTP call, một DB query). Spans lồng nhau tạo thành cây.", en: "<b>Trace</b>: the full journey of one request (has a unique trace ID). <b>Span</b>: one unit of work within a trace (one HTTP call, one DB query). Spans nest to form a tree." },
    },
    {
      front: { vi: "SLI, SLO và SLA khác nhau thế nào?", en: "How do SLI, SLO, and SLA differ?" },
      back: { vi: "<b>SLI</b>: số liệu đo thực tế (ví dụ: 99.2% success rate). <b>SLO</b>: mục tiêu nội bộ (99.5%). <b>SLA</b>: cam kết hợp đồng với khách hàng, kèm hình phạt nếu vi phạm.", en: "<b>SLI</b>: the actual measured metric (e.g. 99.2% success rate). <b>SLO</b>: internal target (99.5%). <b>SLA</b>: contractual commitment to customers with penalties for breach." },
    },
    {
      front: { vi: "Alert fatigue là gì và cách phòng tránh?", en: "What is alert fatigue and how do you prevent it?" },
      back: { vi: "Quá nhiều alert khiến kỹ sư tê liệt và bỏ qua cảnh báo thật. Phòng tránh: <b>alert trên symptom</b> (không phải cause), mỗi alert phải <b>actionable</b> (có runbook), dùng <b>burn rate alert</b> thay ngưỡng cứng.", en: "Too many alerts cause engineers to ignore them, including real ones. Prevent by: <b>alerting on symptoms</b> (not causes), making every alert <b>actionable</b> (with a runbook), using <b>burn-rate alerts</b> instead of fixed thresholds." },
    },
    {
      front: { vi: "OpenTelemetry là gì và tại sao dùng nó?", en: "What is OpenTelemetry and why use it?" },
      back: { vi: "Chuẩn mở (CNCF) cho logs, metrics và traces. Instrument code <b>một lần</b> với OTel SDK, rồi export tới bất kỳ backend nào (Jaeger, Datadog, Grafana) mà không cần sửa code ứng dụng.", en: "An open standard (CNCF) for logs, metrics, and traces. Instrument your code <b>once</b> with the OTel SDK, then export to any backend (Jaeger, Datadog, Grafana) without changing application code." },
    },
  ],
  quiz: [
    {
      q: { vi: "Bạn cần tìm tại sao một request của user cụ thể bị lỗi khi đi qua 5 microservices. Trụ cột observability nào phù hợp nhất?", en: "You need to find why a specific user's request failed while passing through 5 microservices. Which observability pillar is most appropriate?" },
      options: [
        { vi: "Metrics — xem tỷ lệ lỗi của từng service", en: "Metrics — check the error rate of each service" },
        { vi: "Logs — tìm log entry có request ID tương ứng", en: "Logs — search for log entries with the matching request ID" },
        { vi: "Distributed Traces — xem toàn bộ hành trình request qua từng span", en: "Distributed Traces — view the complete request journey across spans" },
        { vi: "Alerting — tạo alert cho lỗi tương tự", en: "Alerting — create an alert for similar errors" },
      ],
      answer: 2,
      explain: { vi: "Distributed Traces cho thấy toàn bộ hành trình của một request cụ thể, với thời gian xử lý ở từng span/service. Đây chính xác là công cụ để tìm điểm thất bại trong microservices. Log với request ID cũng giúp ích nhưng không cung cấp cái nhìn trực quan về chuỗi gọi và latency từng bước.", en: "Distributed Traces show the entire journey of a specific request with timing at each span/service — exactly the right tool for pinpointing failures in a microservice chain. Logs with a request ID also help but don't provide the visual call-chain and per-step latency." },
    },
    {
      q: { vi: "Log level nào phù hợp để ghi \"user đăng nhập thành công\" trong môi trường production?", en: "Which log level is appropriate for \"user logged in successfully\" in production?" },
      options: [
        { vi: "DEBUG", en: "DEBUG" },
        { vi: "INFO", en: "INFO" },
        { vi: "WARN", en: "WARN" },
        { vi: "ERROR", en: "ERROR" },
      ],
      answer: 1,
      explain: { vi: "INFO phù hợp cho các sự kiện nghiệp vụ bình thường và có ý nghĩa. DEBUG dành cho chi tiết kỹ thuật (thường tắt ở production). WARN dành cho bất thường. ERROR dành cho thất bại.", en: "INFO is for normal, meaningful business events. DEBUG is for technical details (typically off in production). WARN is for anomalies. ERROR is for failures." },
    },
    {
      q: { vi: "Điều nào sau đây KHÔNG nên log trong bất kỳ môi trường nào?", en: "Which of the following should NEVER be logged in any environment?" },
      options: [
        { vi: "User ID của người thực hiện hành động", en: "User ID of the person performing an action" },
        { vi: "HTTP status code của response", en: "HTTP status code of the response" },
        { vi: "Mật khẩu plaintext hoặc token xác thực", en: "Plaintext passwords or authentication tokens" },
        { vi: "Request ID để correlate log", en: "Request ID for log correlation" },
      ],
      answer: 2,
      explain: { vi: "Mật khẩu và token xác thực tuyệt đối không được log — vi phạm GDPR/PCI-DSS, tạo lỗ hổng bảo mật nghiêm trọng. User ID, status code và request ID là thông tin an toàn và hữu ích để log.", en: "Passwords and authentication tokens must never be logged — this violates GDPR/PCI-DSS and creates a serious security vulnerability. User IDs, status codes, and request IDs are safe and useful to log." },
    },
    {
      q: { vi: "Structured logging (JSON) có lợi thế chính nào so với plain-text logging?", en: "What is the main advantage of structured logging (JSON) over plain-text logging?" },
      options: [
        { vi: "Tốn ít dung lượng lưu trữ hơn", en: "Takes less storage space" },
        { vi: "Con người dễ đọc hơn khi nhìn trực tiếp vào file", en: "Easier for humans to read directly in a file" },
        { vi: "Dễ parse, filter và aggregate tự động trong hệ thống tập trung", en: "Easy to automatically parse, filter, and aggregate in centralized systems" },
        { vi: "Nhanh hơn để ghi vào disk", en: "Faster to write to disk" },
      ],
      answer: 2,
      explain: { vi: "Ưu thế cốt lõi của structured logging là khả năng xử lý máy: tìm kiếm theo field cụ thể, lọc theo giá trị, tổng hợp thống kê trong Elasticsearch, Loki, hay bất kỳ log backend nào. Plain text nhanh hơn khi đọc bằng mắt nhưng không thể query hiệu quả.", en: "The core advantage is machine-processability: search by specific field, filter by value, run statistics in Elasticsearch, Loki, or any log backend. Plain text is faster to eyeball but cannot be efficiently queried." },
    },
    {
      q: { vi: "Metric type nào trong Prometheus phù hợp để đo latency của API (p50, p99)?", en: "Which Prometheus metric type is best for measuring API latency (p50, p99)?" },
      options: [
        { vi: "Counter", en: "Counter" },
        { vi: "Gauge", en: "Gauge" },
        { vi: "Histogram", en: "Histogram" },
        { vi: "Summary", en: "Summary" },
      ],
      answer: 2,
      explain: { vi: "Histogram phân phối giá trị vào các bucket định sẵn, cho phép tính percentile (p50, p95, p99) phía server. Counter chỉ tăng (không phù hợp cho latency). Gauge dùng cho giá trị tức thời. Summary tính percentile phía client và khó aggregate nhiều instance.", en: "Histogram distributes values into predefined buckets, enabling server-side percentile computation (p50, p95, p99). Counter only increases (wrong for latency). Gauge is for instantaneous values. Summary computes percentiles client-side and is hard to aggregate across multiple instances." },
    },
    {
      q: { vi: "RED method trong monitoring là viết tắt của gì?", en: "What does the RED method in monitoring stand for?" },
      options: [
        { vi: "Reliability, Efficiency, Durability", en: "Reliability, Efficiency, Durability" },
        { vi: "Rate, Errors, Duration", en: "Rate, Errors, Duration" },
        { vi: "Requests, Events, Data", en: "Requests, Events, Data" },
        { vi: "Resilience, Errors, Deployment", en: "Resilience, Errors, Deployment" },
      ],
      answer: 1,
      explain: { vi: "RED = <b>R</b>ate (số request/giây), <b>E</b>rrors (tỷ lệ hoặc số request lỗi), <b>D</b>uration (latency/thời gian xử lý request). Ba metric này đủ để đánh giá sức khỏe của bất kỳ API hoặc microservice nào.", en: "RED = <b>R</b>ate (requests per second), <b>E</b>rrors (error rate or count), <b>D</b>uration (request latency). These three metrics are sufficient to judge the health of any API or microservice." },
    },
    {
      q: { vi: "Context propagation trong distributed tracing thực hiện bằng cách nào?", en: "How is context propagation implemented in distributed tracing?" },
      options: [
        { vi: "Lưu trace ID vào database chia sẻ giữa các service", en: "Store the trace ID in a shared database between services" },
        { vi: "Gửi trace ID và span ID qua HTTP header từ service này sang service khác", en: "Pass the trace ID and span ID via HTTP headers from one service to the next" },
        { vi: "Ghi trace ID vào log file rồi đọc lại", en: "Write the trace ID to a log file and read it back" },
        { vi: "Dùng shared memory giữa các process", en: "Use shared memory between processes" },
      ],
      answer: 1,
      explain: { vi: "Trace ID và parent span ID được truyền qua HTTP header (ví dụ <code>traceparent</code> theo chuẩn W3C Trace Context). Service nhận header này, tạo span con với đúng parent, và tiếp tục truyền header xuống service tiếp theo.", en: "The trace ID and parent span ID are passed via HTTP headers (e.g. <code>traceparent</code> per W3C Trace Context). The receiving service creates a child span with the correct parent and forwards the header to the next service." },
    },
    {
      q: { vi: "Sự khác nhau giữa SLO và SLA là gì?", en: "What is the difference between an SLO and an SLA?" },
      options: [
        { vi: "SLO là mục tiêu đo lường, SLA là cam kết hợp đồng có hình phạt", en: "SLO is an internal target, SLA is a contractual commitment with penalties" },
        { vi: "SLO dùng cho backend, SLA dùng cho frontend", en: "SLO is for backend, SLA is for frontend" },
        { vi: "SLO là viết tắt của SLA với phiên bản mới hơn", en: "SLO is just a newer acronym for SLA" },
        { vi: "SLA chỉ áp dụng cho infrastructure, SLO cho application", en: "SLA only applies to infrastructure, SLO to applications" },
      ],
      answer: 0,
      explain: { vi: "SLO là mục tiêu nội bộ bạn tự đặt ra (ví dụ: 99.5% uptime) — không có hình phạt nếu trượt nhưng là cơ sở để cải thiện. SLA là cam kết pháp lý/hợp đồng với khách hàng; vi phạm SLA dẫn đến hình phạt cụ thể (hoàn tiền, phạt hợp đồng).", en: "SLO is an internal target you set for yourself (e.g. 99.5% uptime) — no formal penalty for missing it, but it drives improvement. SLA is a legal/contractual commitment to customers; breaching an SLA triggers specific penalties (credits, contract fines)." },
    },
    {
      q: { vi: "Alert fatigue xảy ra khi nào và hậu quả nguy hiểm nhất là gì?", en: "When does alert fatigue occur and what is the most dangerous consequence?" },
      options: [
        { vi: "Khi alert threshold quá cao, kỹ sư bỏ lỡ lỗi nhỏ", en: "When alert thresholds are too high, engineers miss minor errors" },
        { vi: "Khi có quá nhiều alert noise, kỹ sư bắt đầu bỏ qua cả alert thật sự nghiêm trọng", en: "When there is too much alert noise, engineers start ignoring genuinely critical alerts" },
        { vi: "Khi alert gửi quá chậm, không kịp phản ứng", en: "When alerts are sent too slowly to react in time" },
        { vi: "Khi không đủ người on-call để xử lý alert", en: "When there are not enough on-call engineers to handle alerts" },
      ],
      answer: 1,
      explain: { vi: "Alert fatigue xảy ra khi quá nhiều alert vô nghĩa (false positive, low-priority) khiến kỹ sư \"điếc\" với cảnh báo. Hậu quả nguy hiểm nhất: khi incident thật xảy ra, alert bị bỏ qua hoặc phản ứng chậm. Giải pháp: chỉ alert trên symptom, mỗi alert phải actionable.", en: "Alert fatigue happens when too many noisy (false positive, low-priority) alerts cause engineers to become desensitized. The most dangerous consequence: when a real incident fires, the alert is missed or acted on too late. Fix: alert only on symptoms, every alert must be actionable." },
    },
    {
      q: { vi: "OpenTelemetry giải quyết vấn đề gì trong observability?", en: "What problem does OpenTelemetry solve in observability?" },
      options: [
        { vi: "Tự động sửa lỗi trong code khi phát hiện exception", en: "Automatically fixes bugs in code when exceptions are detected" },
        { vi: "Cung cấp một chuẩn instrument duy nhất, không bị lock-in vào một vendor cụ thể", en: "Provides a single instrumentation standard with no vendor lock-in" },
        { vi: "Thay thế hoàn toàn Prometheus và Grafana", en: "Fully replaces Prometheus and Grafana" },
        { vi: "Chỉ hoạt động với Kubernetes", en: "Only works with Kubernetes" },
      ],
      answer: 1,
      explain: { vi: "OpenTelemetry giải quyết vendor lock-in: bạn instrument code một lần với OTel API/SDK (chuẩn CNCF), rồi có thể export sang bất kỳ backend nào (Jaeger, Zipkin, Datadog, Grafana Tempo) chỉ bằng cách đổi cấu hình exporter — không cần sửa code ứng dụng.", en: "OpenTelemetry solves vendor lock-in: instrument your code once with the OTel API/SDK (CNCF standard), then export to any backend (Jaeger, Zipkin, Datadog, Grafana Tempo) by swapping the exporter config — no application code changes needed." },
    },
  ],
});
