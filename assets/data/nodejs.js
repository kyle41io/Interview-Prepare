/* Node.js (+ Express & NestJS) — backend topic */
PREP.register({
  id: "nodejs",
  icon: "🟩",
  category: "backend",
  title: { vi: "Node.js (+ Express & NestJS)", en: "Node.js (+ Express & NestJS)" },
  blurb: {
    vi: "Runtime JavaScript phía server mạnh nhất hiện nay. Hiểu event loop, module system, async patterns, cùng hai framework phổ biến Express (nhẹ, linh hoạt) và NestJS (có cấu trúc, TypeScript-first).",
    en: "The most widely-used server-side JavaScript runtime. Understand the event loop, module system, async patterns, and two dominant frameworks: Express (minimalist, flexible) and NestJS (opinionated, TypeScript-first).",
  },
  sections: [
    {
      id: "what-is-nodejs",
      title: { vi: "1. Node.js là gì & tại sao dùng nó", en: "1. What is Node.js & why use it" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Node.js</b> là runtime JavaScript chạy ngoài trình duyệt, được xây dựng trên <b>V8 engine</b> của Google Chrome. Điểm khác biệt cốt lõi: Node dùng mô hình <b>non-blocking, event-driven I/O</b> và chạy trên <b>một luồng duy nhất (single thread)</b> — thay vì tạo một thread mới cho mỗi request như các server truyền thống.",
          en: "<b>Node.js</b> is a JavaScript runtime outside the browser, built on Google Chrome's <b>V8 engine</b>. Its core distinction: Node uses a <b>non-blocking, event-driven I/O</b> model and runs on a <b>single thread</b> — instead of spawning a new thread per request like traditional servers.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>V8 engine</b> — biên dịch JavaScript thành mã máy (machine code) tốc độ cao.", en: "<b>V8 engine</b> — compiles JavaScript to high-performance native machine code." },
            { vi: "<b>libuv</b> — thư viện C cung cấp event loop và thread pool; xử lý I/O bất đồng bộ (file, network, DNS).", en: "<b>libuv</b> — C library powering the event loop and thread pool; handles async I/O (file, network, DNS)." },
            { vi: "<b>Non-blocking I/O</b> — khi gọi file/network, Node đăng ký callback rồi tiếp tục xử lý request khác; callback được gọi khi kết quả sẵn sàng.", en: "<b>Non-blocking I/O</b> — on a file/network call, Node registers a callback then handles other requests; the callback fires when the result is ready." },
            { vi: "<b>Tốt cho I/O-bound</b>: API server, real-time chat, streaming, microservices — hàng ngàn kết nối đồng thời với ít RAM.", en: "<b>Great for I/O-bound</b> work: API servers, real-time chat, streaming, microservices — thousands of concurrent connections with low RAM." },
            { vi: "<b>Không tốt cho CPU-bound</b>: video encoding, machine learning, thuật toán nặng — chặn event loop → mọi request bị đợi.", en: "<b>Not ideal for CPU-bound</b> work: video encoding, ML inference, heavy computation — these block the event loop → every request waits." },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Node không phải đa luồng — nó đạt concurrency cao bằng cách <b>không chặn</b> trong lúc đợi I/O. Đây là câu hỏi phỏng vấn rất hay: \"Node.js có thực sự parallel không?\" — Không, nhưng nó <b>concurrent</b> cho I/O nhờ event loop.",
          en: "Node is not multi-threaded — it achieves high concurrency by <b>not blocking</b> while waiting for I/O. A classic interview question: \"Is Node.js truly parallel?\" — No, but it is <b>concurrent</b> for I/O thanks to the event loop.",
        },
      ],
    },
    {
      id: "event-loop",
      title: { vi: "2. Event Loop (chủ đề số 1 trong phỏng vấn)", en: "2. The Event Loop (interview topic #1)" },
      blocks: [
        {
          type: "prose",
          vi: "Event loop là cơ chế trung tâm cho phép Node.js xử lý nhiều việc trên một luồng. Nó liên tục kiểm tra hàng đợi callback và thực thi theo các <b>phase (pha)</b> có thứ tự cố định.",
          en: "The event loop is the central mechanism letting Node.js handle many operations on one thread. It continuously checks callback queues and executes them in fixed <b>phases</b>.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            { vi: "<b>timers</b> — chạy callback của <code>setTimeout</code> và <code>setInterval</code> đã hết hạn.", en: "<b>timers</b> — runs expired <code>setTimeout</code> and <code>setInterval</code> callbacks." },
            { vi: "<b>pending callbacks</b> — callback I/O bị hoãn từ vòng trước (lỗi TCP, v.v.).", en: "<b>pending callbacks</b> — I/O callbacks deferred from the previous iteration (e.g. TCP errors)." },
            { vi: "<b>idle / prepare</b> — nội bộ libuv.", en: "<b>idle / prepare</b> — internal libuv phase." },
            { vi: "<b>poll</b> — lấy các sự kiện I/O mới; thực thi I/O callback. Đây là pha chính: nếu không có gì, loop <b>chờ</b> ở đây.", en: "<b>poll</b> — retrieves new I/O events; executes I/O callbacks. This is the main phase: if idle, the loop <b>waits</b> here." },
            { vi: "<b>check</b> — chạy callback của <code>setImmediate</code>.", en: "<b>check</b> — runs <code>setImmediate</code> callbacks." },
            { vi: "<b>close callbacks</b> — ví dụ <code>socket.on('close', ...)</code>.", en: "<b>close callbacks</b> — e.g. <code>socket.on('close', ...)</code>." },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>Microtasks vs Macrotasks:</b> Sau <b>mỗi pha</b> (và giữa các callback), Node xử lý hết toàn bộ <b>microtask queue</b> trước khi chuyển pha.<br>• <b>Microtasks</b> (ưu tiên cao hơn): <code>process.nextTick</code> (chạy trước), sau đó Promise <code>.then/.catch</code>.<br>• <b>Macrotasks</b> (theo pha): <code>setTimeout</code>, <code>setInterval</code>, <code>setImmediate</code>, I/O callbacks.",
          en: "<b>Microtasks vs Macrotasks:</b> After <b>each phase</b> (and between callbacks), Node drains the entire <b>microtask queue</b> before moving to the next phase.<br>• <b>Microtasks</b> (higher priority): <code>process.nextTick</code> (runs first), then Promise <code>.then/.catch</code>.<br>• <b>Macrotasks</b> (phase-bound): <code>setTimeout</code>, <code>setInterval</code>, <code>setImmediate</code>, I/O callbacks.",
        },
        {
          type: "code",
          code: "// Ordering: nextTick > Promise > setTimeout >= setImmediate\nconsole.log('1 — sync');\n\nsetTimeout(() => console.log('5 — setTimeout'), 0);\n\nsetImmediate(() => console.log('6 — setImmediate'));\n\nPromise.resolve().then(() => console.log('3 — Promise microtask'));\n\nprocess.nextTick(() => console.log('2 — nextTick microtask'));\n\nconsole.log('4 — sync (end)');\n\n// Output order:\n// 1 — sync\n// 4 — sync (end)\n// 2 — nextTick microtask    <-- microtask queue drained first\n// 3 — Promise microtask     <-- microtask queue (after nextTick)\n// 5 — setTimeout            <-- macrotask (timers phase)\n// 6 — setImmediate          <-- macrotask (check phase)",
          caption: { vi: "Thứ tự chạy: sync → nextTick → Promise → setTimeout → setImmediate", en: "Execution order: sync → nextTick → Promise → setTimeout → setImmediate" },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<b>Đừng block event loop!</b> Bất kỳ thao tác đồng bộ nặng nào (vòng lặp lớn, JSON.parse trên dữ liệu khổng lồ, crypto đồng bộ) sẽ <b>chặn toàn bộ server</b> — mọi request phải chờ. Dùng <code>worker_threads</code> hoặc tách thành chunk async cho CPU-bound work.",
          en: "<b>Never block the event loop!</b> Any heavy synchronous operation (large loop, JSON.parse on huge data, synchronous crypto) <b>stalls the entire server</b> — every request waits. Use <code>worker_threads</code> or break into async chunks for CPU-bound work.",
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>Thread pool của libuv</b> (mặc định 4 threads, set bằng <code>UV_THREADPOOL_SIZE</code>): xử lý các thao tác I/O không thể non-blocking thực sự ở kernel level như file system, DNS lookup, bcrypt. Kết quả callback được đưa vào event loop khi hoàn tất.",
          en: "<b>libuv thread pool</b> (default 4 threads, set via <code>UV_THREADPOOL_SIZE</code>): handles operations that cannot truly be non-blocking at the kernel level — file system, DNS lookup, bcrypt. Results are queued back into the event loop when done.",
        },
      ],
    },
    {
      id: "modules-npm",
      title: { vi: "3. Modules & npm", en: "3. Modules & npm" },
      blocks: [
        {
          type: "prose",
          vi: "Node.js hỗ trợ hai hệ thống module: <b>CommonJS</b> (cũ, mặc định) và <b>ES Modules</b> (chuẩn hiện đại). Hiểu sự khác biệt là câu hỏi phỏng vấn rất thường gặp.",
          en: "Node.js supports two module systems: <b>CommonJS</b> (legacy, default) and <b>ES Modules</b> (modern standard). Understanding the difference is a common interview question.",
        },
        {
          type: "table",
          headers: { vi: ["Tiêu chí", "CommonJS (CJS)", "ES Modules (ESM)"], en: ["Feature", "CommonJS (CJS)", "ES Modules (ESM)"] },
          rows: [
            { vi: ["Cú pháp import", "<code>const x = require('./x')</code>", "<code>import x from './x'</code>"], en: ["Import syntax", "<code>const x = require('./x')</code>", "<code>import x from './x'</code>"] },
            { vi: ["Cú pháp export", "<code>module.exports = ...</code>", "<code>export default ...</code> / <code>export {}</code>"], en: ["Export syntax", "<code>module.exports = ...</code>", "<code>export default ...</code> / <code>export {}</code>"] },
            { vi: ["Load", "Synchronous (blocking)", "Asynchronous (non-blocking)"], en: ["Loading", "Synchronous (blocking)", "Asynchronous (non-blocking)"] },
            { vi: ["File extension", "<code>.js</code> (mặc định)", "<code>.mjs</code> hoặc <code>\"type\":\"module\"</code> trong package.json"], en: ["File extension", "<code>.js</code> (default)", "<code>.mjs</code> or <code>\"type\":\"module\"</code> in package.json"] },
            { vi: ["Top-level await", "Không hỗ trợ", "Hỗ trợ"], en: ["Top-level await", "Not supported", "Supported"] },
            { vi: ["Tree-shaking", "Không tốt", "Tốt (static analysis)"], en: ["Tree-shaking", "Poor", "Good (static analysis)"] },
          ],
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>package.json</b> — trung tâm của dự án: tên, version, dependencies, devDependencies, scripts, main/module entry points.", en: "<b>package.json</b> — project hub: name, version, dependencies, devDependencies, scripts, main/module entry points." },
            { vi: "<b>Semver</b>: <code>^1.2.3</code> cho phép minor/patch updates; <code>~1.2.3</code> chỉ cho phép patch; <code>1.2.3</code> pin cứng.", en: "<b>Semver</b>: <code>^1.2.3</code> allows minor/patch updates; <code>~1.2.3</code> allows patch only; <code>1.2.3</code> exact pin." },
            { vi: "<b>npm scripts</b>: <code>npm run build</code>, <code>npm test</code>, <code>npm start</code> — shortcut cho lệnh dài.", en: "<b>npm scripts</b>: <code>npm run build</code>, <code>npm test</code>, <code>npm start</code> — shortcuts for complex commands." },
            { vi: "<b>node_modules</b> — lưu packages cài đặt; không commit lên git. <code>package-lock.json</code> lock version chính xác để build reproducible.", en: "<b>node_modules</b> — installed packages; never commit to git. <code>package-lock.json</code> locks exact versions for reproducible builds." },
          ],
        },
      ],
    },
    {
      id: "async-patterns",
      title: { vi: "4. Async patterns — Callbacks → Promises → async/await", en: "4. Async patterns — Callbacks → Promises → async/await" },
      blocks: [
        {
          type: "prose",
          vi: "JavaScript/Node.js xử lý async qua ba thế hệ API. Mỗi thế hệ giải quyết nhược điểm của thế hệ trước. Phỏng vấn hay hỏi về tradeoff và cách xử lý lỗi.",
          en: "JavaScript/Node.js handles async work through three generations of APIs. Each generation addresses the shortcomings of the previous one. Interviews frequently ask about tradeoffs and error handling.",
        },
        {
          type: "code",
          code: "// ---- 1. CALLBACKS (Node.js gốc) ----\n// Error-first convention: callback(err, result)\nconst fs = require('fs');\nfs.readFile('data.txt', 'utf8', (err, data) => {\n  if (err) return console.error(err); // handle error first\n  console.log(data);\n});\n\n// Callback hell — lồng quá nhiều tầng, khó debug:\ngetUser(id, (err, user) => {\n  getOrders(user.id, (err, orders) => {\n    getItems(orders[0].id, (err, items) => {\n      // pyramid of doom...\n    });\n  });\n});\n\n// ---- 2. PROMISES ----\nfetch('/api/user')\n  .then(res => res.json())\n  .then(user => fetch('/api/orders/' + user.id))\n  .then(res => res.json())\n  .catch(err => console.error(err)); // one catch for the chain\n\n// ---- 3. ASYNC / AWAIT (cú pháp hiện đại nhất) ----\nasync function loadUser(id) {\n  try {\n    const res = await fetch('/api/user/' + id);  // non-blocking\n    const user = await res.json();\n    return user;\n  } catch (err) {\n    console.error('Failed:', err);\n    throw err; // re-throw so caller knows\n  }\n}\n\n// Parallel: don't await sequentially if independent!\nconst [user, config] = await Promise.all([\n  fetchUser(id),\n  fetchConfig(),\n]);\n\n// Unhandled rejection — always handle!\nprocess.on('unhandledRejection', (reason) => {\n  console.error('Unhandled:', reason);\n  process.exit(1);\n});",
          caption: { vi: "Ba thế hệ async: callbacks → Promises → async/await. Luôn xử lý lỗi!", en: "Three async generations: callbacks → Promises → async/await. Always handle errors!" },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Dùng <code>Promise.all()</code> khi các async task <b>độc lập</b> với nhau — chạy song song, tổng thời gian = task chậm nhất (không phải tổng). Dùng <code>Promise.allSettled()</code> khi muốn kết quả của tất cả dù có lỗi.",
          en: "Use <code>Promise.all()</code> when async tasks are <b>independent</b> — they run in parallel, total time = slowest task (not sum). Use <code>Promise.allSettled()</code> when you need all results regardless of failures.",
        },
      ],
    },
    {
      id: "streams-events",
      title: { vi: "5. Streams, Buffers & EventEmitter", en: "5. Streams, Buffers & EventEmitter" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Buffer</b> — vùng bộ nhớ cố định để lưu dữ liệu nhị phân (binary). <b>Stream</b> — xử lý dữ liệu theo từng chunk (mảnh) thay vì load toàn bộ vào RAM. <b>EventEmitter</b> — pub/sub pattern nội bộ của Node, là nền tảng của streams, http.Server, process v.v.",
          en: "<b>Buffer</b> — fixed-size raw binary memory region. <b>Stream</b> — processes data in chunks instead of loading it all into RAM. <b>EventEmitter</b> — Node's built-in pub/sub pattern; the foundation of streams, http.Server, process, etc.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Readable stream</b> — nguồn dữ liệu (file đọc, HTTP request, stdin).", en: "<b>Readable stream</b> — data source (file read, HTTP request, stdin)." },
            { vi: "<b>Writable stream</b> — đích dữ liệu (file ghi, HTTP response, stdout).", en: "<b>Writable stream</b> — data sink (file write, HTTP response, stdout)." },
            { vi: "<b>Transform stream</b> — vừa đọc vừa ghi, có biến đổi (zlib compress, crypto cipher).", en: "<b>Transform stream</b> — readable + writable with transformation (zlib compress, crypto cipher)." },
            { vi: "<b>Backpressure</b> — cơ chế kiểm soát tốc độ: nếu writable xử lý chậm hơn readable, stream <b>tạm dừng</b> readable để tránh OOM. <code>pipe()</code> xử lý backpressure tự động.", en: "<b>Backpressure</b> — flow control: if the writable is slower than the readable, the stream <b>pauses</b> the readable to avoid OOM. <code>pipe()</code> handles backpressure automatically." },
          ],
        },
        {
          type: "code",
          code: "const fs = require('fs');\nconst zlib = require('zlib');\nconst { EventEmitter } = require('events');\n\n// Stream + pipe: đọc file lớn, nén gzip, ghi ra — tiết kiệm RAM tối đa\nfs.createReadStream('big.log')\n  .pipe(zlib.createGzip())\n  .pipe(fs.createWriteStream('big.log.gz'));\n\n// EventEmitter pattern\nclass MyEmitter extends EventEmitter {}\nconst emitter = new MyEmitter();\n\nemitter.on('data', (payload) => console.log('received:', payload));\nemitter.on('error', (err) => console.error('error:', err)); // always handle 'error'\n\nemitter.emit('data', { id: 1 }); // triggers the listener above",
          caption: { vi: "Pipe xử lý backpressure tự động; luôn lắng nghe sự kiện 'error' trên EventEmitter.", en: "pipe() handles backpressure automatically; always listen for the 'error' event on EventEmitters." },
        },
      ],
    },
    {
      id: "http-core",
      title: { vi: "6. HTTP server với module core & tại sao dùng framework", en: "6. HTTP server with the core module & why you reach for a framework" },
      blocks: [
        {
          type: "prose",
          vi: "Node.js có module <code>http</code> tích hợp sẵn để tạo server. Dùng được, nhưng phải tự xử lý routing, body parsing, headers, error handling — rất verbose. Đó là lý do framework như Express ra đời.",
          en: "Node.js ships with the built-in <code>http</code> module for creating servers. It works, but you must manually handle routing, body parsing, headers, and error handling — very verbose. That's why frameworks like Express exist.",
        },
        {
          type: "code",
          code: "const http = require('http');\n\nconst server = http.createServer((req, res) => {\n  // Manual routing — gets tedious fast\n  if (req.method === 'GET' && req.url === '/') {\n    res.writeHead(200, { 'Content-Type': 'application/json' });\n    res.end(JSON.stringify({ message: 'Hello World' }));\n  } else {\n    res.writeHead(404);\n    res.end('Not Found');\n  }\n});\n\nserver.listen(3000, () => console.log('Listening on http://localhost:3000'));\n\n// Problems with raw http module:\n// - No routing abstraction\n// - No body parsing (must buffer req data manually)\n// - No middleware concept\n// - No static file serving\n// => Use Express or NestJS instead",
          caption: { vi: "Raw http module — hữu ích để hiểu nền, không thực tế cho dự án thật.", en: "Raw http module — useful for understanding internals, impractical for real projects." },
        },
      ],
    },
    {
      id: "express",
      title: { vi: "7. Express.js — minimalist & unopinionated", en: "7. Express.js — minimalist & unopinionated" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Express</b> là web framework Node.js nhỏ gọn nhất, được dùng nhiều nhất. Triết lý: cung cấp <b>routing</b> và <b>middleware</b> cơ bản, phần còn lại do dev tự quyết định. Không có cấu trúc thư mục cố định, không bắt buộc TypeScript, không có DI container.",
          en: "<b>Express</b> is the most widely-used, minimalist Node.js web framework. Philosophy: provide <b>routing</b> and a <b>middleware</b> pipeline, leave everything else to the developer. No enforced folder structure, no required TypeScript, no DI container.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Middleware</b> — hàm có chữ ký <code>(req, res, next)</code>. Gọi <code>next()</code> để chuyển sang middleware tiếp theo; không gọi thì pipeline dừng tại đây. Chạy theo thứ tự khai báo.", en: "<b>Middleware</b> — function with signature <code>(req, res, next)</code>. Call <code>next()</code> to pass to the next middleware; skip it to end the pipeline. Executes in declaration order." },
            { vi: "<b>Error-handling middleware</b> — có 4 tham số: <code>(err, req, res, next)</code>. Express nhận ra đây là error handler và chỉ gọi khi có lỗi.", en: "<b>Error-handling middleware</b> — 4 parameters: <code>(err, req, res, next)</code>. Express recognizes this as an error handler and only invokes it when an error is passed." },
            { vi: "<b>express.Router</b> — tạo mini-app để group routes theo tính năng (ví dụ: <code>/users</code>, <code>/products</code>).", en: "<b>express.Router</b> — creates a mini-app to group routes by feature (e.g. <code>/users</code>, <code>/products</code>)." },
            { vi: "Middleware phổ biến: <code>express.json()</code> (parse body JSON), <code>cors()</code>, <code>helmet()</code> (security headers), <code>morgan</code> (logging).", en: "Common middleware: <code>express.json()</code> (parse JSON body), <code>cors()</code>, <code>helmet()</code> (security headers), <code>morgan</code> (logging)." },
          ],
        },
        {
          type: "code",
          code: "const express = require('express');\nconst app = express();\n\n// Global middleware\napp.use(express.json());         // parse JSON bodies\napp.use(express.urlencoded({ extended: true }));\n\n// Custom logging middleware\napp.use((req, res, next) => {\n  console.log(`${req.method} ${req.url}`);\n  next(); // must call next() to continue\n});\n\n// Router — group related routes\nconst userRouter = express.Router();\n\nuserRouter.get('/', async (req, res) => {\n  const users = await UserService.findAll();\n  res.json(users);\n});\n\nuserRouter.get('/:id', async (req, res, next) => {\n  try {\n    const user = await UserService.findById(req.params.id);\n    if (!user) return res.status(404).json({ error: 'Not found' });\n    res.json(user);\n  } catch (err) {\n    next(err); // forward to error handler\n  }\n});\n\nuserRouter.post('/', async (req, res, next) => {\n  try {\n    const user = await UserService.create(req.body);\n    res.status(201).json(user);\n  } catch (err) {\n    next(err);\n  }\n});\n\napp.use('/users', userRouter);\n\n// Error-handling middleware (4 args) — MUST be last\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });\n});\n\napp.listen(3000, () => console.log('Express server on :3000'));",
          caption: { vi: "Express app đầy đủ: global middleware, Router, error handler 4-tham-số.", en: "Full Express app: global middleware, Router, 4-argument error handler." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Thứ tự middleware <b>quan trọng</b>. Error handler phải đặt <b>sau cùng</b> — nếu không Express sẽ không nhận ra nó. Luôn dùng <code>next(err)</code> thay vì ném lỗi trong async handler.",
          en: "Middleware order <b>matters</b>. The error handler must be registered <b>last</b> — otherwise Express won't recognize it. Always use <code>next(err)</code> instead of throwing in async handlers.",
        },
      ],
    },
    {
      id: "nestjs",
      title: { vi: "8. NestJS — opinionated, TypeScript-first", en: "8. NestJS — opinionated, TypeScript-first" },
      blocks: [
        {
          type: "prose",
          vi: "<b>NestJS</b> là framework Node.js có cấu trúc chặt chẽ, lấy cảm hứng từ Angular, chạy trên Express (hoặc Fastify). Được xây dựng hoàn toàn bằng TypeScript và bắt buộc dùng TypeScript. Ba khối cấu trúc chính: <b>Module / Controller / Provider (Service)</b>.",
          en: "<b>NestJS</b> is a structured, Angular-inspired Node.js framework that runs on top of Express (or Fastify). Built entirely in TypeScript and requires TypeScript. Three core building blocks: <b>Module / Controller / Provider (Service)</b>.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Module</b> — đơn vị tổ chức code. Mỗi feature là một module (<code>UsersModule</code>, <code>AuthModule</code>). <code>AppModule</code> là root module.", en: "<b>Module</b> — code organisation unit. Each feature is a module (<code>UsersModule</code>, <code>AuthModule</code>). <code>AppModule</code> is the root module." },
            { vi: "<b>Controller</b> — xử lý HTTP request/response; khai báo route bằng decorator (<code>@Get</code>, <code>@Post</code>, <code>@Param</code>, <code>@Body</code>). Không chứa business logic.", en: "<b>Controller</b> — handles HTTP request/response; declares routes via decorators (<code>@Get</code>, <code>@Post</code>, <code>@Param</code>, <code>@Body</code>). Contains no business logic." },
            { vi: "<b>Provider / Service</b> — chứa business logic; được inject vào controller qua <b>Dependency Injection</b> container. Decorator <code>@Injectable()</code> đánh dấu class có thể được DI.", en: "<b>Provider / Service</b> — holds business logic; injected into controllers via the <b>Dependency Injection</b> container. The <code>@Injectable()</code> decorator marks a class as DI-managed." },
            { vi: "<b>DTO (Data Transfer Object)</b> — class TypeScript mô tả shape của request/response body; dùng với <code>class-validator</code> để validate input tự động.", en: "<b>DTO (Data Transfer Object)</b> — TypeScript class describing request/response shape; used with <code>class-validator</code> to automatically validate input." },
            { vi: "<b>Guards</b> — kiểm tra quyền truy cập trước khi route handler chạy (authentication/authorization). Tương đương auth middleware nhưng có cấu trúc.", en: "<b>Guards</b> — check access rights before the route handler executes (authentication/authorization). Equivalent to auth middleware but with more structure." },
            { vi: "<b>Pipes</b> — transform và validate dữ liệu đầu vào (ví dụ: <code>ParseIntPipe</code> biến <code>':id'</code> string thành number).", en: "<b>Pipes</b> — transform and validate incoming data (e.g. <code>ParseIntPipe</code> converts <code>':id'</code> string to number)." },
          ],
        },
        {
          type: "code",
          code: "// users.service.ts\nimport { Injectable, NotFoundException } from '@nestjs/common';\n\n@Injectable()\nexport class UsersService {\n  private users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];\n\n  findAll() {\n    return this.users;\n  }\n\n  findOne(id: number) {\n    const user = this.users.find(u => u.id === id);\n    if (!user) throw new NotFoundException(`User ${id} not found`);\n    return user;\n  }\n}\n\n// users.controller.ts\nimport { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';\nimport { UsersService } from './users.service';\n\n@Controller('users')  // base route: /users\nexport class UsersController {\n  // DI: NestJS injects UsersService automatically\n  constructor(private readonly usersService: UsersService) {}\n\n  @Get()               // GET /users\n  findAll() {\n    return this.usersService.findAll();\n  }\n\n  @Get(':id')          // GET /users/:id\n  findOne(@Param('id', ParseIntPipe) id: number) {\n    return this.usersService.findOne(id);\n  }\n}\n\n// users.module.ts\nimport { Module } from '@nestjs/common';\nimport { UsersController } from './users.controller';\nimport { UsersService } from './users.service';\n\n@Module({\n  controllers: [UsersController],\n  providers: [UsersService],   // registers UsersService in the DI container\n  exports: [UsersService],     // optional: share with other modules\n})\nexport class UsersModule {}",
          caption: { vi: "NestJS: Module khai báo Controller + Service; DI inject service tự động qua constructor.", en: "NestJS: Module declares Controller + Service; DI auto-injects service via the constructor." },
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>Dependency Injection (DI)</b> trong NestJS: khi Controller yêu cầu <code>UsersService</code> trong constructor, NestJS tự động tạo (hoặc tái sử dụng) instance và inject vào. Kết quả: code dễ test (mock service), dễ swap implementation, không tight-coupling.",
          en: "<b>Dependency Injection (DI)</b> in NestJS: when a Controller requests <code>UsersService</code> in its constructor, NestJS automatically creates (or reuses) an instance and injects it. Result: code is easy to test (mock the service), easy to swap implementations, no tight coupling.",
        },
      ],
    },
    {
      id: "express-vs-nestjs",
      title: { vi: "9. Express vs NestJS — so sánh", en: "9. Express vs NestJS — comparison" },
      blocks: [
        {
          type: "table",
          headers: { vi: ["Tiêu chí", "Express", "NestJS"], en: ["Feature", "Express", "NestJS"] },
          rows: [
            { vi: ["Cấu trúc dự án", "Tự do, không bắt buộc", "Có quy ước: Module/Controller/Service"], en: ["Project structure", "Free-form, unopinionated", "Opinionated: Module/Controller/Service"] },
            { vi: ["TypeScript", "Tùy chọn (cần cấu hình thêm)", "Bắt buộc, tích hợp sẵn"], en: ["TypeScript", "Optional (extra config needed)", "Required, first-class support"] },
            { vi: ["Dependency Injection", "Không có sẵn (tự cài)", "Tích hợp sẵn (IoC container)"], en: ["Dependency Injection", "None built-in (DIY)", "Built-in IoC container"] },
            { vi: ["Learning curve", "Thấp — vài giờ là dùng được", "Trung bình — cần học decorators, DI, modules"], en: ["Learning curve", "Low — productive in hours", "Moderate — learn decorators, DI, modules"] },
            { vi: ["Boilerplate", "Ít", "Nhiều hơn (nhưng nhất quán)"], en: ["Boilerplate", "Minimal", "More (but consistent)"] },
            { vi: ["Testing", "Tự setup mock", "DI làm unit test dễ; tích hợp Jest sẵn"], en: ["Testing", "Manual mocking setup", "DI makes unit testing easy; Jest integrated"] },
            { vi: ["Websockets, queues", "Cần thêm thư viện rời", "Tích hợp (@nestjs/websockets, @nestjs/bull)"], en: ["WebSockets, queues", "Separate libraries", "First-party integration (@nestjs/websockets, @nestjs/bull)"] },
            { vi: ["Chọn khi nào", "Prototype nhanh, team nhỏ, microservice đơn giản", "Team lớn, codebase enterprise, cần nhất quán"], en: ["Choose when", "Quick prototype, small team, simple microservice", "Large team, enterprise codebase, need consistency"] },
          ],
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Express = con dao bấm — nhanh, nhẹ, tự do. NestJS = toolbox có cấu trúc — chậm hơn ban đầu nhưng scale tốt hơn khi team lớn. Nếu đã biết Angular, NestJS rất quen thuộc.",
          en: "Express = a Swiss army knife — fast, light, flexible. NestJS = a structured toolbox — steeper start but scales better with large teams. If you know Angular, NestJS will feel very familiar.",
        },
      ],
    },
    {
      id: "performance-ops",
      title: { vi: "10. Performance & vận hành (Production tips)", en: "10. Performance & ops (Production tips)" },
      blocks: [
        {
          type: "prose",
          vi: "Node.js đơn luồng có điểm yếu với CPU-bound. Các chiến lược để scale và vận hành an toàn trong production:",
          en: "Node.js's single thread is a weakness for CPU-bound work. Strategies to scale and operate safely in production:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>cluster module</b> — fork nhiều process con (thường = số CPU core), mỗi process có event loop riêng, dùng chung cùng port qua IPC. PM2 làm điều này tự động.", en: "<b>cluster module</b> — forks multiple child processes (usually = CPU core count), each with its own event loop, sharing the same port via IPC. PM2 automates this." },
            { vi: "<b>worker_threads</b> — chạy JavaScript CPU-intensive trên thread riêng, chia sẻ bộ nhớ qua <code>SharedArrayBuffer</code>. Khác cluster: cùng process, threads thực sự.", en: "<b>worker_threads</b> — runs CPU-intensive JavaScript on a separate thread, sharing memory via <code>SharedArrayBuffer</code>. Unlike cluster: same process, true threads." },
            { vi: "<b>Env config</b> — dùng <code>process.env</code> và thư viện như <code>dotenv</code> hoặc <code>@nestjs/config</code>. Không hardcode secrets trong code.", en: "<b>Env config</b> — use <code>process.env</code> with <code>dotenv</code> or <code>@nestjs/config</code>. Never hardcode secrets in code." },
            { vi: "<b>Helmet</b> — middleware Express/NestJS set các HTTP security headers tự động (X-Frame-Options, Content-Security-Policy, v.v.).", en: "<b>Helmet</b> — Express/NestJS middleware that automatically sets HTTP security headers (X-Frame-Options, Content-Security-Policy, etc.)." },
            { vi: "<b>Input validation</b> — luôn validate và sanitize dữ liệu đầu vào. Express: dùng <code>express-validator</code> hoặc <code>zod</code>. NestJS: dùng <code>class-validator</code> + <code>ValidationPipe</code>.", en: "<b>Input validation</b> — always validate and sanitize input. Express: use <code>express-validator</code> or <code>zod</code>. NestJS: use <code>class-validator</code> + <code>ValidationPipe</code>." },
            { vi: "<b>Rate limiting</b> — dùng <code>express-rate-limit</code> hoặc <code>@nestjs/throttler</code> để chống brute force và DDoS.", en: "<b>Rate limiting</b> — use <code>express-rate-limit</code> or <code>@nestjs/throttler</code> to defend against brute force and DDoS." },
            { vi: "<b>Graceful shutdown</b> — lắng nghe <code>SIGTERM</code>/<code>SIGINT</code>, dừng nhận request mới, chờ xử lý xong request hiện tại, đóng DB connection rồi mới thoát.", en: "<b>Graceful shutdown</b> — listen for <code>SIGTERM</code>/<code>SIGINT</code>, stop accepting new requests, finish in-flight requests, close DB connections, then exit." },
          ],
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Câu trả lời interview gọn: <b>\"Node.js không phải là đa luồng, nhưng nó handle concurrency cao nhờ non-blocking I/O. Với CPU-bound, dùng worker_threads. Để scale multi-core, dùng cluster hoặc PM2. Không bao giờ block event loop.\"</b>",
          en: "Crisp interview answer: <b>\"Node.js is not multi-threaded, but it handles high concurrency via non-blocking I/O. For CPU-bound work, use worker_threads. To leverage multi-core, use cluster or PM2. Never block the event loop.\"</b>",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "V8 và libuv đóng vai trò gì trong Node.js?", en: "What roles do V8 and libuv play in Node.js?" },
      back: { vi: "<b>V8</b> biên dịch và thực thi JavaScript (JIT → machine code). <b>libuv</b> cung cấp event loop, thread pool và async I/O abstraction (file, network, DNS) bên dưới Node.js.", en: "<b>V8</b> compiles and executes JavaScript (JIT → machine code). <b>libuv</b> provides the event loop, thread pool, and async I/O abstraction (file, network, DNS) beneath Node.js." },
    },
    {
      front: { vi: "Các phase của event loop Node.js theo thứ tự là gì?", en: "What are the Node.js event loop phases in order?" },
      back: { vi: "<b>timers → pending callbacks → idle/prepare → poll → check → close callbacks</b>. Pha <b>poll</b> là nơi I/O event được lấy. Pha <b>check</b> chạy <code>setImmediate</code>. Giữa các pha: microtask queue (nextTick, Promises) được drain hết.", en: "<b>timers → pending callbacks → idle/prepare → poll → check → close callbacks</b>. The <b>poll</b> phase retrieves I/O events. The <b>check</b> phase runs <code>setImmediate</code>. Between phases: the microtask queue (nextTick, Promises) is fully drained." },
    },
    {
      front: { vi: "process.nextTick vs Promise.then vs setTimeout — thứ tự ưu tiên?", en: "process.nextTick vs Promise.then vs setTimeout — priority order?" },
      back: { vi: "<code>process.nextTick</code> (microtask, ưu tiên cao nhất) → <code>Promise.then</code> (microtask) → <code>setTimeout</code> / <code>setImmediate</code> (macrotask). Sync code luôn chạy trước mọi thứ.", en: "<code>process.nextTick</code> (microtask, highest priority) → <code>Promise.then</code> (microtask) → <code>setTimeout</code> / <code>setImmediate</code> (macrotask). Synchronous code always runs before all of these." },
    },
    {
      front: { vi: "CommonJS và ES Modules khác nhau thế nào?", en: "How do CommonJS and ES Modules differ?" },
      back: { vi: "<b>CJS</b>: <code>require()</code>/<code>module.exports</code>, load đồng bộ, là mặc định. <b>ESM</b>: <code>import</code>/<code>export</code>, load bất đồng bộ, hỗ trợ top-level await và tree-shaking tốt hơn. ESM là chuẩn hiện đại.", en: "<b>CJS</b>: <code>require()</code>/<code>module.exports</code>, synchronous load, the default. <b>ESM</b>: <code>import</code>/<code>export</code>, async load, supports top-level await and better tree-shaking. ESM is the modern standard." },
    },
    {
      front: { vi: "Callback hell là gì và cách giải quyết?", en: "What is callback hell and how do you solve it?" },
      back: { vi: "Callback hell = lồng nhiều tầng callback async dẫn đến code hình \"pyramid of doom\", khó đọc và debug. Giải pháp: dùng <b>Promises</b> (chain .then) hoặc <b>async/await</b> để viết async code trông như đồng bộ.", en: "Callback hell = deeply nested async callbacks forming a \"pyramid of doom\" — hard to read and debug. Solutions: use <b>Promises</b> (chain .then) or <b>async/await</b> to write async code that looks synchronous." },
    },
    {
      front: { vi: "Backpressure trong streams là gì?", en: "What is backpressure in streams?" },
      back: { vi: "Backpressure xảy ra khi writable stream xử lý dữ liệu chậm hơn readable stream gửi. Node.js stream tự động <b>tạm dừng</b> readable để tránh buffer quá tải (OOM). <code>pipe()</code> xử lý backpressure tự động.", en: "Backpressure occurs when a writable stream processes data slower than the readable sends it. Node.js streams automatically <b>pause</b> the readable to prevent buffer overflow (OOM). <code>pipe()</code> handles backpressure automatically." },
    },
    {
      front: { vi: "Express middleware là gì? Chữ ký hàm như thế nào?", en: "What is Express middleware? What is its function signature?" },
      back: { vi: "Middleware là hàm chữ ký <code>(req, res, next)</code> chạy trong request pipeline. Gọi <code>next()</code> để chuyển sang middleware tiếp theo; gọi <code>next(err)</code> để chuyển đến error handler. Error handler có 4 tham số: <code>(err, req, res, next)</code>.", en: "Middleware is a function with signature <code>(req, res, next)</code> that runs in the request pipeline. Call <code>next()</code> to move to the next middleware; call <code>next(err)</code> to jump to the error handler. Error handlers have 4 params: <code>(err, req, res, next)</code>." },
    },
    {
      front: { vi: "Ba khối cấu trúc cốt lõi của NestJS là gì?", en: "What are NestJS's three core building blocks?" },
      back: { vi: "<b>Module</b> (tổ chức code theo feature), <b>Controller</b> (xử lý HTTP route, dùng decorators), <b>Provider/Service</b> (business logic, được inject qua DI container). Tương đương MVC: Controller + Service + Module wrapper.", en: "<b>Module</b> (organises code by feature), <b>Controller</b> (handles HTTP routes, uses decorators), <b>Provider/Service</b> (business logic, injected via DI container). Equivalent to MVC: Controller + Service + Module wrapper." },
    },
    {
      front: { vi: "Dependency Injection trong NestJS hoạt động thế nào?", en: "How does Dependency Injection work in NestJS?" },
      back: { vi: "NestJS có IoC container quản lý vòng đời của providers. Khi class A khai báo class B trong constructor, NestJS tự tạo/tái sử dụng instance B và inject vào A. Class cần đánh dấu <code>@Injectable()</code> và đăng ký trong <code>providers[]</code> của Module.", en: "NestJS has an IoC container managing provider lifecycles. When class A declares class B in its constructor, NestJS automatically creates/reuses a B instance and injects it into A. Classes must be decorated with <code>@Injectable()</code> and registered in the Module's <code>providers[]</code> array." },
    },
    {
      front: { vi: "cluster vs worker_threads trong Node.js — khi nào dùng cái nào?", en: "cluster vs worker_threads in Node.js — when to use each?" },
      back: { vi: "<b>cluster</b>: fork nhiều <b>process</b> riêng biệt (mỗi process = Node.js riêng), dùng để scale multi-core cho web server. <b>worker_threads</b>: chạy JS trên nhiều <b>thread</b> trong cùng process, chia sẻ memory — dùng cho CPU-intensive task (encryption, image processing).", en: "<b>cluster</b>: forks multiple separate <b>processes</b> (each with its own Node.js), used to scale a web server across CPU cores. <b>worker_threads</b>: runs JS on multiple <b>threads</b> in the same process, sharing memory — used for CPU-intensive tasks (encryption, image processing)." },
    },
    {
      front: { vi: "Khi nào chọn Express, khi nào chọn NestJS?", en: "When to choose Express vs NestJS?" },
      back: { vi: "<b>Express</b>: prototype nhanh, team nhỏ, microservice đơn giản, muốn tự do tuyệt đối. <b>NestJS</b>: team lớn, dự án enterprise dài hạn, cần nhất quán cấu trúc, TypeScript bắt buộc, tích hợp WebSocket/queues/testing built-in.", en: "<b>Express</b>: rapid prototype, small team, simple microservice, maximum freedom desired. <b>NestJS</b>: large team, long-term enterprise project, need structural consistency, TypeScript required, built-in WebSocket/queues/testing integration needed." },
    },
    {
      front: { vi: "Tại sao không nên block event loop? Ví dụ?", en: "Why should you never block the event loop? Give an example." },
      back: { vi: "Node.js đơn luồng — mọi request chia sẻ cùng thread. Nếu một thao tác sync nặng chạy (ví dụ <code>JSON.parse</code> trên file GB, vòng lặp tính toán lớn), toàn bộ server <b>đóng băng</b>: không request nào được xử lý cho đến khi thao tác đó xong.", en: "Node.js is single-threaded — all requests share the same thread. If a heavy synchronous operation runs (e.g. <code>JSON.parse</code> on a GB file, large compute loop), the entire server <b>freezes</b>: no requests are handled until that operation finishes." },
    },
  ],
  quiz: [
    {
      q: { vi: "Node.js sử dụng mô hình I/O nào để xử lý nhiều kết nối đồng thời?", en: "Which I/O model does Node.js use to handle many concurrent connections?" },
      options: [
        { vi: "Multi-threaded blocking I/O (một thread mỗi request)", en: "Multi-threaded blocking I/O (one thread per request)" },
        { vi: "Single-threaded non-blocking event-driven I/O", en: "Single-threaded non-blocking event-driven I/O" },
        { vi: "Multi-process forking mỗi request", en: "Multi-process forking per request" },
        { vi: "Coroutine-based cooperative scheduling", en: "Coroutine-based cooperative scheduling" },
      ],
      answer: 1,
      explain: { vi: "Node.js dùng <b>single-threaded non-blocking event-driven I/O</b>. Thay vì tạo thread mới cho mỗi request (tốn RAM), Node đăng ký callback I/O và tiếp tục xử lý request khác. libuv và event loop quản lý điều này.", en: "Node.js uses <b>single-threaded non-blocking event-driven I/O</b>. Instead of spawning a new thread per request (expensive RAM), Node registers I/O callbacks and handles other requests. libuv and the event loop manage this." },
    },
    {
      q: { vi: "Thứ tự thực thi đúng với đoạn code sau là gì?\n`console.log('A'); setTimeout(()=>console.log('B'),0); Promise.resolve().then(()=>console.log('C')); process.nextTick(()=>console.log('D')); console.log('E');`", en: "What is the correct execution order for this code?\n`console.log('A'); setTimeout(()=>console.log('B'),0); Promise.resolve().then(()=>console.log('C')); process.nextTick(()=>console.log('D')); console.log('E');`" },
      options: [
        { vi: "A, E, B, C, D", en: "A, E, B, C, D" },
        { vi: "A, E, D, C, B", en: "A, E, D, C, B" },
        { vi: "A, B, C, D, E", en: "A, B, C, D, E" },
        { vi: "A, E, C, D, B", en: "A, E, C, D, B" },
      ],
      answer: 1,
      explain: { vi: "Sync trước: A, E. Sau đó microtask queue: nextTick trước (D), rồi Promise (C). Cuối cùng macrotask setTimeout (B). Thứ tự: <b>A → E → D → C → B</b>.", en: "Sync first: A, E. Then microtask queue: nextTick runs first (D), then Promise (C). Finally macrotask setTimeout (B). Order: <b>A → E → D → C → B</b>." },
    },
    {
      q: { vi: "Đâu là cú pháp ĐÚNG để export trong CommonJS?", en: "Which is the CORRECT export syntax for CommonJS?" },
      options: [
        { vi: "export default myFunction;", en: "export default myFunction;" },
        { vi: "export { myFunction };", en: "export { myFunction };" },
        { vi: "module.exports = myFunction;", en: "module.exports = myFunction;" },
        { vi: "exports default myFunction;", en: "exports default myFunction;" },
      ],
      answer: 2,
      explain: { vi: "CommonJS dùng <code>module.exports = ...</code> để export và <code>require()</code> để import. <code>export default</code> và <code>export {}</code> là cú pháp ES Modules, không phải CommonJS.", en: "CommonJS uses <code>module.exports = ...</code> to export and <code>require()</code> to import. <code>export default</code> and <code>export {}</code> are ES Module syntax, not CommonJS." },
    },
    {
      q: { vi: "Promise.all() vs Promise.allSettled() khác nhau thế nào?", en: "How does Promise.all() differ from Promise.allSettled()?" },
      options: [
        { vi: "Promise.all() chạy tuần tự; Promise.allSettled() chạy song song", en: "Promise.all() runs sequentially; Promise.allSettled() runs in parallel" },
        { vi: "Promise.all() reject ngay khi có 1 promise fail; Promise.allSettled() đợi hết và trả kết quả của tất cả", en: "Promise.all() rejects immediately on the first failure; Promise.allSettled() waits for all and returns all results" },
        { vi: "Promise.all() chỉ resolve khi tất cả fail; Promise.allSettled() chỉ khi tất cả thành công", en: "Promise.all() only resolves when all fail; Promise.allSettled() only when all succeed" },
        { vi: "Hai cái giống nhau hoàn toàn", en: "They are completely identical" },
      ],
      answer: 1,
      explain: { vi: "<code>Promise.all()</code> <b>short-circuit</b>: reject ngay khi bất kỳ promise nào fail (các promise khác vẫn chạy nhưng kết quả bị bỏ). <code>Promise.allSettled()</code> đợi tất cả hoàn thành và trả về mảng <code>{status, value/reason}</code>.", en: "<code>Promise.all()</code> <b>short-circuits</b>: rejects immediately on any failure (others still run but results are discarded). <code>Promise.allSettled()</code> waits for all to complete and returns an array of <code>{status, value/reason}</code> objects." },
    },
    {
      q: { vi: "Đâu là lý do CHÍNH để dùng Streams khi đọc file lớn trong Node.js?", en: "What is the PRIMARY reason to use Streams when reading large files in Node.js?" },
      options: [
        { vi: "Streams nhanh hơn vì dùng multiple threads", en: "Streams are faster because they use multiple threads" },
        { vi: "Streams xử lý dữ liệu theo chunk → tránh load toàn bộ file vào RAM", en: "Streams process data in chunks → avoid loading the entire file into RAM" },
        { vi: "Streams tự động nén dữ liệu", en: "Streams automatically compress data" },
        { vi: "Streams bypass event loop", en: "Streams bypass the event loop" },
      ],
      answer: 1,
      explain: { vi: "Ưu điểm chính của streams là <b>memory efficiency</b>: xử lý từng chunk (thường 64KB) thay vì buffer toàn bộ file. Đọc file 10GB mà không cần 10GB RAM. Backpressure đảm bảo writable không bị overwhelm.", en: "The primary advantage of streams is <b>memory efficiency</b>: process one chunk at a time (typically 64KB) instead of buffering the entire file. Read a 10 GB file without needing 10 GB of RAM. Backpressure ensures the writable is never overwhelmed." },
    },
    {
      q: { vi: "Trong Express, Error-handling middleware khác middleware thông thường ở điểm gì?", en: "In Express, how does error-handling middleware differ from regular middleware?" },
      options: [
        { vi: "Error-handling middleware không có tham số next", en: "Error-handling middleware has no next parameter" },
        { vi: "Error-handling middleware có 4 tham số: (err, req, res, next)", en: "Error-handling middleware has 4 parameters: (err, req, res, next)" },
        { vi: "Error-handling middleware phải đặt trước tất cả route", en: "Error-handling middleware must be placed before all routes" },
        { vi: "Error-handling middleware chỉ xử lý lỗi HTTP 500", en: "Error-handling middleware only handles HTTP 500 errors" },
      ],
      answer: 1,
      explain: { vi: "Express nhận diện error handler bằng <b>4 tham số</b>: <code>(err, req, res, next)</code>. Đặt <b>sau cùng</b> trong app. Được gọi khi middleware bất kỳ gọi <code>next(err)</code> hoặc throw trong sync code.", en: "Express identifies an error handler by its <b>4 parameters</b>: <code>(err, req, res, next)</code>. It must be registered <b>last</b> in the app. It is called when any middleware calls <code>next(err)</code> or throws synchronously." },
    },
    {
      q: { vi: "Decorator @Injectable() trong NestJS dùng để làm gì?", en: "What does the @Injectable() decorator do in NestJS?" },
      options: [
        { vi: "Khai báo class là HTTP controller", en: "Declares the class as an HTTP controller" },
        { vi: "Đánh dấu class có thể được quản lý và inject bởi NestJS DI container", en: "Marks the class as manageable and injectable by the NestJS DI container" },
        { vi: "Tự động tạo REST endpoints cho class", en: "Automatically generates REST endpoints for the class" },
        { vi: "Kích hoạt TypeScript strict mode cho class", en: "Enables TypeScript strict mode for the class" },
      ],
      answer: 1,
      explain: { vi: "<code>@Injectable()</code> đánh dấu class là <b>provider</b> trong NestJS DI system. NestJS IoC container sẽ quản lý vòng đời của nó và có thể inject nó vào bất kỳ class nào khai báo nó trong constructor (và đã đăng ký trong module).", en: "<code>@Injectable()</code> marks a class as a <b>provider</b> in the NestJS DI system. The NestJS IoC container manages its lifecycle and can inject it into any class that declares it in its constructor (and is registered in the module)." },
    },
    {
      q: { vi: "Để tận dụng nhiều CPU core trong Node.js cho HTTP server, dùng công cụ nào?", en: "To leverage multiple CPU cores for a Node.js HTTP server, which tool do you use?" },
      options: [
        { vi: "worker_threads", en: "worker_threads" },
        { vi: "cluster module hoặc PM2", en: "cluster module or PM2" },
        { vi: "Thêm nhiều event loop", en: "Add multiple event loops" },
        { vi: "setImmediate để phân tải CPU", en: "setImmediate to distribute CPU load" },
      ],
      answer: 1,
      explain: { vi: "<b>cluster</b> fork nhiều Node.js process (mỗi process = 1 core), tất cả dùng chung port. <b>PM2</b> tự động hoá điều này với <code>pm2 start app.js -i max</code>. <code>worker_threads</code> dành cho CPU-bound task, không phải để scale HTTP server.", en: "<b>cluster</b> forks multiple Node.js processes (one per core), all sharing the same port. <b>PM2</b> automates this with <code>pm2 start app.js -i max</code>. <code>worker_threads</code> is for CPU-bound tasks, not scaling an HTTP server." },
    },
    {
      q: { vi: "NestJS mặc định chạy trên framework HTTP nào bên dưới?", en: "Which HTTP framework does NestJS run on top of by default?" },
      options: [
        { vi: "Fastify", en: "Fastify" },
        { vi: "Koa", en: "Koa" },
        { vi: "Express", en: "Express" },
        { vi: "Hapi", en: "Hapi" },
      ],
      answer: 2,
      explain: { vi: "NestJS mặc định dùng <b>Express</b> làm HTTP adapter. Có thể chuyển sang <b>Fastify</b> để có performance cao hơn bằng cách cấu hình adapter khi bootstrap app — NestJS abstraction giữ code controller/service không đổi.", en: "NestJS defaults to <b>Express</b> as its HTTP adapter. You can switch to <b>Fastify</b> for higher performance by configuring the adapter at bootstrap — NestJS's abstraction keeps controller/service code unchanged." },
    },
    {
      q: { vi: "Điều nào dưới đây là KHÔNG ĐÚNG về Node.js?", en: "Which of the following is NOT true about Node.js?" },
      options: [
        { vi: "Node.js phù hợp cho I/O-bound applications", en: "Node.js is well-suited for I/O-bound applications" },
        { vi: "Node.js chạy trên V8 JavaScript engine", en: "Node.js runs on the V8 JavaScript engine" },
        { vi: "Node.js chạy trên nhiều thread để xử lý mỗi request", en: "Node.js runs on multiple threads to handle each request" },
        { vi: "Node.js có thể handle hàng ngàn kết nối đồng thời với ít bộ nhớ", en: "Node.js can handle thousands of concurrent connections with little memory" },
      ],
      answer: 2,
      explain: { vi: "Node.js <b>không</b> tạo thread riêng cho mỗi request — đây là đặc điểm của server truyền thống (Apache thread-per-request). Node.js dùng <b>single thread + event loop</b> để handle nhiều connection đồng thời qua non-blocking I/O.", en: "Node.js does <b>not</b> spawn a separate thread per request — that's the traditional server model (Apache thread-per-request). Node.js uses a <b>single thread + event loop</b> to handle many concurrent connections via non-blocking I/O." },
    },
  ],
});
