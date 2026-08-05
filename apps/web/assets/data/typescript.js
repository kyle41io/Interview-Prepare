/* TypeScript — frontend topic */
PREP.register({
  id: "typescript",
  icon: "🟦",
  category: "frontend",
  title: { vi: "TypeScript", en: "TypeScript" },
  blurb: {
    vi: "TypeScript là JavaScript cộng thêm kiểu tĩnh — bắt lỗi ngay lúc viết code thay vì lúc chạy, giúp IDE gợi ý chính xác hơn và code dễ bảo trì hơn khi dự án lớn.",
    en: "TypeScript is JavaScript with static types — catching errors at write-time instead of runtime, enabling smarter IDE tooling, and making large codebases maintainable.",
  },
  sections: [
    {
      id: "why-ts",
      title: { vi: "1. Tại sao dùng TypeScript thay JavaScript?", en: "1. Why TypeScript over JavaScript?" },
      blocks: [
        {
          type: "prose",
          vi: "<b>TypeScript</b> là superset của JavaScript: mọi file JS hợp lệ cũng là TS hợp lệ. Bạn thêm <b>type annotations</b> (chú thích kiểu), TypeScript compiler (<code>tsc</code>) kiểm tra kiểu tại <b>compile time</b> rồi <b>xóa hoàn toàn</b> chúng — output là JavaScript thuần chạy trên mọi nền tảng.",
          en: "<b>TypeScript</b> is a superset of JavaScript: every valid JS file is also valid TS. You add <b>type annotations</b>, the TypeScript compiler (<code>tsc</code>) checks them at <b>compile time</b>, then <b>erases them entirely</b> — the output is plain JavaScript that runs anywhere.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Bắt lỗi sớm:</b> typo tên thuộc tính, sai kiểu tham số, gọi hàm không có — tất cả bị phát hiện trước khi chạy.", en: "<b>Catch errors early:</b> typo'd property names, wrong argument types, missing calls — all caught before runtime." },
            { vi: "<b>IDE siêu mạnh:</b> autocomplete chính xác, refactor an toàn (rename symbol), gợi ý kiểu ngay tại vị trí trỏ chuột.", en: "<b>Supercharged IDE:</b> accurate autocomplete, safe refactoring (rename symbol), inline type hints on hover." },
            { vi: "<b>Tài liệu sống:</b> signature hàm <i>chính là</i> tài liệu — bạn biết hàm nhận gì và trả về gì mà không cần đọc implementation.", en: "<b>Living documentation:</b> function signatures <i>are</i> the docs — you know what a function takes and returns without reading its body." },
            { vi: "<b>Refactor tự tin:</b> đổi tên hoặc thay đổi cấu trúc kiểu → compiler chỉ đúng mọi chỗ cần cập nhật.", en: "<b>Confident refactoring:</b> rename or restructure a type → the compiler points out every callsite that needs updating." },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "TypeScript <b>không thêm runtime overhead</b>. Toàn bộ kiểu bị xóa sau khi biên dịch. Lỗi TypeScript chỉ xảy ra lúc build — không bao giờ lúc runtime (trừ khi bạn dùng <code>as</code> ép kiểu sai).",
          en: "TypeScript adds <b>zero runtime overhead</b>. All types are erased after compilation. TypeScript errors only happen at build time — never at runtime (unless you force-cast with <code>as</code>).",
        },
        {
          type: "code",
          code: "// JS: error only appears at runtime\nfunction greet(user) {\n  return 'Hello ' + user.nane; // typo: 'nane' not 'name' — silently undefined\n}\n\n// TS: error caught immediately in the editor\nfunction greet(user: { name: string }): string {\n  return 'Hello ' + user.nane; // Error: Property 'nane' does not exist\n}",
          caption: { vi: "TypeScript bắt lỗi typo tại compile time, JavaScript thì không.", en: "TypeScript catches the typo at compile time; JavaScript silently produces a bug." },
        },
      ],
    },
    {
      id: "basic-types",
      title: { vi: "2. Kiểu cơ bản — primitives, mảng, tuple, enum", en: "2. Basic types — primitives, arrays, tuples, enums" },
      blocks: [
        {
          type: "prose",
          vi: "TypeScript có đủ kiểu nguyên thủy của JavaScript, thêm <b>tuple</b>, <b>enum</b>, và ba kiểu đặc biệt: <code>any</code>, <code>unknown</code>, <code>never</code>. <b>Type inference</b> cho phép bạn bỏ qua annotation khi trình biên dịch có thể tự suy ra.",
          en: "TypeScript covers all JavaScript primitives, plus <b>tuples</b>, <b>enums</b>, and three special types: <code>any</code>, <code>unknown</code>, <code>never</code>. <b>Type inference</b> lets you skip annotations when the compiler can figure them out.",
        },
        {
          type: "code",
          code: "// Primitives\nlet name: string = 'Alice';\nlet age: number = 30;\nlet active: boolean = true;\nlet nothing: null = null;\nlet undef: undefined = undefined;\nlet id: bigint = 9007199254740993n;\nlet sym: symbol = Symbol('key');\n\n// Arrays — two syntaxes, identical meaning\nlet nums: number[] = [1, 2, 3];\nlet strs: Array<string> = ['a', 'b'];\n\n// Tuple — fixed-length, ordered types\nlet point: [number, number] = [10, 20];\nlet entry: [string, number] = ['age', 30];\n\n// Enum\nenum Direction { Up, Down, Left, Right }  // values 0,1,2,3\nlet dir: Direction = Direction.Up;\n\nenum Status { Active = 'ACTIVE', Inactive = 'INACTIVE' }  // string enum\n\n// Type inference — no annotation needed\nlet score = 42;          // inferred: number\nlet labels = ['a', 'b']; // inferred: string[]",
          caption: { vi: "Các kiểu cơ bản và cách khai báo.", en: "Core types and their declaration syntax." },
        },
        {
          type: "table",
          headers: { vi: ["Kiểu", "Mô tả", "Khi dùng"], en: ["Type", "Description", "When to use"] },
          rows: [
            { vi: ["<code>any</code>", "Tắt hoàn toàn kiểm tra kiểu", "Tránh dùng — chỉ khi migrate JS cũ"], en: ["<code>any</code>", "Disables all type checking", "Avoid — only for legacy JS migration"] },
            { vi: ["<code>unknown</code>", "Kiểu an toàn thay cho <code>any</code>", "Khi chưa biết kiểu — bắt buộc narrow trước khi dùng"], en: ["<code>unknown</code>", "Type-safe alternative to <code>any</code>", "When type is uncertain — must narrow before use"] },
            { vi: ["<code>never</code>", "Không bao giờ có giá trị", "Return type hàm throw / vòng lặp vô tận / exhaustive check"], en: ["<code>never</code>", "Value that never occurs", "Return type of throwing fn / infinite loop / exhaustive check"] },
            { vi: ["<code>void</code>", "Hàm không trả về gì", "Return type hàm side-effect"], en: ["<code>void</code>", "Function returns nothing", "Return type of side-effect functions"] },
          ],
        },
        {
          type: "code",
          code: "// unknown vs any\nfunction processInput(val: unknown) {\n  // val.toUpperCase(); // Error: can't use unknown directly\n  if (typeof val === 'string') {\n    console.log(val.toUpperCase()); // OK after narrowing\n  }\n}\n\n// never — exhaustive check\ntype Shape = 'circle' | 'square';\nfunction area(s: Shape): number {\n  if (s === 'circle') return Math.PI;\n  if (s === 'square') return 1;\n  const _exhaustive: never = s; // compile error if a case is missed\n  return _exhaustive;\n}",
          caption: { vi: "<code>unknown</code> an toàn hơn <code>any</code>; <code>never</code> dùng để exhaustive check.", en: "<code>unknown</code> is safer than <code>any</code>; <code>never</code> enables exhaustive checking." },
        },
      ],
    },
    {
      id: "interfaces-types",
      title: { vi: "3. Interface vs Type alias", en: "3. Interfaces vs Type aliases" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Interface</b> và <b>type alias</b> đều dùng để đặt tên cho hình dạng (shape) của object. Phần lớn trường hợp chúng hoán đổi nhau được — nhưng có một số khác biệt quan trọng.",
          en: "<b>Interfaces</b> and <b>type aliases</b> both name the shape of an object. In most cases they are interchangeable — but there are important differences.",
        },
        {
          type: "code",
          code: "// Interface\ninterface User {\n  id: number;\n  name: string;\n  email?: string; // optional\n  readonly createdAt: Date; // immutable after creation\n}\n\n// Type alias\ntype Point = {\n  x: number;\n  y: number;\n};\n\n// Type alias can also name primitives, unions, tuples\ntype ID = string | number;\ntype Pair = [string, number];\ntype Callback = (err: Error | null, result: string) => void;",
          caption: { vi: "Interface dành cho object shapes; type alias linh hoạt hơn (union, primitive, tuple).", en: "Interface for object shapes; type alias is more flexible (unions, primitives, tuples)." },
        },
        {
          type: "table",
          headers: { vi: ["Tính năng", "Interface", "Type alias"], en: ["Feature", "Interface", "Type alias"] },
          rows: [
            { vi: ["Mô tả object shape", "✅", "✅"], en: ["Describe object shape", "✅", "✅"] },
            { vi: ["Extend / kế thừa", "<code>extends</code>", "<code>&</code> (intersection)"] , en: ["Extend / inherit", "<code>extends</code>", "<code>&</code> (intersection)"] },
            { vi: ["Mô tả union / primitive", "❌", "✅"], en: ["Describe union / primitive", "❌", "✅"] },
            { vi: ["Declaration merging", "✅ (mở được sau khi khai báo)", "❌ (đóng hoàn toàn)"], en: ["Declaration merging", "✅ (can be reopened)", "❌ (closed, no merging)"] },
            { vi: ["Dùng với <code>implements</code>", "✅", "✅ (object type only)"], en: ["Use with <code>implements</code>", "✅", "✅ (object type only)"] },
          ],
        },
        {
          type: "code",
          code: "// Interface extending interface\ninterface Animal { name: string; }\ninterface Dog extends Animal { breed: string; }\n\n// Type alias intersection\ntype Animal2 = { name: string };\ntype Dog2 = Animal2 & { breed: string };\n\n// Declaration merging — only interfaces\ninterface Window { myPlugin: () => void; } // adds to existing Window type\n\n// Class implements interface\nclass AdminUser implements User {\n  id = 1;\n  name = 'Admin';\n  readonly createdAt = new Date();\n}",
          caption: { vi: "Extending, intersection, declaration merging, và implements.", en: "Extending, intersection, declaration merging, and implements." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Quy tắc thực tế: dùng <b>interface</b> cho API contracts (khi muốn mở rộng sau, hoặc cần declaration merging). Dùng <b>type alias</b> khi cần union, tuple, hoặc kiểu không phải object.",
          en: "Practical rule: use <b>interface</b> for API contracts (when you want extensibility or declaration merging). Use <b>type alias</b> when you need unions, tuples, or non-object types.",
        },
      ],
    },
    {
      id: "union-intersection",
      title: { vi: "4. Union, Intersection, Literal & Narrowing", en: "4. Union, Intersection, Literal types & Narrowing" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Union type</b> (<code>A | B</code>) — giá trị có thể là A hoặc B. <b>Intersection type</b> (<code>A &amp; B</code>) — giá trị phải thỏa mãn cả A lẫn B. <b>Literal type</b> — giá trị chỉ được là một hằng cụ thể. <b>Narrowing</b> — thu hẹp union về một kiểu cụ thể trong một nhánh code.",
          en: "<b>Union type</b> (<code>A | B</code>) — value is either A or B. <b>Intersection type</b> (<code>A &amp; B</code>) — value must satisfy both A and B. <b>Literal type</b> — value can only be one specific constant. <b>Narrowing</b> — refine a union to a specific type inside a code branch.",
        },
        {
          type: "code",
          code: "// Union\ntype StringOrNumber = string | number;\nfunction printId(id: string | number) {\n  if (typeof id === 'string') {\n    console.log(id.toUpperCase()); // string branch\n  } else {\n    console.log(id.toFixed(2));   // number branch\n  }\n}\n\n// Intersection\ntype Serializable = { serialize(): string };\ntype Loggable = { log(): void };\ntype Service = Serializable & Loggable; // must have both methods\n\n// Literal types\ntype Direction = 'north' | 'south' | 'east' | 'west';\ntype HttpStatus = 200 | 201 | 400 | 404 | 500;\nfunction move(dir: Direction) { /* ... */ }\nmove('north'); // OK\n// move('up'); // Error: not assignable to Direction",
          caption: { vi: "Union, intersection, và literal types trong thực tế.", en: "Union, intersection, and literal types in practice." },
        },
        {
          type: "code",
          code: "// Narrowing techniques\n\n// 1. typeof\nfunction double(x: string | number) {\n  if (typeof x === 'number') return x * 2;\n  return x.repeat(2);\n}\n\n// 2. 'in' operator — check property exists\ntype Cat = { meow(): void };\ntype Dog = { bark(): void };\nfunction speak(pet: Cat | Dog) {\n  if ('meow' in pet) pet.meow();\n  else pet.bark();\n}\n\n// 3. instanceof\nfunction formatDate(d: Date | string) {\n  if (d instanceof Date) return d.toISOString();\n  return d;\n}\n\n// 4. Discriminated union — use a 'kind' / 'type' tag\ntype Circle = { kind: 'circle'; radius: number };\ntype Rect   = { kind: 'rect';   width: number; height: number };\ntype Shape  = Circle | Rect;\n\nfunction area(s: Shape): number {\n  switch (s.kind) {\n    case 'circle': return Math.PI * s.radius ** 2;\n    case 'rect':   return s.width * s.height;\n  }\n}",
          caption: { vi: "Bốn kỹ thuật narrowing phổ biến nhất.", en: "The four most common narrowing techniques." },
        },
        {
          type: "callout",
          variant: "key",
          vi: "<b>Discriminated union</b> (còn gọi là tagged union) là pattern mạnh nhất cho union phức tạp. Thêm một trường tag cố định (<code>kind</code>, <code>type</code>, <code>__typename</code>) để TypeScript biết chính xác kiểu trong mỗi nhánh switch.",
          en: "<b>Discriminated unions</b> (tagged unions) are the most powerful pattern for complex unions. Add a fixed tag field (<code>kind</code>, <code>type</code>, <code>__typename</code>) so TypeScript knows the exact type in each switch branch.",
        },
      ],
    },
    {
      id: "generics",
      title: { vi: "5. Generics — hàm và interface tham số hóa kiểu", en: "5. Generics — parameterised functions and interfaces" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Generic</b> cho phép bạn viết code một lần, dùng với nhiều kiểu khác nhau mà vẫn giữ được type safety. Thay vì dùng <code>any</code> (mất kiểm tra), bạn dùng <b>type parameter</b> như một placeholder.",
          en: "<b>Generics</b> let you write code once and reuse it with different types while keeping full type safety. Instead of <code>any</code> (which loses checking), you use a <b>type parameter</b> as a placeholder.",
        },
        {
          type: "code",
          code: "// Generic function\nfunction identity<T>(value: T): T {\n  return value;\n}\nconst s = identity<string>('hello'); // T = string\nconst n = identity(42);              // T inferred as number\n\n// Generic with array\nfunction first<T>(arr: T[]): T | undefined {\n  return arr[0];\n}\nconsole.log(first([1, 2, 3])); // number | undefined\n\n// Generic interface\ninterface ApiResponse<T> {\n  data: T;\n  status: number;\n  message: string;\n}\n\nconst userResponse: ApiResponse<{ name: string }> = {\n  data: { name: 'Alice' },\n  status: 200,\n  message: 'OK',\n};",
          caption: { vi: "Generic function, inferred type params, và generic interface.", en: "Generic functions, inferred type params, and generic interfaces." },
        },
        {
          type: "code",
          code: "// Constraints with 'extends'\nfunction getLength<T extends { length: number }>(item: T): number {\n  return item.length; // safe: T must have .length\n}\ngetLength('hello');   // string has .length\ngetLength([1, 2, 3]); // array has .length\n// getLength(42);     // Error: number has no .length\n\n// Multiple type params\nfunction merge<T extends object, U extends object>(a: T, b: U): T & U {\n  return { ...a, ...b };\n}\n\n// Default type parameter\ninterface Container<T = string> {\n  value: T;\n}\nconst box: Container = { value: 'hello' }; // T defaults to string\nconst numBox: Container<number> = { value: 42 };",
          caption: { vi: "<code>extends</code> ràng buộc type param; default type params giảm boilerplate.", en: "<code>extends</code> constrains type params; default type params reduce boilerplate." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Quy tắc nhớ: nếu bạn viết cùng logic cho <code>string</code>, <code>number</code>, <code>User</code>... và phải dùng <code>any</code> để gộp lại → đây là lúc dùng generic. Generic giữ nguyên mối quan hệ giữa input và output.",
          en: "Mnemonic: if you write the same logic for <code>string</code>, <code>number</code>, <code>User</code>... and need <code>any</code> to unify them → that's the generic signal. Generics preserve the relationship between input and output types.",
        },
      ],
    },
    {
      id: "utility-types",
      title: { vi: "6. Utility Types — biến đổi kiểu có sẵn", en: "6. Utility types — built-in type transformations" },
      blocks: [
        {
          type: "prose",
          vi: "TypeScript cung cấp sẵn nhiều <b>utility type</b> để biến đổi kiểu hiện có mà không cần tự viết. Chúng được implement bằng generics và mapped types.",
          en: "TypeScript ships with many <b>utility types</b> to transform existing types without writing them from scratch. They are implemented using generics and mapped types.",
        },
        {
          type: "table",
          headers: { vi: ["Utility type", "Mô tả", "Ví dụ nhanh"], en: ["Utility type", "Description", "Quick example"] },
          rows: [
            { vi: ["<code>Partial&lt;T&gt;</code>", "Tất cả thuộc tính optional", "<code>Partial&lt;User&gt;</code>"], en: ["<code>Partial&lt;T&gt;</code>", "All properties optional", "<code>Partial&lt;User&gt;</code>"] },
            { vi: ["<code>Required&lt;T&gt;</code>", "Tất cả thuộc tính required", "<code>Required&lt;Config&gt;</code>"], en: ["<code>Required&lt;T&gt;</code>", "All properties required", "<code>Required&lt;Config&gt;</code>"] },
            { vi: ["<code>Readonly&lt;T&gt;</code>", "Tất cả thuộc tính readonly", "<code>Readonly&lt;Point&gt;</code>"], en: ["<code>Readonly&lt;T&gt;</code>", "All properties readonly", "<code>Readonly&lt;Point&gt;</code>"] },
            { vi: ["<code>Pick&lt;T, K&gt;</code>", "Chỉ giữ các key K", "<code>Pick&lt;User, 'id' | 'name'&gt;</code>"], en: ["<code>Pick&lt;T, K&gt;</code>", "Keep only keys K", "<code>Pick&lt;User, 'id' | 'name'&gt;</code>"] },
            { vi: ["<code>Omit&lt;T, K&gt;</code>", "Bỏ các key K", "<code>Omit&lt;User, 'password'&gt;</code>"], en: ["<code>Omit&lt;T, K&gt;</code>", "Remove keys K", "<code>Omit&lt;User, 'password'&gt;</code>"] },
            { vi: ["<code>Record&lt;K, V&gt;</code>", "Object với key K và value V", "<code>Record&lt;string, number&gt;</code>"], en: ["<code>Record&lt;K, V&gt;</code>", "Object with keys K and values V", "<code>Record&lt;string, number&gt;</code>"] },
            { vi: ["<code>ReturnType&lt;T&gt;</code>", "Kiểu trả về của hàm T", "<code>ReturnType&lt;typeof fetch&gt;</code>"], en: ["<code>ReturnType&lt;T&gt;</code>", "Return type of function T", "<code>ReturnType&lt;typeof fetch&gt;</code>"] },
            { vi: ["<code>Exclude&lt;T, U&gt;</code>", "Loại bỏ U khỏi union T", "<code>Exclude&lt;'a'|'b'|'c', 'a'&gt;</code> → <code>'b'|'c'</code>"], en: ["<code>Exclude&lt;T, U&gt;</code>", "Remove U from union T", "<code>Exclude&lt;'a'|'b'|'c', 'a'&gt;</code> → <code>'b'|'c'</code>"] },
            { vi: ["<code>Extract&lt;T, U&gt;</code>", "Giữ lại phần giao của T và U", "<code>Extract&lt;string|number, number&gt;</code> → <code>number</code>"], en: ["<code>Extract&lt;T, U&gt;</code>", "Keep the intersection of T and U", "<code>Extract&lt;string|number, number&gt;</code> → <code>number</code>"] },
            { vi: ["<code>NonNullable&lt;T&gt;</code>", "Loại bỏ null/undefined", "<code>NonNullable&lt;string|null&gt;</code> → <code>string</code>"], en: ["<code>NonNullable&lt;T&gt;</code>", "Remove null/undefined", "<code>NonNullable&lt;string|null&gt;</code> → <code>string</code>"] },
          ],
        },
        {
          type: "code",
          code: "interface User {\n  id: number;\n  name: string;\n  password: string;\n  createdAt: Date;\n}\n\n// Partial — useful for update payloads\nfunction updateUser(id: number, patch: Partial<User>): User {\n  /* merge patch with existing */ return {} as User;\n}\nupdateUser(1, { name: 'Bob' }); // only name is required\n\n// Omit — create a safe 'public' view\ntype PublicUser = Omit<User, 'password'>;\n\n// Pick — form data subset\ntype LoginForm = Pick<User, 'name' | 'password'>;\n\n// Record — map of role → permission list\ntype Role = 'admin' | 'editor' | 'viewer';\nconst permissions: Record<Role, string[]> = {\n  admin: ['read', 'write', 'delete'],\n  editor: ['read', 'write'],\n  viewer: ['read'],\n};\n\n// ReturnType — infer what a function returns\nfunction getUser() { return { id: 1, name: 'Alice' }; }\ntype UserShape = ReturnType<typeof getUser>; // { id: number; name: string }",
          caption: { vi: "Utility types trong thực tế: Partial cho updates, Omit cho dữ liệu an toàn, Record cho lookups.", en: "Utility types in practice: Partial for updates, Omit for safe data, Record for lookups." },
        },
      ],
    },
    {
      id: "functions",
      title: { vi: "7. Functions — typing, overloads, this", en: "7. Functions — typing params, overloads, this" },
      blocks: [
        {
          type: "prose",
          vi: "TypeScript cho phép type mọi thứ liên quan đến hàm: parameter, return type, optional/default params, rest params, overloads, và kiểu <code>this</code>.",
          en: "TypeScript lets you type everything about a function: parameters, return type, optional/default params, rest params, overloads, and the <code>this</code> type.",
        },
        {
          type: "code",
          code: "// Basic function typing\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n\n// Arrow function\nconst multiply = (a: number, b: number): number => a * b;\n\n// Optional parameter (must come after required)\nfunction greet(name: string, greeting?: string): string {\n  return `${greeting ?? 'Hello'}, ${name}!`;\n}\n\n// Default parameter\nfunction createUser(name: string, role: string = 'viewer') {\n  return { name, role };\n}\n\n// Rest parameters\nfunction sum(...nums: number[]): number {\n  return nums.reduce((a, b) => a + b, 0);\n}\n\n// Function type alias\ntype Predicate<T> = (item: T) => boolean;\nconst isEven: Predicate<number> = (n) => n % 2 === 0;",
          caption: { vi: "Cú pháp type hàm: params, return, optional, default, rest.", en: "Function typing syntax: params, return, optional, default, rest." },
        },
        {
          type: "code",
          code: "// Overloads — one implementation, multiple call signatures\nfunction format(value: string): string;\nfunction format(value: number, decimals: number): string;\nfunction format(value: string | number, decimals?: number): string {\n  if (typeof value === 'string') return value.trim();\n  return value.toFixed(decimals ?? 2);\n}\n\nformat('  hello  ');  // uses first overload\nformat(3.14159, 3);   // uses second overload\n\n// 'this' typing — prevents accidental this loss\ninterface Counter {\n  count: number;\n  increment(this: Counter): void;\n}\nconst counter: Counter = {\n  count: 0,\n  increment() { this.count++; }, // 'this' is typed as Counter\n};",
          caption: { vi: "Overloads cho nhiều call signatures; <code>this</code> parameter ngăn lỗi mất context.", en: "Overloads for multiple call signatures; the <code>this</code> parameter prevents context-loss bugs." },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Overload implementation signature <b>không</b> accessible từ bên ngoài — chỉ các overload signatures (dòng khai báo không có body) mới là public API. Implementation signature phải tương thích với tất cả overloads.",
          en: "The overload implementation signature is <b>not</b> accessible from outside — only the overload declarations (lines without a body) form the public API. The implementation must be compatible with all overloads.",
        },
      ],
    },
    {
      id: "tsconfig",
      title: { vi: "8. tsconfig, strict mode & type assertions", en: "8. tsconfig, strict mode & type assertions" },
      blocks: [
        {
          type: "prose",
          vi: "<code>tsconfig.json</code> điều khiển hành vi compiler. <b>Strict mode</b> bật một bộ kiểm tra nghiêm ngặt — nên bật ngay từ đầu dự án. TypeScript dùng <b>structural typing</b> (\"duck typing\"): hai kiểu tương thích nếu có cùng cấu trúc, không cần cùng tên.",
          en: "<code>tsconfig.json</code> controls compiler behavior. <b>Strict mode</b> enables a bundle of rigorous checks — enable it from day one. TypeScript uses <b>structural typing</b> (\"duck typing\"): two types are compatible if they have the same shape, regardless of name.",
        },
        {
          type: "code",
          code: "// tsconfig.json (key options)\n{\n  \"compilerOptions\": {\n    \"target\": \"ES2020\",          // output JS version\n    \"module\": \"ESNext\",          // module system\n    \"strict\": true,              // enables all strict checks below\n    \"noImplicitAny\": true,       // ban implicit 'any'\n    \"strictNullChecks\": true,    // null/undefined not assignable to other types\n    \"strictFunctionTypes\": true, // stricter function param checking\n    \"noUncheckedIndexedAccess\": true, // arr[i] returns T | undefined\n    \"moduleResolution\": \"bundler\",\n    \"esModuleInterop\": true,\n    \"outDir\": \"dist\",\n    \"rootDir\": \"src\"\n  }\n}",
          caption: { vi: "Các option quan trọng nhất trong tsconfig. <code>strict: true</code> bật nhiều flag cùng lúc.", en: "The most important tsconfig options. <code>strict: true</code> enables many flags at once." },
        },
        {
          type: "code",
          code: "// Structural typing ('duck typing')\ninterface Named { name: string; }\nclass Person { constructor(public name: string) {} }\n\nfunction greet(n: Named) { console.log(n.name); }\ngreet(new Person('Alice')); // OK — Person has .name\ngreet({ name: 'Bob', age: 30 }); // OK — extra props fine when passed as expression\n\n// Type assertions (as) — you take full responsibility\nconst input = document.getElementById('name') as HTMLInputElement;\nconsole.log(input.value); // no null check, may throw at runtime!\n\n// Safer: combine with null check\nconst el = document.getElementById('name');\nif (el instanceof HTMLInputElement) {\n  console.log(el.value); // TypeScript now knows it's HTMLInputElement\n}\n\n// Double assertion (dangerous — only as last resort)\nconst x = 'hello' as unknown as number; // compiler won't complain but LIES",
          caption: { vi: "Structural typing cho phép linh hoạt; <code>as</code> bypass kiểm tra kiểu — dùng cẩn thận.", en: "Structural typing allows flexibility; <code>as</code> bypasses type checking — use carefully." },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<code>as</code> <b>không</b> chuyển đổi giá trị tại runtime — nó chỉ nói với TypeScript \"tin tôi đi\". Nếu bạn nhầm, lỗi sẽ xuất hiện lúc runtime chứ không phải lúc build. Luôn ưu tiên <b>narrowing</b> thay vì <code>as</code>.",
          en: "<code>as</code> does <b>not</b> convert values at runtime — it just tells TypeScript \"trust me\". If you're wrong, errors happen at runtime, not build time. Always prefer <b>narrowing</b> over <code>as</code>.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "TypeScript là JavaScript cộng thêm sự tự tin. Bật <code>strict</code> ngay từ đầu, dùng <code>unknown</code> thay <code>any</code>, narrow thay vì ép kiểu bằng <code>as</code>, và để compiler làm bạn — không phải kẻ thù.",
          en: "TypeScript is JavaScript plus confidence. Enable <code>strict</code> from day one, use <code>unknown</code> over <code>any</code>, narrow instead of casting with <code>as</code>, and let the compiler be your ally — not your obstacle.",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "TypeScript xử lý types lúc runtime thế nào?", en: "What does TypeScript do with types at runtime?" },
      back: { vi: "TypeScript <b>xóa hoàn toàn</b> tất cả type annotations sau khi biên dịch. Output là JavaScript thuần — không có runtime type checking.", en: "TypeScript <b>erases all</b> type annotations after compilation. The output is plain JavaScript — there is no runtime type checking." },
    },
    {
      front: { vi: "<code>any</code> vs <code>unknown</code> khác nhau thế nào?", en: "How does <code>any</code> differ from <code>unknown</code>?" },
      back: { vi: "<code>any</code>: tắt hoàn toàn kiểm tra kiểu — nguy hiểm. <code>unknown</code>: kiểu an toàn, buộc phải <b>narrow</b> (typeof/instanceof/guard) trước khi dùng.", en: "<code>any</code>: completely disables type checking — dangerous. <code>unknown</code>: type-safe, you must <b>narrow</b> (typeof/instanceof/guard) before using the value." },
    },
    {
      front: { vi: "Interface vs type alias — khác nhau gì về declaration merging?", en: "Interface vs type alias — how do they differ on declaration merging?" },
      back: { vi: "<b>Interface</b> có thể được khai báo nhiều lần, TypeScript tự gộp lại (augmentation). <b>Type alias</b> không cho khai báo trùng tên — lỗi compile.", en: "<b>Interface</b> can be declared multiple times; TypeScript merges them (augmentation). <b>Type alias</b> forbids duplicate declarations — compile error." },
    },
    {
      front: { vi: "Discriminated union là gì và tại sao dùng?", en: "What is a discriminated union and why use it?" },
      back: { vi: "Union các type có chung một <b>trường tag literal</b> (vd <code>kind: 'circle'</code>). TypeScript dùng tag để narrow tự động trong switch/if — exhaustive checking, không cần cast.", en: "A union of types sharing a <b>literal tag field</b> (e.g. <code>kind: 'circle'</code>). TypeScript uses the tag to narrow automatically in switch/if — exhaustive checking, no cast needed." },
    },
    {
      front: { vi: "Generic constraint <code>extends</code> làm gì?", en: "What does the generic constraint <code>extends</code> do?" },
      back: { vi: "Giới hạn type parameter chỉ nhận các kiểu có đủ cấu trúc yêu cầu. Vd <code>T extends { length: number }</code> đảm bảo T có thuộc tính <code>.length</code>.", en: "Restricts the type parameter to types with at least the required shape. E.g. <code>T extends { length: number }</code> guarantees T has a <code>.length</code> property." },
    },
    {
      front: { vi: "<code>Partial&lt;T&gt;</code> dùng khi nào?", en: "When do you use <code>Partial&lt;T&gt;</code>?" },
      back: { vi: "Khi cần object cùng shape nhưng tất cả props đều optional — thường dùng cho <b>update/patch payload</b> hoặc form state chưa điền đủ.", en: "When you need the same shape but all props optional — commonly used for <b>update/patch payloads</b> or partially-filled form state." },
    },
    {
      front: { vi: "<code>Omit&lt;T, K&gt;</code> vs <code>Pick&lt;T, K&gt;</code>?", en: "<code>Omit&lt;T, K&gt;</code> vs <code>Pick&lt;T, K&gt;</code>?" },
      back: { vi: "<code>Pick</code>: chỉ giữ lại các key được liệt kê. <code>Omit</code>: giữ tất cả trừ các key bị loại. Dùng <code>Omit</code> khi loại bỏ ít prop, <code>Pick</code> khi chỉ cần một số ít.", en: "<code>Pick</code>: keep only the listed keys. <code>Omit</code>: keep everything except the listed keys. Use <code>Omit</code> when removing few props, <code>Pick</code> when you only need a few." },
    },
    {
      front: { vi: "Structural typing (duck typing) nghĩa là gì trong TypeScript?", en: "What does structural typing (duck typing) mean in TypeScript?" },
      back: { vi: "Hai kiểu <b>tương thích</b> nếu có cùng cấu trúc, không cần cùng tên. Một <code>class Dog { name: string }</code> tương thích với <code>interface Named { name: string }</code> — TypeScript không quan tâm \"tên\" kiểu.", en: "Two types are <b>compatible</b> if they share the same shape, regardless of name. A <code>class Dog { name: string }</code> is compatible with <code>interface Named { name: string }</code> — TypeScript cares about structure, not names." },
    },
    {
      front: { vi: "<code>ReturnType&lt;T&gt;</code> dùng như thế nào?", en: "How is <code>ReturnType&lt;T&gt;</code> used?" },
      back: { vi: "Trích xuất kiểu trả về của một hàm T. Ví dụ: <code>ReturnType&lt;typeof someFunction&gt;</code> — hữu ích khi không muốn lặp lại kiểu trả về ở nhiều chỗ.", en: "Extracts the return type of function T. E.g. <code>ReturnType&lt;typeof someFunction&gt;</code> — useful when you don't want to repeat the return type in multiple places." },
    },
    {
      front: { vi: "Tại sao nên tránh dùng <code>as</code> (type assertion) thường xuyên?", en: "Why should you avoid using <code>as</code> (type assertion) frequently?" },
      back: { vi: "<code>as</code> không làm gì tại runtime — nó chỉ tắt kiểm tra compile. Nếu assertion sai, lỗi xảy ra lúc chạy mà không có cảnh báo. Ưu tiên <b>narrowing</b> (typeof, instanceof, discriminated union) thay thế.", en: "<code>as</code> does nothing at runtime — it only silences compile-time checking. If the assertion is wrong, runtime errors occur with no warning. Prefer <b>narrowing</b> (typeof, instanceof, discriminated unions) instead." },
    },
    {
      front: { vi: "Tác dụng của <code>strict: true</code> trong tsconfig?", en: "What does <code>strict: true</code> do in tsconfig?" },
      back: { vi: "Bật đồng thời nhiều flag nghiêm ngặt: <code>noImplicitAny</code>, <code>strictNullChecks</code>, <code>strictFunctionTypes</code>, <code>strictBindCallApply</code>... Giúp bắt nhiều lỗi hơn mà không cần bật từng flag riêng lẻ.", en: "Enables multiple strict flags at once: <code>noImplicitAny</code>, <code>strictNullChecks</code>, <code>strictFunctionTypes</code>, <code>strictBindCallApply</code>... Catches more bugs without toggling each flag individually." },
    },
    {
      front: { vi: "Hàm overload trong TypeScript hoạt động thế nào?", en: "How do function overloads work in TypeScript?" },
      back: { vi: "Bạn khai báo nhiều <b>overload signatures</b> (không có body) rồi một <b>implementation signature</b> (có body) phải tương thích với tất cả. Bên ngoài chỉ thấy overload signatures — implementation ẩn.", en: "You declare multiple <b>overload signatures</b> (no body) then one <b>implementation signature</b> (with body) that must be compatible with all of them. Callers only see the overload signatures — the implementation is hidden." },
    },
  ],
  quiz: [
    {
      q: { vi: "TypeScript làm gì với type annotations khi biên dịch xong?", en: "What happens to TypeScript type annotations after compilation?" },
      options: [
        { vi: "Chúng được giữ lại và kiểm tra lúc runtime", en: "They are kept and checked at runtime" },
        { vi: "Chúng bị xóa hoàn toàn — output là JavaScript thuần", en: "They are completely erased — the output is plain JavaScript" },
        { vi: "Chúng được chuyển thành comment trong output", en: "They are converted to comments in the output" },
        { vi: "Chúng được biên dịch thành WASM", en: "They are compiled to WASM" },
      ],
      answer: 1,
      explain: { vi: "TypeScript là compile-time tool. Tất cả kiểu bị xóa sau khi biên dịch. Output JS không có runtime overhead từ types.", en: "TypeScript is a compile-time tool. All types are erased after compilation. The JS output has zero runtime overhead from types." },
    },
    {
      q: { vi: "Sự khác biệt chính giữa <code>any</code> và <code>unknown</code> là gì?", en: "What is the key difference between <code>any</code> and <code>unknown</code>?" },
      options: [
        { vi: "<code>any</code> chỉ dùng cho primitives, <code>unknown</code> cho objects", en: "<code>any</code> is only for primitives, <code>unknown</code> for objects" },
        { vi: "<code>unknown</code> yêu cầu narrow trước khi dùng; <code>any</code> tắt mọi kiểm tra", en: "<code>unknown</code> requires narrowing before use; <code>any</code> disables all checks" },
        { vi: "Chúng giống hệt nhau, chỉ khác tên", en: "They are identical, just different names" },
        { vi: "<code>unknown</code> là alias của <code>object</code>", en: "<code>unknown</code> is an alias for <code>object</code>" },
      ],
      answer: 1,
      explain: { vi: "<code>any</code> hoàn toàn tắt kiểm tra kiểu. <code>unknown</code> an toàn hơn: bạn phải narrow (typeof, instanceof) trước khi thao tác trên giá trị.", en: "<code>any</code> completely disables type checking. <code>unknown</code> is safer: you must narrow (typeof, instanceof) before operating on the value." },
    },
    {
      q: { vi: "Đặc điểm nào CHỈ có ở interface, không có ở type alias?", en: "Which feature is ONLY available on interfaces, not type aliases?" },
      options: [
        { vi: "Mô tả object shape", en: "Describing an object shape" },
        { vi: "Declaration merging (gộp nhiều khai báo cùng tên)", en: "Declaration merging (multiple same-name declarations merge)" },
        { vi: "Dùng với generics", en: "Use with generics" },
        { vi: "Implement trong class", en: "Implement in a class" },
      ],
      answer: 1,
      explain: { vi: "Declaration merging chỉ có ở interface: khai báo cùng tên nhiều lần → TypeScript tự gộp. Type alias không cho phép điều này.", en: "Declaration merging is interface-only: declaring the same name multiple times → TypeScript merges them. Type aliases forbid duplicate names." },
    },
    {
      q: { vi: "Khi nào nên dùng discriminated union?", en: "When should you use a discriminated union?" },
      options: [
        { vi: "Khi muốn gộp hai object bằng spread", en: "When you want to merge two objects with spread" },
        { vi: "Khi muốn TypeScript narrow tự động trong switch/if dựa trên một trường tag", en: "When you want TypeScript to narrow automatically in switch/if based on a tag field" },
        { vi: "Khi cần type parameter", en: "When you need a type parameter" },
        { vi: "Khi muốn tắt strictNullChecks", en: "When you want to disable strictNullChecks" },
      ],
      answer: 1,
      explain: { vi: "Discriminated union dùng một trường literal tag chung (vd <code>kind</code>) để TypeScript biết chính xác kiểu trong từng nhánh — không cần cast, compiler kiểm tra exhaustive.", en: "Discriminated unions use a shared literal tag field (e.g. <code>kind</code>) so TypeScript knows the exact type in each branch — no cast needed, compiler checks exhaustiveness." },
    },
    {
      q: { vi: "Generic constraint <code>&lt;T extends { length: number }&gt;</code> cho phép điều gì?", en: "What does the generic constraint <code>&lt;T extends { length: number }&gt;</code> allow?" },
      options: [
        { vi: "T chỉ được là number", en: "T can only be a number" },
        { vi: "T có thể là bất kỳ kiểu nào có thuộc tính .length kiểu number", en: "T can be any type that has a .length property of type number" },
        { vi: "T phải là một class", en: "T must be a class" },
        { vi: "T phải là một array", en: "T must be an array" },
      ],
      answer: 1,
      explain: { vi: "Constraint <code>extends { length: number }</code> chỉ yêu cầu T có cấu trúc đó — string, array, hoặc bất kỳ object nào có .length đều được. Structural typing.", en: "The constraint <code>extends { length: number }</code> only requires T to have that shape — strings, arrays, or any object with .length qualify. Structural typing at work." },
    },
    {
      q: { vi: "<code>Partial&lt;User&gt;</code> tạo ra kiểu gì?", en: "What type does <code>Partial&lt;User&gt;</code> produce?" },
      options: [
        { vi: "User với tất cả thuộc tính bị xóa", en: "User with all properties removed" },
        { vi: "User với tất cả thuộc tính trở thành optional", en: "User with all properties made optional" },
        { vi: "User với tất cả thuộc tính trở thành readonly", en: "User with all properties made readonly" },
        { vi: "User với tất cả thuộc tính là never", en: "User with all properties as never" },
      ],
      answer: 1,
      explain: { vi: "<code>Partial&lt;T&gt;</code> thêm <code>?</code> vào mọi thuộc tính — hữu ích cho update/patch operations khi chỉ cần truyền các props thay đổi.", en: "<code>Partial&lt;T&gt;</code> adds <code>?</code> to every property — useful for update/patch operations where you only pass the changed props." },
    },
    {
      q: { vi: "TypeScript dùng kiểu typing nào — nominal hay structural?", en: "TypeScript uses which typing approach — nominal or structural?" },
      options: [
        { vi: "Nominal — hai kiểu tương thích chỉ khi cùng tên", en: "Nominal — two types are compatible only if they have the same name" },
        { vi: "Structural — hai kiểu tương thích nếu cùng cấu trúc", en: "Structural — two types are compatible if they have the same shape" },
        { vi: "Duck typing chỉ áp dụng cho primitives", en: "Duck typing applies only to primitives" },
        { vi: "Không có hệ thống typing — mọi thứ là any", en: "No typing system — everything is any" },
      ],
      answer: 1,
      explain: { vi: "TypeScript dùng <b>structural typing</b>: nếu hai kiểu có cùng cấu trúc (properties/methods), chúng tương thích — không cần cùng tên hay cùng kế thừa.", en: "TypeScript uses <b>structural typing</b>: if two types share the same structure (properties/methods), they are compatible — regardless of name or inheritance." },
    },
    {
      q: { vi: "<code>as</code> type assertion làm gì tại runtime?", en: "What does a <code>as</code> type assertion do at runtime?" },
      options: [
        { vi: "Chuyển đổi giá trị sang kiểu mới", en: "Converts the value to the new type" },
        { vi: "Không làm gì — chỉ tắt kiểm tra compile-time", en: "Nothing — it only silences compile-time checking" },
        { vi: "Throw error nếu kiểu sai", en: "Throws an error if the type is wrong" },
        { vi: "Tạo một bản sao của giá trị", en: "Creates a copy of the value" },
      ],
      answer: 1,
      explain: { vi: "<code>as</code> bị xóa cùng với mọi type annotation khi biên dịch. Nó chỉ là lời hứa với compiler — nếu sai, lỗi xảy ra lúc runtime mà không có cảnh báo.", en: "<code>as</code> is erased along with all type annotations at compile time. It is just a promise to the compiler — if wrong, runtime errors occur silently." },
    },
    {
      q: { vi: "Cú pháp khai báo function overload nào là đúng trong TypeScript?", en: "Which is the correct way to declare a function overload in TypeScript?" },
      options: [
        { vi: "Khai báo hai hàm cùng tên với body khác nhau", en: "Declare two functions with the same name but different bodies" },
        { vi: "Khai báo nhiều signatures không có body, sau đó một implementation có body", en: "Declare multiple signatures without a body, then one implementation with a body" },
        { vi: "Dùng <code>@overload</code> decorator", en: "Use an <code>@overload</code> decorator" },
        { vi: "Dùng <code>function*</code> generator", en: "Use a <code>function*</code> generator" },
      ],
      answer: 1,
      explain: { vi: "TypeScript overloads: N signature-only declarations (không có <code>{}</code>), rồi một implementation signature với body. Chỉ signatures được expose — implementation ẩn với caller.", en: "TypeScript overloads: N signature-only declarations (no <code>{}</code>), then one implementation signature with a body. Only the signatures are exposed — the implementation is hidden from callers." },
    },
    {
      q: { vi: "<code>strict: true</code> trong tsconfig bật flag nào sau đây?", en: "Which flag does <code>strict: true</code> in tsconfig enable?" },
      options: [
        { vi: "Chỉ <code>noImplicitAny</code>", en: "Only <code>noImplicitAny</code>" },
        { vi: "<code>strictNullChecks</code>, <code>noImplicitAny</code>, <code>strictFunctionTypes</code> và nhiều hơn", en: "<code>strictNullChecks</code>, <code>noImplicitAny</code>, <code>strictFunctionTypes</code>, and more" },
        { vi: "Chỉ <code>strictNullChecks</code>", en: "Only <code>strictNullChecks</code>" },
        { vi: "Không bật gì — chỉ là alias của <code>target: ES5</code>", en: "Nothing — it's just an alias for <code>target: ES5</code>" },
      ],
      answer: 1,
      explain: { vi: "<code>strict: true</code> là shorthand bật đồng thời: <code>strictNullChecks</code>, <code>noImplicitAny</code>, <code>strictFunctionTypes</code>, <code>strictBindCallApply</code>, <code>strictPropertyInitialization</code>, <code>noImplicitThis</code>, <code>alwaysStrict</code>.", en: "<code>strict: true</code> is a shorthand enabling: <code>strictNullChecks</code>, <code>noImplicitAny</code>, <code>strictFunctionTypes</code>, <code>strictBindCallApply</code>, <code>strictPropertyInitialization</code>, <code>noImplicitThis</code>, <code>alwaysStrict</code>." },
    },
  ],
});
