/* Python for AI & Backend — language fundamentals topic */
PREP.register({
  id: "python-ai",
  icon: "🐍",
  category: "ai",
  title: { vi: "Python cho AI & Backend", en: "Python for AI & Backend" },
  blurb: {
    vi: "Ngôn ngữ số 1 cho AI/ML và rất phổ biến ở backend. Nắm chắc cú pháp, cấu trúc dữ liệu, OOP, exception handling, tooling và nền tảng numpy/pandas là điều kiện cần trước khi học ML/DL.",
    en: "The #1 language for AI/ML and a strong backend choice. Solid grasp of syntax, data structures, OOP, exception handling, tooling, and numpy/pandas basics is a prerequisite before diving into ML/DL.",
  },
  sections: [
    {
      id: "why-python",
      title: { vi: "1. Vì sao Python cho AI & chạy code", en: "1. Why Python for AI & running code" },
      blocks: [
        {
          type: "prose",
          vi: "Python thống trị AI/ML nhờ <b>hệ sinh thái thư viện</b> (numpy, pandas, scikit-learn, PyTorch, TensorFlow), cú pháp <b>đơn giản, dễ đọc</b> giúp thử nghiệm nhanh (rapid prototyping), và cộng đồng khổng lồ. Python là ngôn ngữ <b>thông dịch (interpreted)</b>, <b>gõ động (dynamically typed)</b> — đánh đổi tốc độ chạy để lấy tốc độ phát triển.",
          en: "Python dominates AI/ML thanks to its <b>library ecosystem</b> (numpy, pandas, scikit-learn, PyTorch, TensorFlow), <b>simple, readable</b> syntax enabling rapid prototyping, and a huge community. Python is <b>interpreted</b> and <b>dynamically typed</b> — trading raw execution speed for development speed.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Interpreted</b> — chạy trực tiếp từng dòng qua CPython interpreter, không cần biên dịch trước (compile) như C++/Java.", en: "<b>Interpreted</b> — runs line by line via the CPython interpreter, no separate compile step like C++/Java." },
            { vi: "<b>CPython</b> — bản triển khai (implementation) chuẩn, phổ biến nhất; biên dịch code thành <b>bytecode</b> (.pyc) rồi chạy trên một máy ảo (VM).", en: "<b>CPython</b> — the standard, most common implementation; compiles code to <b>bytecode</b> (.pyc) then runs it on a virtual machine." },
            { vi: "Numeric-heavy code trong numpy/PyTorch thực chất chạy bằng <b>C/C++/CUDA</b> bên dưới — Python chỉ là lớp \"glue\" điều phối, nên vẫn nhanh cho AI dù bản thân Python chậm.", en: "Numeric-heavy code in numpy/PyTorch actually runs on <b>C/C++/CUDA</b> under the hood — Python is just the \"glue\" layer, so AI workloads stay fast even though Python itself is slow." },
          ],
        },
        {
          type: "code",
          code: "# Chạy 1 file:\n$ python script.py\n\n# REPL (Read-Eval-Print Loop) — thử code tương tác:\n$ python\n>>> print(\"hello\")\nhello\n>>> 2 + 2\n4\n\n# Jupyter Notebook — REPL nâng cao, phổ biến nhất cho AI/Data Science\n$ pip install notebook\n$ jupyter notebook",
          caption: { vi: "Ba cách chạy Python: script, REPL, Jupyter Notebook.", en: "Three ways to run Python: script, REPL, Jupyter Notebook." },
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>GIL (Global Interpreter Lock)</b> — CPython chỉ cho phép <b>1 thread</b> thực thi Python bytecode tại một thời điểm, dù máy có nhiều core. Đây là lý do Python threading không giúp CPU-bound task nhanh hơn (dùng <code>multiprocessing</code> thay vào đó). Từ Python 3.13, GIL có thể tắt (\"free-threaded\" build, vẫn đang thử nghiệm).",
          en: "<b>GIL (Global Interpreter Lock)</b> — CPython allows only <b>one thread</b> to execute Python bytecode at a time, even on multi-core machines. This is why Python threading doesn't speed up CPU-bound work (use <code>multiprocessing</code> instead). Since Python 3.13, the GIL can be disabled (experimental \"free-threaded\" build).",
        },
      ],
    },
    {
      id: "variables-types-strings",
      title: { vi: "2. Biến, kiểu dữ liệu, chuỗi & f-string", en: "2. Variables, types, strings & f-strings" },
      blocks: [
        {
          type: "prose",
          vi: "Python <b>gõ động</b>: biến không cần khai báo kiểu, kiểu được xác định lúc runtime. Các kiểu cơ bản: <code>int</code>, <code>float</code>, <code>str</code>, <code>bool</code>, <code>None</code> (tương đương null/nil).",
          en: "Python is <b>dynamically typed</b>: variables need no type declaration; type is resolved at runtime. Basic types: <code>int</code>, <code>float</code>, <code>str</code>, <code>bool</code>, <code>None</code> (equivalent to null/nil).",
        },
        {
          type: "code",
          code: "x = 10          # int\ny = 3.14        # float\nname = \"Alice\"  # str\nis_valid = True # bool\nnothing = None  # None type\n\nprint(type(x))  # <class 'int'>\n\n# f-string (Python 3.6+) — cách format chuỗi hiện đại nhất\nage = 25\nprint(f\"{name} is {age} years old\")          # Alice is 25 years old\nprint(f\"pi = {y:.2f}\")                        # pi = 3.14 (2 chữ số thập phân)\nprint(f\"{age=}\")                              # age=25 (debug tiện lợi, 3.8+)\n\n# Chuỗi common methods\ns = \"  Hello World  \"\nprint(s.strip().lower().split())              # ['hello', 'world']\nprint(\"-\".join([\"a\", \"b\", \"c\"]))              # a-b-c\n\n# Slicing — dùng chung cho str, list, tuple\ntext = \"Python\"\nprint(text[1:4])   # yth\nprint(text[::-1])  # nohtyP (đảo ngược chuỗi)",
          caption: { vi: "f-string là chuẩn hiện đại để format chuỗi; slicing dùng chung cho mọi sequence.", en: "f-strings are the modern standard for string formatting; slicing works across all sequences." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Python 3 chỉ có <b>một kiểu số nguyên</b> <code>int</code> với độ chính xác không giới hạn (arbitrary precision) — không overflow như C/Java. Chia lấy phần nguyên dùng <code>//</code>, chia thường dùng <code>/</code> (luôn trả float).",
          en: "Python 3 has a single <code>int</code> type with arbitrary precision — no overflow like C/Java. Floor division uses <code>//</code>, regular division uses <code>/</code> (always returns a float).",
        },
      ],
    },
    {
      id: "data-structures",
      title: { vi: "3. List / Tuple / Dict / Set + comprehension", en: "3. List / Tuple / Dict / Set + comprehensions" },
      blocks: [
        {
          type: "prose",
          vi: "Bốn cấu trúc dữ liệu built-in cốt lõi. Chọn đúng cấu trúc là kỹ năng quan trọng — ảnh hưởng performance và tính đúng đắn (mutability, order, uniqueness).",
          en: "Four core built-in data structures. Choosing the right one is an important skill — it affects performance and correctness (mutability, order, uniqueness).",
        },
        {
          type: "table",
          headers: { vi: ["Cấu trúc", "Mutable?", "Thứ tự", "Trùng lặp", "Dùng khi"], en: ["Structure", "Mutable?", "Ordered", "Duplicates", "Use when"] },
          rows: [
            { vi: ["<code>list</code>", "Có", "Có", "Cho phép", "Dãy phần tử thay đổi được, truy cập theo index"], en: ["<code>list</code>", "Yes", "Yes", "Allowed", "Mutable sequence, index-based access"] },
            { vi: ["<code>tuple</code>", "Không", "Có", "Cho phép", "Dữ liệu cố định (immutable), dùng làm key dict, trả nhiều giá trị"], en: ["<code>tuple</code>", "No", "Yes", "Allowed", "Fixed data (immutable), dict keys, returning multiple values"] },
            { vi: ["<code>dict</code>", "Có", "Có (3.7+)", "Key duy nhất", "Ánh xạ key→value, tra cứu O(1)"], en: ["<code>dict</code>", "Yes", "Yes (3.7+)", "Unique keys", "Key→value mapping, O(1) lookup"] },
            { vi: ["<code>set</code>", "Có", "Không", "Không cho phép", "Kiểm tra thành viên nhanh, loại trùng, phép tập hợp"], en: ["<code>set</code>", "Yes", "No", "Not allowed", "Fast membership test, dedupe, set operations"] },
          ],
        },
        {
          type: "code",
          code: "# List — mutable, ordered\nnums = [1, 2, 3]\nnums.append(4)          # [1, 2, 3, 4]\n\n# Tuple — immutable, thường dùng cho fixed record\npoint = (3, 4)\nx, y = point            # unpacking\n\n# Dict — key/value, O(1) lookup trung bình\nuser = {\"name\": \"Bob\", \"age\": 30}\nuser[\"email\"] = \"bob@x.com\"\n\n# Set — unique elements, phép tập hợp nhanh\na = {1, 2, 3}\nb = {2, 3, 4}\nprint(a & b)   # intersection: {2, 3}\nprint(a | b)   # union: {1, 2, 3, 4}\n\n# --- Comprehensions: cách Pythonic để tạo collection ---\nsquares = [n**2 for n in range(5)]                 # [0, 1, 4, 9, 16]\nevens = [n for n in range(10) if n % 2 == 0]       # list comprehension + filter\nsquare_map = {n: n**2 for n in range(5)}           # dict comprehension\nunique_lens = {len(w) for w in [\"a\", \"bb\", \"cc\"]}  # set comprehension: {1, 2}",
          caption: { vi: "Comprehension nhanh hơn và Pythonic hơn vòng lặp for thủ công.", en: "Comprehensions are faster and more Pythonic than a manual for-loop." },
        },
        {
          type: "callout",
          variant: "key",
          vi: "Câu hỏi phỏng vấn kinh điển: <b>list vs tuple</b>? Tuple immutable → có thể dùng làm <b>dict key</b> hoặc phần tử của <code>set</code> (vì cần hashable); list thì không. Tuple cũng nhanh hơn và tiết kiệm bộ nhớ hơn list một chút.",
          en: "Classic interview question: <b>list vs tuple</b>? Tuples are immutable → can be used as <b>dict keys</b> or set elements (because they're hashable); lists cannot. Tuples are also slightly faster and more memory-efficient than lists.",
        },
      ],
    },
    {
      id: "functions",
      title: { vi: "4. Hàm, *args/**kwargs, lambda & scope", en: "4. Functions, *args/**kwargs, lambda & scope" },
      blocks: [
        {
          type: "prose",
          vi: "Hàm trong Python là <b>first-class citizen</b> — có thể gán vào biến, truyền làm tham số, trả về từ hàm khác. Điều này là nền tảng cho decorator và các thư viện ML (callback, custom loss function).",
          en: "Functions in Python are <b>first-class citizens</b> — they can be assigned to variables, passed as arguments, returned from other functions. This underpins decorators and ML libraries (callbacks, custom loss functions).",
        },
        {
          type: "code",
          code: "def greet(name, greeting=\"Hello\"):   # default argument\n    return f\"{greeting}, {name}!\"\n\nprint(greet(\"Alice\"))                 # Hello, Alice!\nprint(greet(\"Bob\", greeting=\"Hi\"))    # Hi, Bob!\n\n# *args — số lượng positional argument tùy ý (tuple)\n# **kwargs — số lượng keyword argument tùy ý (dict)\ndef summarize(*args, **kwargs):\n    print(\"args:\", args)      # (1, 2, 3)\n    print(\"kwargs:\", kwargs)  # {'unit': 'kg'}\n\nsummarize(1, 2, 3, unit=\"kg\")\n\n# Lambda — hàm ẩn danh, 1 dòng, dùng cho callback ngắn\nsquare = lambda x: x ** 2\nprint(square(5))  # 25\n\nnums = [3, 1, 4, 1, 5]\nprint(sorted(nums, key=lambda x: -x))  # [5, 4, 3, 1, 1] — sort giảm dần\n\n# Scope: LEGB rule (Local -> Enclosing -> Global -> Built-in)\ncount = 0  # global\ndef increment():\n    global count   # cần khai báo để sửa biến global\n    count += 1",
          caption: { vi: "*args/**kwargs cho hàm linh hoạt; lambda tiện cho callback ngắn gọn (sort key, map, filter).", en: "*args/**kwargs enable flexible functions; lambdas are handy for short callbacks (sort key, map, filter)." },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<b>Bẫy mutable default argument</b>: <code>def f(items=[])</code> — list mặc định được tạo <b>một lần duy nhất</b> lúc định nghĩa hàm, bị chia sẻ giữa các lần gọi! Luôn dùng <code>def f(items=None): items = items or []</code>.",
          en: "<b>Mutable default argument trap</b>: <code>def f(items=[])</code> — the default list is created <b>only once</b> at function definition time and shared across calls! Always use <code>def f(items=None): items = items or []</code>.",
        },
      ],
    },
    {
      id: "oop",
      title: { vi: "5. OOP nhanh: class, dunder, dataclass", en: "5. Quick OOP: class, dunder methods, dataclass" },
      blocks: [
        {
          type: "prose",
          vi: "Python hỗ trợ OOP đầy đủ: class, kế thừa (inheritance), đa hình (polymorphism). <b>Dunder methods</b> (double underscore, ví dụ <code>__init__</code>) cho phép class \"hook\" vào cú pháp built-in của Python (in ra, so sánh, cộng, v.v.).",
          en: "Python supports full OOP: classes, inheritance, polymorphism. <b>Dunder methods</b> (double underscore, e.g. <code>__init__</code>) let a class hook into Python's built-in syntax (printing, comparison, addition, etc.).",
        },
        {
          type: "code",
          code: "class Point:\n    def __init__(self, x, y):   # constructor\n        self.x = x\n        self.y = y\n\n    def __repr__(self):          # dùng khi print()/repr()\n        return f\"Point({self.x}, {self.y})\"\n\n    def __eq__(self, other):     # dùng cho ==\n        return self.x == other.x and self.y == other.y\n\n    def __add__(self, other):    # dùng cho +\n        return Point(self.x + other.x, self.y + other.y)\n\np1, p2 = Point(1, 2), Point(3, 4)\nprint(p1 + p2)          # Point(4, 6) — gọi __add__\nprint(p1 == Point(1, 2))  # True — gọi __eq__\n\n# Inheritance\nclass Animal:\n    def speak(self):\n        raise NotImplementedError\n\nclass Dog(Animal):\n    def speak(self):\n        return \"Woof\"\n\n# dataclass (3.7+) — tự sinh __init__, __repr__, __eq__\nfrom dataclasses import dataclass\n\n@dataclass\nclass Config:\n    lr: float = 0.001\n    epochs: int = 10\n\ncfg = Config(lr=0.01)\nprint(cfg)  # Config(lr=0.01, epochs=10) — không cần viết __repr__ thủ công",
          caption: { vi: "Dunder methods định nghĩa hành vi toán tử; dataclass giảm boilerplate cho class chỉ chứa data.", en: "Dunder methods define operator behavior; dataclasses cut boilerplate for data-only classes." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "<code>@dataclass</code> rất phổ biến để định nghĩa <b>config object</b> trong các dự án ML (hyperparameters, model config) — thay thế cho dict lộn xộn, có type hint rõ ràng và autocomplete tốt trong IDE.",
          en: "<code>@dataclass</code> is very common for defining <b>config objects</b> in ML projects (hyperparameters, model config) — replacing messy dicts with clear type hints and good IDE autocomplete.",
        },
      ],
    },
    {
      id: "exceptions-context",
      title: { vi: "6. Exception & context manager", en: "6. Exceptions & context managers" },
      blocks: [
        {
          type: "prose",
          vi: "Python xử lý lỗi bằng <b>exception</b> (try/except), không dùng error code trả về như C. <b>Context manager</b> (<code>with</code>) đảm bảo resource (file, connection, lock) được dọn dẹp đúng cách kể cả khi có lỗi.",
          en: "Python handles errors via <b>exceptions</b> (try/except), not return error codes like C. <b>Context managers</b> (<code>with</code>) guarantee resources (files, connections, locks) are cleaned up properly even when errors occur.",
        },
        {
          type: "code",
          code: "try:\n    result = 10 / 0\nexcept ZeroDivisionError as e:\n    print(f\"Error: {e}\")\nexcept (TypeError, ValueError) as e:   # bắt nhiều loại exception\n    print(f\"Bad input: {e}\")\nelse:\n    print(\"No error occurred\")          # chạy nếu KHÔNG có lỗi\nfinally:\n    print(\"Always runs\")                # luôn chạy — dọn dẹp\n\n# Custom exception\nclass InsufficientFundsError(Exception):\n    pass\n\ndef withdraw(balance, amount):\n    if amount > balance:\n        raise InsufficientFundsError(f\"Need {amount}, have {balance}\")\n    return balance - amount\n\n# Context manager — with tự động gọi __exit__ để đóng file dù có lỗi\nwith open(\"data.txt\", \"r\") as f:\n    content = f.read()\n# file đã được đóng tự động tại đây, kể cả nếu read() raise lỗi\n\n# Tự viết context manager\nfrom contextlib import contextmanager\n\n@contextmanager\ndef timer():\n    import time\n    start = time.time()\n    yield\n    print(f\"Elapsed: {time.time() - start:.2f}s\")\n\nwith timer():\n    sum(range(10_000_000))",
          caption: { vi: "try/except/else/finally đầy đủ; with đảm bảo cleanup tự động qua __enter__/__exit__.", en: "Full try/except/else/finally; with guarantees automatic cleanup via __enter__/__exit__." },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Tránh <code>except:</code> trần (bare except) — nó bắt <b>mọi</b> exception kể cả <code>KeyboardInterrupt</code>, <code>SystemExit</code>, che giấu lỗi thật. Luôn bắt exception cụ thể.",
          en: "Avoid a bare <code>except:</code> — it catches <b>every</b> exception including <code>KeyboardInterrupt</code> and <code>SystemExit</code>, hiding real bugs. Always catch specific exception types.",
        },
      ],
    },
    {
      id: "venv-typing",
      title: { vi: "7. venv/pip/requirements + typing cơ bản", en: "7. venv/pip/requirements + basic typing" },
      blocks: [
        {
          type: "prose",
          vi: "Mỗi dự án Python nên có <b>môi trường ảo (virtual environment)</b> riêng để cô lập dependencies, tránh xung đột version giữa các dự án. <b>Type hints</b> (từ 3.5+) không bắt buộc lúc runtime nhưng giúp IDE, linter và công cụ như <code>mypy</code> bắt lỗi sớm.",
          en: "Every Python project should have its own <b>virtual environment</b> to isolate dependencies and avoid version conflicts between projects. <b>Type hints</b> (3.5+) are not enforced at runtime but help IDEs, linters, and tools like <code>mypy</code> catch bugs early.",
        },
        {
          type: "code",
          code: "# Tạo và kích hoạt virtual environment\n$ python -m venv .venv\n$ source .venv/bin/activate      # Linux/macOS\n$ .venv\\Scripts\\activate         # Windows\n\n$ pip install numpy pandas scikit-learn\n$ pip freeze > requirements.txt   # ghi lại version đã cài\n$ pip install -r requirements.txt # cài lại trên máy khác\n$ deactivate                      # thoát venv\n\n# Type hints — không bắt buộc, nhưng nên dùng\ndef add(a: int, b: int) -> int:\n    return a + b\n\nfrom typing import List, Dict, Optional\n\ndef process(names: List[str], scores: Dict[str, float]) -> Optional[str]:\n    if not names:\n        return None\n    return names[0]\n\n# Python 3.9+ có thể dùng built-in generic trực tiếp:\ndef process2(names: list[str], scores: dict[str, float]) -> str | None:\n    ...",
          caption: { vi: "venv cô lập dependencies theo dự án; type hints là tài liệu sống + hỗ trợ static checking.", en: "venv isolates per-project dependencies; type hints act as living docs and enable static checking." },
        },
        {
          type: "callout",
          variant: "info",
          vi: "Công cụ hiện đại thay thế pip+venv: <b>Poetry</b> hoặc <b>uv</b> (rất nhanh, viết bằng Rust) — quản lý dependency, lockfile và virtual env trong một tool duy nhất.",
          en: "Modern tools replacing pip+venv: <b>Poetry</b> or <b>uv</b> (very fast, written in Rust) — manage dependencies, lockfiles, and the virtual env in a single tool.",
        },
      ],
    },
    {
      id: "numpy-pandas-async",
      title: { vi: "8. numpy/pandas căn bản + async sơ lược", en: "8. numpy/pandas basics + async overview" },
      blocks: [
        {
          type: "prose",
          vi: "<b>numpy</b> cung cấp <code>ndarray</code> — mảng n-chiều với phép toán <b>vectorized</b> (áp dụng lên toàn mảng cùng lúc, chạy bằng C bên dưới, nhanh hơn vòng lặp Python rất nhiều). <b>pandas</b> xây trên numpy, cung cấp <code>DataFrame</code> — bảng dữ liệu 2D có label, tương tự Excel/SQL table.",
          en: "<b>numpy</b> provides <code>ndarray</code> — n-dimensional arrays with <b>vectorized</b> operations (applied across the whole array at once, running in C under the hood, far faster than a Python loop). <b>pandas</b> builds on numpy, offering the <code>DataFrame</code> — a labeled 2D table, similar to Excel/SQL tables.",
        },
        {
          type: "code",
          code: "import numpy as np\n\na = np.array([1, 2, 3, 4])\nb = np.array([10, 20, 30, 40])\n\n# Vectorized — không cần for loop\nprint(a + b)        # [11 22 33 44]\nprint(a * 2)         # [2 4 6 8]\nprint(a.mean())       # 2.5\nprint(a.reshape(2, 2))  # [[1 2] [3 4]]\n\nimport pandas as pd\n\ndf = pd.DataFrame({\n    \"name\": [\"Alice\", \"Bob\", \"Carol\"],\n    \"score\": [85, 92, 78],\n})\nprint(df[df[\"score\"] > 80])       # filter rows — boolean indexing\nprint(df[\"score\"].mean())          # 85.0\ndf[\"passed\"] = df[\"score\"] >= 80   # thêm cột mới, vectorized\nprint(df.groupby(\"passed\").size())",
          caption: { vi: "Vectorization: numpy/pandas thay for-loop bằng phép toán mảng — nhanh hơn hàng chục-hàng trăm lần.", en: "Vectorization: numpy/pandas replace for-loops with array operations — tens to hundreds of times faster." },
        },
        {
          type: "code",
          code: "import asyncio\n\nasync def fetch_data(id):\n    await asyncio.sleep(1)   # giả lập network call, không block\n    return f\"data-{id}\"\n\nasync def main():\n    # Chạy song song thay vì tuần tự\n    results = await asyncio.gather(\n        fetch_data(1), fetch_data(2), fetch_data(3)\n    )\n    print(results)\n\nasyncio.run(main())  # tổng thời gian ~1s thay vì 3s",
          caption: { vi: "async/await hữu ích cho I/O-bound (gọi API song song); không giúp CPU-bound do GIL.", en: "async/await is useful for I/O-bound work (parallel API calls); it does not help CPU-bound work due to the GIL." },
        },
        {
          type: "callout",
          variant: "key",
          vi: "Nguyên tắc vàng khi code numeric trong Python: <b>\"Never loop over a numpy array/DataFrame in Python — vectorize it.\"</b> For-loop thuần Python trên dữ liệu lớn chậm hơn vectorized numpy 50-100 lần.",
          en: "Golden rule for numeric Python code: <b>\"Never loop over a numpy array/DataFrame in Python — vectorize it.\"</b> A pure Python for-loop over large data is 50-100x slower than vectorized numpy.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Chốt phỏng vấn: <b>\"Python chậm nhưng AI stack (numpy/PyTorch) nhanh vì logic nặng chạy ở C/CUDA. GIL giới hạn threading cho CPU-bound → dùng multiprocessing hoặc vectorization thay vì loop thủ công.\"</b>",
          en: "Interview soundbite: <b>\"Python itself is slow, but the AI stack (numpy/PyTorch) is fast because heavy lifting runs in C/CUDA. The GIL limits threading for CPU-bound work → use multiprocessing or vectorization instead of manual loops.\"</b>",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "GIL là gì và nó ảnh hưởng thế nào đến threading?", en: "What is the GIL and how does it affect threading?" },
      back: { vi: "<b>Global Interpreter Lock</b> — chỉ cho 1 thread thực thi Python bytecode tại một thời điểm trong CPython. Threading không giúp CPU-bound task nhanh hơn; dùng <code>multiprocessing</code> để tận dụng nhiều core cho CPU-bound.", en: "<b>Global Interpreter Lock</b> — allows only one thread to execute Python bytecode at a time in CPython. Threading does not speed up CPU-bound tasks; use <code>multiprocessing</code> to leverage multiple cores." },
    },
    {
      front: { vi: "f-string là gì và tại sao nên dùng?", en: "What is an f-string and why use it?" },
      back: { vi: "Cú pháp format chuỗi hiện đại: <code>f\"{name} is {age}\"</code>. Nhanh hơn <code>%</code> và <code>.format()</code>, dễ đọc, cho phép format số (<code>{x:.2f}</code>) và debug nhanh (<code>{x=}</code>).", en: "Modern string formatting: <code>f\"{name} is {age}\"</code>. Faster than <code>%</code> and <code>.format()</code>, more readable, supports number formatting (<code>{x:.2f}</code>) and quick debugging (<code>{x=}</code>)." },
    },
    {
      front: { vi: "Khác biệt chính giữa list và tuple là gì?", en: "What is the key difference between list and tuple?" },
      back: { vi: "<b>list</b>: mutable, có thể sửa đổi sau khi tạo. <b>tuple</b>: immutable, không sửa được → hashable → dùng được làm dict key hoặc phần tử set; list thì không.", en: "<b>list</b>: mutable, can be modified after creation. <b>tuple</b>: immutable, cannot be modified → hashable → usable as a dict key or set element; lists cannot." },
    },
    {
      front: { vi: "List comprehension khác gì vòng lặp for thông thường?", en: "How does a list comprehension differ from a regular for-loop?" },
      back: { vi: "Comprehension (<code>[x**2 for x in range(5)]</code>) ngắn gọn hơn, thường nhanh hơn for-loop thủ công vì được tối ưu ở mức C, và là idiom \"Pythonic\" được ưa chuộng.", en: "Comprehensions (<code>[x**2 for x in range(5)]</code>) are more concise, usually faster than manual for-loops due to C-level optimization, and are the preferred \"Pythonic\" idiom." },
    },
    {
      front: { vi: "Bẫy mutable default argument trong Python là gì?", en: "What is the mutable default argument trap in Python?" },
      back: { vi: "<code>def f(items=[])</code> — list mặc định chỉ được tạo <b>một lần</b> lúc def, bị chia sẻ giữa mọi lần gọi hàm không truyền tham số. Sửa bằng <code>def f(items=None): items = items or []</code>.", en: "<code>def f(items=[])</code> — the default list is created <b>only once</b> at def time and shared across every call that omits the argument. Fix with <code>def f(items=None): items = items or []</code>." },
    },
    {
      front: { vi: "*args và **kwargs khác nhau thế nào?", en: "How do *args and **kwargs differ?" },
      back: { vi: "<code>*args</code> gom các positional argument thừa thành <b>tuple</b>. <code>**kwargs</code> gom các keyword argument thừa thành <b>dict</b>. Cho phép hàm nhận số lượng tham số linh hoạt.", en: "<code>*args</code> collects extra positional arguments into a <b>tuple</b>. <code>**kwargs</code> collects extra keyword arguments into a <b>dict</b>. Both enable functions to accept a flexible number of arguments." },
    },
    {
      front: { vi: "@dataclass dùng để làm gì?", en: "What does @dataclass do?" },
      back: { vi: "Tự động sinh <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code> cho class chỉ chứa data (attributes). Giảm boilerplate, thường dùng cho config object trong dự án ML.", en: "Automatically generates <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code> for data-only classes. Cuts boilerplate, commonly used for config objects in ML projects." },
    },
    {
      front: { vi: "Tại sao nên tránh 'bare except:'?", en: "Why should you avoid a bare 'except:'?" },
      back: { vi: "Nó bắt <b>mọi</b> exception kể cả <code>KeyboardInterrupt</code>/<code>SystemExit</code>, che giấu lỗi thật và gây khó debug. Luôn bắt exception type cụ thể (<code>except ValueError</code>).", en: "It catches <b>every</b> exception including <code>KeyboardInterrupt</code>/<code>SystemExit</code>, hiding real bugs and making debugging harder. Always catch specific exception types (<code>except ValueError</code>)." },
    },
    {
      front: { vi: "with statement (context manager) hoạt động thế nào?", en: "How does the with statement (context manager) work?" },
      back: { vi: "Gọi <code>__enter__</code> lúc bắt đầu block và <code>__exit__</code> lúc kết thúc — kể cả khi có exception — đảm bảo resource (file, connection, lock) luôn được dọn dẹp đúng cách.", en: "Calls <code>__enter__</code> at the start of the block and <code>__exit__</code> at the end — even on exception — guaranteeing resources (files, connections, locks) are always cleaned up properly." },
    },
    {
      front: { vi: "Vì sao venv (virtual environment) quan trọng?", en: "Why are virtual environments (venv) important?" },
      back: { vi: "Cô lập dependencies theo từng dự án, tránh xung đột version giữa các project khác nhau trên cùng máy. Kết hợp với <code>requirements.txt</code> hoặc Poetry/uv để đảm bảo môi trường reproducible.", en: "Isolates dependencies per project, avoiding version conflicts between different projects on the same machine. Combined with <code>requirements.txt</code> or Poetry/uv for reproducible environments." },
    },
    {
      front: { vi: "Vectorization trong numpy nghĩa là gì và tại sao nó nhanh?", en: "What does vectorization mean in numpy and why is it fast?" },
      back: { vi: "Áp dụng phép toán lên toàn bộ mảng cùng lúc (ví dụ <code>a + b</code>) thay vì vòng lặp Python từng phần tử. Phép toán chạy bằng mã C được biên dịch sẵn bên dưới, nhanh hơn for-loop Python thuần 50-100 lần.", en: "Applying an operation across an entire array at once (e.g. <code>a + b</code>) instead of a Python loop over elements. The operation runs via precompiled C code underneath, 50-100x faster than a pure Python for-loop." },
    },
  ],
  quiz: [
    {
      q: { vi: "GIL trong CPython giới hạn điều gì?", en: "What does the GIL in CPython restrict?" },
      options: [
        { vi: "Số lượng biến có thể khai báo", en: "The number of variables you can declare" },
        { vi: "Chỉ 1 thread thực thi Python bytecode tại một thời điểm", en: "Only 1 thread can execute Python bytecode at a time" },
        { vi: "Số lượng process có thể chạy song song", en: "The number of processes that can run in parallel" },
        { vi: "Kích thước tối đa của một list", en: "The maximum size of a list" },
      ],
      answer: 1,
      explain: { vi: "GIL (Global Interpreter Lock) chỉ cho phép <b>một thread</b> thực thi Python bytecode cùng lúc trong CPython, dù có nhiều core. Để tận dụng nhiều core cho CPU-bound task, dùng <code>multiprocessing</code> thay vì threading.", en: "The GIL allows only <b>one thread</b> to execute Python bytecode at a time in CPython, regardless of core count. To leverage multiple cores for CPU-bound work, use <code>multiprocessing</code> instead of threading." },
    },
    {
      q: { vi: "Cấu trúc dữ liệu nào KHÔNG cho phép phần tử trùng lặp?", en: "Which data structure does NOT allow duplicate elements?" },
      options: [
        { vi: "list", en: "list" },
        { vi: "tuple", en: "tuple" },
        { vi: "set", en: "set" },
        { vi: "Cả list và tuple", en: "Both list and tuple" },
      ],
      answer: 2,
      explain: { vi: "<code>set</code> chỉ lưu các phần tử <b>duy nhất</b> (unique), tự động loại bỏ trùng lặp. <code>list</code> và <code>tuple</code> đều cho phép phần tử trùng.", en: "A <code>set</code> stores only <b>unique</b> elements, automatically deduplicating. Both <code>list</code> and <code>tuple</code> allow duplicates." },
    },
    {
      q: { vi: "Tại sao tuple có thể dùng làm dict key còn list thì không?", en: "Why can a tuple be used as a dict key but a list cannot?" },
      options: [
        { vi: "Tuple nhỏ hơn list về bộ nhớ", en: "Tuples are smaller in memory than lists" },
        { vi: "Tuple immutable nên hashable; list mutable nên không hashable", en: "Tuples are immutable so hashable; lists are mutable so not hashable" },
        { vi: "List không thể chứa số nguyên", en: "Lists cannot contain integers" },
        { vi: "Dict key phải là string", en: "Dict keys must be strings" },
      ],
      answer: 1,
      explain: { vi: "Dict key phải <b>hashable</b> — giá trị hash không đổi trong suốt vòng đời object. Vì list có thể bị sửa đổi (mutable), Python không cho nó hashable. Tuple immutable nên hashable (nếu các phần tử bên trong cũng hashable).", en: "Dict keys must be <b>hashable</b> — their hash value must not change over the object's lifetime. Since lists are mutable, Python does not make them hashable. Tuples are immutable, hence hashable (if their elements are also hashable)." },
    },
    {
      q: { vi: "Vấn đề với đoạn code `def f(items=[]): items.append(1); return items` là gì?", en: "What's the problem with `def f(items=[]): items.append(1); return items`?" },
      options: [
        { vi: "Cú pháp sai, không chạy được", en: "It's a syntax error" },
        { vi: "List mặc định được tạo lại mỗi lần gọi hàm", en: "The default list is recreated on every call" },
        { vi: "List mặc định chỉ tạo một lần, bị chia sẻ và tích lũy giữa các lần gọi", en: "The default list is created once and shared/accumulated across calls" },
        { vi: "Hàm luôn trả về list rỗng", en: "The function always returns an empty list" },
      ],
      answer: 2,
      explain: { vi: "Default argument được đánh giá <b>một lần duy nhất</b> khi hàm được định nghĩa (def), không phải mỗi lần gọi. Mọi lời gọi <code>f()</code> không truyền <code>items</code> sẽ dùng chung và tích lũy vào cùng một list.", en: "Default arguments are evaluated <b>once</b>, at function definition time, not on each call. Every call to <code>f()</code> without an explicit <code>items</code> shares and accumulates into the same list object." },
    },
    {
      q: { vi: "Dunder method nào được gọi khi dùng toán tử `+` giữa hai object?", en: "Which dunder method is called when using the `+` operator between two objects?" },
      options: [
        { vi: "__init__", en: "__init__" },
        { vi: "__add__", en: "__add__" },
        { vi: "__repr__", en: "__repr__" },
        { vi: "__eq__", en: "__eq__" },
      ],
      answer: 1,
      explain: { vi: "<code>__add__(self, other)</code> định nghĩa hành vi cho toán tử <code>+</code>. Tương tự, <code>__eq__</code> cho <code>==</code>, <code>__repr__</code> cho <code>repr()</code>/print debug.", en: "<code>__add__(self, other)</code> defines the behavior of the <code>+</code> operator. Similarly, <code>__eq__</code> handles <code>==</code>, and <code>__repr__</code> handles <code>repr()</code>/debug printing." },
    },
    {
      q: { vi: "@dataclass giúp ích gì cho một class?", en: "What does @dataclass help with for a class?" },
      options: [
        { vi: "Tự động chạy song song các method", en: "Automatically parallelizes methods" },
        { vi: "Tự động sinh __init__, __repr__, __eq__ từ các attribute khai báo", en: "Auto-generates __init__, __repr__, __eq__ from declared attributes" },
        { vi: "Biến class thành immutable bắt buộc", en: "Forces the class to become immutable" },
        { vi: "Tăng tốc độ thực thi bytecode", en: "Speeds up bytecode execution" },
      ],
      answer: 1,
      explain: { vi: "<code>@dataclass</code> tự động sinh <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code> dựa trên các attribute có type hint được khai báo trong class, giảm boilerplate cho class chủ yếu chứa data.", en: "<code>@dataclass</code> auto-generates <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code> based on type-hinted attributes declared in the class, cutting boilerplate for data-centric classes." },
    },
    {
      q: { vi: "Khối `finally` trong try/except chạy khi nào?", en: "When does the `finally` block in try/except run?" },
      options: [
        { vi: "Chỉ khi không có lỗi xảy ra", en: "Only when no error occurs" },
        { vi: "Chỉ khi có lỗi xảy ra", en: "Only when an error occurs" },
        { vi: "Luôn luôn chạy, dù có lỗi hay không", en: "Always runs, whether an error occurred or not" },
        { vi: "Chỉ khi except bắt được lỗi", en: "Only when except catches the error" },
      ],
      answer: 2,
      explain: { vi: "<code>finally</code> luôn chạy — có lỗi hay không, kể cả khi <code>return</code> đã được gọi trong try/except. Dùng để dọn dẹp resource bắt buộc phải chạy (đóng file, connection).", en: "<code>finally</code> always runs — whether an error occurred or not, even if <code>return</code> was already called in try/except. Used for cleanup that must always happen (closing files, connections)." },
    },
    {
      q: { vi: "Tại sao numpy vectorized operation nhanh hơn Python for-loop thuần?", en: "Why is a numpy vectorized operation faster than a pure Python for-loop?" },
      options: [
        { vi: "Vì numpy chạy trên GPU mặc định", en: "Because numpy runs on GPU by default" },
        { vi: "Vì phép toán chạy bằng mã C biên dịch sẵn thay vì interpreter Python từng phần tử", en: "Because the operation runs via precompiled C code instead of the Python interpreter per element" },
        { vi: "Vì numpy dùng multithreading GIL-free luôn", en: "Because numpy always uses GIL-free multithreading" },
        { vi: "Vì numpy nén dữ liệu trước khi tính", en: "Because numpy compresses data before computing" },
      ],
      answer: 1,
      explain: { vi: "Vectorized operation của numpy thực thi bằng <b>mã C được biên dịch sẵn</b>, xử lý toàn bộ mảng trong một lệnh, tránh overhead của Python interpreter lặp qua từng phần tử — nhanh hơn 50-100 lần so với for-loop Python.", en: "numpy's vectorized operations execute via <b>precompiled C code</b>, processing the whole array in one call, avoiding the overhead of the Python interpreter looping element by element — 50-100x faster than a Python for-loop." },
    },
    {
      q: { vi: "Trong pandas, df[df[\"score\"] > 80] thực hiện điều gì?", en: "In pandas, what does df[df[\"score\"] > 80] do?" },
      options: [
        { vi: "Xóa cột score", en: "Deletes the score column" },
        { vi: "Lọc các hàng có score > 80 (boolean indexing)", en: "Filters rows where score > 80 (boolean indexing)" },
        { vi: "Sắp xếp DataFrame theo score", en: "Sorts the DataFrame by score" },
        { vi: "Tính trung bình cột score", en: "Computes the mean of the score column" },
      ],
      answer: 1,
      explain: { vi: "<code>df[\"score\"] > 80</code> tạo ra một Series các giá trị boolean; dùng nó làm chỉ mục (<b>boolean indexing</b>) sẽ giữ lại các hàng có giá trị True — tức các hàng có score > 80.", en: "<code>df[\"score\"] > 80</code> creates a boolean Series; using it as an index (<b>boolean indexing</b>) keeps only the rows where the value is True — i.e. rows with score > 80." },
    },
    {
      q: { vi: "asyncio (async/await) trong Python phù hợp nhất cho loại tác vụ nào?", en: "What kind of task is asyncio (async/await) in Python best suited for?" },
      options: [
        { vi: "CPU-bound: tính toán số học nặng", en: "CPU-bound: heavy numeric computation" },
        { vi: "I/O-bound: gọi API, đọc file, network request song song", en: "I/O-bound: parallel API calls, file reads, network requests" },
        { vi: "Tăng tốc training model deep learning", en: "Speeding up deep learning model training" },
        { vi: "Thay thế hoàn toàn multiprocessing", en: "Fully replacing multiprocessing" },
      ],
      answer: 1,
      explain: { vi: "<code>async/await</code> giúp chạy nhiều tác vụ <b>I/O-bound</b> (network, file, DB) đồng thời mà không cần thread riêng cho mỗi tác vụ. Với CPU-bound, GIL vẫn giới hạn — cần <code>multiprocessing</code>.", en: "<code>async/await</code> lets multiple <b>I/O-bound</b> tasks (network, file, DB) run concurrently without a dedicated thread per task. For CPU-bound work, the GIL still limits things — <code>multiprocessing</code> is needed instead." },
    },
  ],
});
