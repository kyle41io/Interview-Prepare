/* OS — Operating Systems */
PREP.register({
  id: "os",
  icon: "🖥️",
  category: "cs",
  title: { vi: "Hệ điều hành", en: "Operating Systems" },
  blurb: {
    vi: "Hiểu cách OS quản lý tiến trình, bộ nhớ, đồng thời và I/O là nền tảng để giải thích mọi vấn đề hiệu năng và thiết kế hệ thống.",
    en: "Understanding how an OS manages processes, memory, concurrency, and I/O is the foundation for explaining every performance and system-design problem.",
  },
  sections: [
    {
      id: "process-thread",
      title: { vi: "1. Tiến trình vs Luồng", en: "1. Process vs Thread" },
      blocks: [
        {
          type: "prose",
          vi: "Một <b>tiến trình (process)</b> là chương trình đang chạy với không gian địa chỉ riêng, bao gồm code, heap, stack và các file descriptor. Một <b>luồng (thread)</b> là đơn vị thực thi nhỏ hơn — nhiều luồng trong cùng tiến trình chia sẻ heap và file descriptor nhưng mỗi luồng có <b>stack và register riêng</b>.",
          en: "A <b>process</b> is a running program with its own address space containing code, heap, stack, and file descriptors. A <b>thread</b> is a lighter execution unit — threads in the same process share the heap and file descriptors but each has its own <b>stack and registers</b>.",
        },
        {
          type: "table",
          headers: { vi: ["Khía cạnh", "Tiến trình", "Luồng"], en: ["Aspect", "Process", "Thread"] },
          rows: [
            { vi: ["Không gian địa chỉ", "Riêng (isolated)", "Chia sẻ với tiến trình cha"], en: ["Address space", "Private (isolated)", "Shared with parent process"] },
            { vi: ["Chi phí tạo", "Cao (fork/exec, copy page tables)", "Thấp (stack mới, không copy bộ nhớ)"], en: ["Creation cost", "High (fork/exec, copy page tables)", "Low (new stack, no memory copy)"] },
            { vi: ["Giao tiếp", "IPC: pipe, socket, shared memory", "Trực tiếp qua shared heap"], en: ["Communication", "IPC: pipe, socket, shared memory", "Directly via shared heap"] },
            { vi: ["Lỗi cô lập", "Crash không ảnh hưởng tiến trình khác", "Crash một luồng có thể sập cả tiến trình"], en: ["Fault isolation", "Crash does not affect other processes", "Crash in one thread can kill the whole process"] },
            { vi: ["Context switch", "Đắt hơn (đổi page table)", "Rẻ hơn (giữ nguyên page table)"], en: ["Context switch", "More expensive (swap page table)", "Cheaper (page table unchanged)"] },
          ],
        },
        {
          type: "prose",
          vi: "<b>Context switch</b> là khi OS lưu trạng thái (registers, program counter, stack pointer) của tiến trình/luồng hiện tại rồi nạp trạng thái của tiến trình/luồng khác. Với tiến trình, OS còn phải đổi page table — đắt hơn đáng kể.",
          en: "<b>Context switching</b> is when the OS saves the state (registers, program counter, stack pointer) of the current process/thread and loads the state of another. For processes the OS must also swap the page table — significantly more expensive.",
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Dùng <b>tiến trình</b> khi cần cô lập mạnh (crash-safety, security sandbox). Dùng <b>luồng</b> khi cần chia sẻ dữ liệu nhiều và context switch thường xuyên (web server xử lý hàng nghìn request).",
          en: "Use <b>processes</b> when you need strong isolation (crash-safety, security sandbox). Use <b>threads</b> when heavy data sharing and frequent context switches are needed (web server handling thousands of requests).",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "\"Tiến trình là container tài nguyên; luồng là đơn vị thực thi. Chia sẻ heap = luồng nhanh hơn nhưng đòi hỏi đồng bộ; cô lập = tiến trình an toàn hơn nhưng IPC chậm hơn.\"",
          en: "\"A process is a resource container; a thread is a unit of execution. Shared heap = threads are faster but need synchronization; isolation = processes are safer but IPC is slower.\"",
        },
      ],
    },
    {
      id: "cpu-scheduling",
      title: { vi: "2. Lập lịch CPU", en: "2. CPU Scheduling" },
      blocks: [
        {
          type: "prose",
          vi: "Bộ lập lịch (scheduler) quyết định luồng nào được chạy trên CPU và trong bao lâu. Hai loại chính: <b>non-preemptive</b> (chạy đến khi tự nguyện nhường) và <b>preemptive</b> (OS có thể cướp CPU bất kỳ lúc nào).",
          en: "The scheduler decides which thread runs on the CPU and for how long. Two main types: <b>non-preemptive</b> (run until voluntarily yielded) and <b>preemptive</b> (OS can interrupt at any time).",
        },
        {
          type: "table",
          headers: { vi: ["Thuật toán", "Mô tả", "Ưu điểm", "Nhược điểm"], en: ["Algorithm", "Description", "Pros", "Cons"] },
          rows: [
            { vi: ["FCFS", "Chạy theo thứ tự đến (non-preemptive)", "Đơn giản, công bằng về thứ tự", "Convoy effect: job dài chặn job ngắn"], en: ["FCFS", "Run in arrival order (non-preemptive)", "Simple, fair by order", "Convoy effect: long job blocks short ones"] },
            { vi: ["SJF / SRTF", "Job ngắn nhất chạy trước; SRTF là phiên bản preemptive", "Tối thiểu thời gian chờ trung bình", "Cần biết burst time trước; có thể gây starvation"], en: ["SJF / SRTF", "Shortest job first; SRTF is the preemptive variant", "Minimizes average waiting time", "Requires burst time upfront; can starve long jobs"] },
            { vi: ["Round Robin", "Mỗi job chạy một quantum thời gian rồi xoay vòng (preemptive)", "Công bằng, phù hợp time-sharing", "Quantum nhỏ → nhiều context switch; lớn → giống FCFS"], en: ["Round Robin", "Each job runs one time quantum then rotates (preemptive)", "Fair, good for time-sharing", "Small quantum → many context switches; large → like FCFS"] },
            { vi: ["Priority", "Job ưu tiên cao nhất chạy trước; có thể preemptive", "Phân biệt được tác vụ quan trọng", "Starvation: job thấp ưu tiên chờ mãi (dùng aging để sửa)"], en: ["Priority", "Highest-priority job runs first; can be preemptive", "Supports task importance differentiation", "Starvation: low-priority jobs wait forever (use aging to fix)"] },
            { vi: ["Multilevel Feedback Queue (MLFQ)", "Nhiều hàng đợi ưu tiên, job hạ bậc khi dùng nhiều CPU", "Thực tế: cân bằng giữa interactive & batch", "Phức tạp để cài đặt và cấu hình"], en: ["Multilevel Feedback Queue (MLFQ)", "Multiple priority queues, jobs demote on CPU usage", "Practical: balances interactive & batch work", "Complex to implement and tune"] },
          ],
        },
        {
          type: "prose",
          vi: "<b>Turnaround time</b> = thời điểm hoàn thành − thời điểm đến. <b>Waiting time</b> = turnaround time − burst time. <b>Response time</b> = thời điểm chạy lần đầu − thời điểm đến.",
          en: "<b>Turnaround time</b> = completion time − arrival time. <b>Waiting time</b> = turnaround time − burst time. <b>Response time</b> = first-run time − arrival time.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "\"Round Robin là preemptive nhất — mỗi job đều có lượt. MLFQ là thuật toán OS thực tế vì tự học hành vi job qua feedback.\"",
          en: "\"Round Robin is the most preemptive — every job gets a turn. MLFQ is the real-world OS algorithm because it learns job behavior through feedback.\"",
        },
      ],
    },
    {
      id: "memory",
      title: { vi: "3. Bộ nhớ & Bộ nhớ ảo", en: "3. Memory & Virtual Memory" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Bộ nhớ ảo (virtual memory)</b> cho mỗi tiến trình ảo giác như có không gian địa chỉ riêng. OS dùng <b>page table</b> để dịch địa chỉ ảo → vật lý. Đơn vị ánh xạ là <b>page</b> (thường 4 KB).",
          en: "<b>Virtual memory</b> gives each process the illusion of its own address space. The OS uses a <b>page table</b> to translate virtual → physical addresses. The unit of mapping is a <b>page</b> (typically 4 KB).",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Paging</b>: chia RAM thành các frame cố định, tiến trình thành các page — không có external fragmentation.", en: "<b>Paging</b>: divide RAM into fixed frames, process into pages — no external fragmentation." },
            { vi: "<b>TLB (Translation Lookaside Buffer)</b>: cache phần cứng của page table entries. Hit → dịch địa chỉ trong ~1 cycle; miss → phải tra page table trong RAM (~100 cycles).", en: "<b>TLB (Translation Lookaside Buffer)</b>: hardware cache of page-table entries. Hit → address translation in ~1 cycle; miss → must walk the page table in RAM (~100 cycles)." },
            { vi: "<b>Page fault</b>: truy cập page không có trong RAM → OS nạp từ disk. Minor fault (page chỉ chưa map) rất nhanh; major fault (load từ disk) tốn hàng ms.", en: "<b>Page fault</b>: accessing a page not in RAM → OS loads it from disk. Minor faults (page just not yet mapped) are fast; major faults (disk load) cost milliseconds." },
            { vi: "<b>Swapping</b>: OS đẩy một page ít dùng ra swap space (disk) để nhường RAM cho page mới. Quá nhiều swap = <b>thrashing</b> — CPU dành phần lớn thời gian xử lý page fault.", en: "<b>Swapping</b>: OS evicts a cold page to swap space (disk) to make room. Too much swapping = <b>thrashing</b> — CPU spends most time handling page faults." },
            { vi: "<b>Segmentation</b>: chia không gian địa chỉ theo vùng có nghĩa (code, heap, stack) với kích thước thay đổi. Dễ external fragmentation; hiện đại kết hợp với paging.", en: "<b>Segmentation</b>: split address space into meaningful regions (code, heap, stack) of variable size. Prone to external fragmentation; modern OSes combine it with paging." },
          ],
        },
        {
          type: "prose",
          vi: "Trong một tiến trình: <b>stack</b> lưu lời gọi hàm, biến cục bộ (LIFO, tăng xuống, bị giới hạn — stack overflow khi quá sâu). <b>Heap</b> lưu bộ nhớ cấp phát động (<code>malloc</code>/<code>new</code>) — lớn hơn nhưng cần quản lý thủ công hoặc GC.",
          en: "Within a process: the <b>stack</b> holds function call frames and local variables (LIFO, grows down, bounded — stack overflow on deep recursion). The <b>heap</b> holds dynamically allocated memory (<code>malloc</code>/<code>new</code>) — larger but requires manual management or a GC.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "\"Virtual memory = mỗi tiến trình nghĩ mình sở hữu toàn bộ địa chỉ. TLB là lý do paging không chậm kinh khủng trong thực tế.\"",
          en: "\"Virtual memory = each process thinks it owns the whole address space. The TLB is why paging doesn't kill performance in practice.\"",
        },
      ],
    },
    {
      id: "concurrency",
      title: { vi: "4. Đồng thời & Đồng bộ", en: "4. Concurrency & Synchronization" },
      blocks: [
        {
          type: "prose",
          vi: "Khi nhiều luồng truy cập <b>dữ liệu dùng chung</b> mà không có đồng bộ, kết quả phụ thuộc vào thứ tự lên lịch — đây là <b>race condition</b>. Vùng code truy cập dữ liệu dùng chung gọi là <b>critical section</b>.",
          en: "When multiple threads access <b>shared data</b> without synchronization, the result depends on scheduling order — this is a <b>race condition</b>. The code region that accesses shared data is called the <b>critical section</b>.",
        },
        {
          type: "code",
          code: "// Race condition example (C-like pseudocode)\nint counter = 0;\n\n// Thread 1          // Thread 2\ntemp = counter;     temp = counter;   // both read 0\ntemp = temp + 1;    temp = temp + 1;  // both compute 1\ncounter = temp;     counter = temp;   // both write 1 -> lost update!",
          caption: { vi: "Ví dụ race condition: hai luồng tăng counter nhưng kết quả là 1 thay vì 2.", en: "Race condition: two threads increment counter but result is 1 instead of 2." },
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Mutex (mutual exclusion lock)</b>: chỉ 1 luồng giữ lock tại một thời điểm. Luồng khác block cho đến khi lock được giải phóng. Dùng để bảo vệ critical section.", en: "<b>Mutex (mutual exclusion lock)</b>: only one thread holds the lock at a time. Other threads block until it is released. Used to protect a critical section." },
            { vi: "<b>Semaphore</b>: bộ đếm (≥ 0). <code>wait()</code> giảm — block nếu = 0. <code>signal()</code> tăng. Binary semaphore ≈ mutex. Counting semaphore quản lý pool tài nguyên (ví dụ: tối đa 10 kết nối DB).", en: "<b>Semaphore</b>: a counter (≥ 0). <code>wait()</code> decrements — blocks if 0. <code>signal()</code> increments. Binary semaphore ≈ mutex. Counting semaphore manages a resource pool (e.g., max 10 DB connections)." },
            { vi: "<b>Spinlock</b>: luồng liên tục kiểm tra (busy-wait) thay vì ngủ. Nhanh khi critical section ngắn; lãng phí CPU nếu chờ lâu.", en: "<b>Spinlock</b>: thread busy-waits (polls) instead of sleeping. Fast for short critical sections; wastes CPU if wait is long." },
            { vi: "<b>Atomic operation</b>: đọc-sửa-ghi trong một lệnh không thể bị ngắt (compare-and-swap, fetch-and-add). Không cần lock cho biến đơn lẻ — cơ sở của lock-free algorithms.", en: "<b>Atomic operation</b>: read-modify-write in a single uninterruptible instruction (compare-and-swap, fetch-and-add). No lock needed for a single variable — the basis of lock-free algorithms." },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Mutex vs Semaphore: mutex <b>có chủ sở hữu</b> (chỉ luồng lock mới unlock được). Semaphore không có chủ — bất kỳ luồng nào cũng có thể signal. Dùng mutex để bảo vệ dữ liệu; semaphore để báo hiệu sự kiện hoặc giới hạn số lượng.",
          en: "Mutex vs Semaphore: a mutex has an <b>owner</b> (only the locking thread can unlock it). A semaphore has no owner — any thread can signal. Use mutexes to protect data; semaphores to signal events or limit concurrency.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "\"Race condition = không đồng bộ. Critical section = khu vực nguy hiểm cần mutex. Atomic ops = đồng bộ không cần lock cho biến đơn.\"",
          en: "\"Race condition = missing sync. Critical section = the danger zone needing a mutex. Atomic ops = lock-free sync for single variables.\"",
        },
      ],
    },
    {
      id: "deadlock",
      title: { vi: "5. Deadlock", en: "5. Deadlock" },
      blocks: [
        {
          type: "prose",
          vi: "Deadlock xảy ra khi một nhóm tiến trình/luồng mỗi cái đang chờ tài nguyên do cái khác giữ, tạo thành vòng chờ vô hạn.",
          en: "Deadlock occurs when a group of processes/threads each waits for a resource held by another, forming a circular wait with no way out.",
        },
        {
          type: "table",
          headers: { vi: ["Điều kiện Coffman", "Giải thích"], en: ["Coffman Condition", "Explanation"] },
          rows: [
            { vi: ["1. Mutual Exclusion", "Tài nguyên chỉ một tiến trình giữ được tại một thời điểm"], en: ["1. Mutual Exclusion", "A resource can only be held by one process at a time"] },
            { vi: ["2. Hold and Wait", "Tiến trình đang giữ tài nguyên và chờ thêm tài nguyên khác"], en: ["2. Hold and Wait", "A process holds resources while waiting for more"] },
            { vi: ["3. No Preemption", "OS không thể cưỡng đoạt tài nguyên đang được giữ"], en: ["3. No Preemption", "The OS cannot forcibly take a held resource"] },
            { vi: ["4. Circular Wait", "Tồn tại vòng P1→P2→…→Pn→P1 cùng chờ nhau"], en: ["4. Circular Wait", "A cycle P1→P2→…→Pn→P1 of waiting exists"] },
          ],
        },
        {
          type: "prose",
          vi: "Cần đủ cả 4 điều kiện mới xảy ra deadlock. Phá vỡ bất kỳ một điều kiện nào là đủ để ngăn chặn.",
          en: "All four conditions must hold simultaneously for a deadlock. Breaking any one condition is sufficient to prevent it.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Prevention</b>: thiết kế hệ thống để ít nhất một trong 4 điều kiện không bao giờ xảy ra. VD: yêu cầu tất cả tài nguyên cùng lúc (phá Hold-and-Wait); đặt thứ tự lock toàn cục (phá Circular Wait).", en: "<b>Prevention</b>: design so at least one condition can never hold. E.g. request all resources at once (breaks Hold-and-Wait); impose a global lock ordering (breaks Circular Wait)." },
            { vi: "<b>Avoidance</b>: cấp tài nguyên chỉ khi trạng thái hệ thống vẫn <b>safe</b> (Banker's Algorithm). Cần biết trước nhu cầu tối đa — khó thực tế.", en: "<b>Avoidance</b>: grant resources only if the system stays in a <b>safe state</b> (Banker's Algorithm). Requires knowing max demand upfront — impractical in reality." },
            { vi: "<b>Detection & Recovery</b>: cho deadlock xảy ra, dùng graph tìm vòng, rồi kill hoặc rollback một tiến trình để phá vòng. OS hiện đại thường dùng cách này.", en: "<b>Detection & Recovery</b>: let deadlocks happen, detect cycles with a resource allocation graph, then kill or rollback a process to break the cycle. Modern OSes often use this." },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "<b>Livelock</b>: các tiến trình liên tục thay đổi trạng thái để nhường nhau nhưng không ai tiến được (ví dụ: hai người nhường đường trên hành lang mãi). <b>Starvation</b>: một tiến trình không bao giờ được cấp tài nguyên vì luôn có kẻ ưu tiên cao hơn.",
          en: "<b>Livelock</b>: processes keep changing state to yield to each other but make no progress (like two people endlessly sidestepping in a hallway). <b>Starvation</b>: a process never gets a resource because higher-priority processes always jump the queue.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "\"4 điều kiện Coffman: Mutual Exclusion, Hold-and-Wait, No Preemption, Circular Wait. Phá một điều kiện = phá deadlock. Circular Wait dễ phá nhất: đặt thứ tự lock toàn cục.\"",
          en: "\"4 Coffman conditions: Mutual Exclusion, Hold-and-Wait, No Preemption, Circular Wait. Break one = no deadlock. Circular Wait is easiest to break: impose a global lock order.\"",
        },
      ],
    },
    {
      id: "ipc-syscall",
      title: { vi: "6. IPC & System Call", en: "6. IPC & System Calls" },
      blocks: [
        {
          type: "prose",
          vi: "CPU chạy ở hai chế độ: <b>user mode</b> (quyền hạn chế, không truy cập hardware trực tiếp) và <b>kernel mode</b> (quyền đầy đủ, truy cập mọi tài nguyên). Khi cần dịch vụ OS, chương trình thực hiện <b>system call</b> — trap vào kernel mode, OS xử lý, rồi trả về user mode.",
          en: "The CPU runs in two modes: <b>user mode</b> (restricted privileges, no direct hardware access) and <b>kernel mode</b> (full privileges, access to all resources). When a program needs an OS service it makes a <b>system call</b> — traps into kernel mode, the OS handles it, then returns to user mode.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Pipe (ống)</b>: kênh dữ liệu một chiều giữa hai tiến trình liên quan (thường cha-con). <code>ls | grep foo</code> là ví dụ. Kernel buffer; đơn giản nhưng chỉ một chiều và chỉ giữa tiến trình có quan hệ (anonymous pipe) hoặc dùng named pipe (FIFO) cho không liên quan.", en: "<b>Pipe</b>: one-directional data channel between related processes (usually parent-child). <code>ls | grep foo</code> is the classic example. Kernel-buffered; simple but unidirectional and limited to related processes (anonymous pipe) or named pipe (FIFO) for unrelated ones." },
            { vi: "<b>Shared Memory</b>: ánh xạ cùng một vùng vật lý vào không gian địa chỉ của nhiều tiến trình — nhanh nhất vì không copy qua kernel. Cần đồng bộ riêng (semaphore/mutex) để tránh race condition.", en: "<b>Shared Memory</b>: map the same physical region into multiple processes' address spaces — fastest IPC because no kernel copy needed. Requires explicit synchronization (semaphore/mutex) to avoid races." },
            { vi: "<b>Message Queue</b>: hàng đợi có cấu trúc trong kernel, tiến trình gửi/nhận message. An toàn hơn shared memory; tốt cho giao tiếp không đồng bộ.", en: "<b>Message Queue</b>: a structured kernel-managed queue; processes send/receive messages. Safer than shared memory; good for asynchronous communication." },
            { vi: "<b>Socket</b>: IPC qua mạng (TCP/UDP) hoặc Unix domain socket (cùng máy). Nền tảng của mọi ứng dụng client-server.", en: "<b>Socket</b>: IPC over network (TCP/UDP) or Unix domain socket (same machine). The foundation of all client-server applications." },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Thứ tự hiệu năng IPC (nhanh → chậm): Shared Memory &gt; Pipe &gt; Message Queue &gt; Socket (network). Shared memory nhanh nhất nhưng khó nhất để đồng bộ đúng.",
          en: "IPC performance order (fastest → slowest): Shared Memory &gt; Pipe &gt; Message Queue &gt; Socket (network). Shared memory is fastest but hardest to synchronize correctly.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "\"Mỗi syscall là một lần trap vào kernel — không miễn phí (microseconds). Mmap/shared memory tránh chi phí copy kernel; socket phù hợp cross-machine.\"",
          en: "\"Every syscall is a trap into the kernel — not free (microseconds). Mmap/shared memory avoids kernel-copy overhead; sockets work cross-machine.\"",
        },
      ],
    },
    {
      id: "filesystem-io",
      title: { vi: "7. Hệ thống tập tin & I/O", en: "7. File Systems & I/O" },
      blocks: [
        {
          type: "prose",
          vi: "Hệ thống tập tin tổ chức dữ liệu trên disk thành file và thư mục. Cấu trúc trung tâm trên Unix là <b>inode</b> — lưu metadata (kích thước, quyền, timestamp, con trỏ tới data block) nhưng không lưu tên file (tên nằm trong directory entry).",
          en: "A file system organizes data on disk into files and directories. The central structure on Unix is the <b>inode</b> — it stores metadata (size, permissions, timestamps, pointers to data blocks) but NOT the file name (the name lives in the directory entry).",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Buffering & Caching</b>: OS cache dữ liệu file trong RAM (page cache). Đọc file lần đầu → disk; lần sau → cache → nhanh hơn hàng trăm lần. Ghi thường được buffer (write-back) — <code>fsync()</code> để đảm bảo flush xuống disk.", en: "<b>Buffering & Caching</b>: the OS caches file data in RAM (the page cache). First read → disk; subsequent reads → cache → hundreds of times faster. Writes are usually buffered (write-back) — call <code>fsync()</code> to guarantee flush to disk." },
            { vi: "<b>Blocking I/O</b>: call <code>read()</code>/<code>write()</code> block luồng cho đến khi I/O xong. Đơn giản nhưng lãng phí thread khi chờ network/disk.", en: "<b>Blocking I/O</b>: calling <code>read()</code>/<code>write()</code> blocks the thread until I/O completes. Simple but wastes a thread while waiting for network/disk." },
            { vi: "<b>Non-blocking I/O</b>: call trả về ngay; ứng dụng kiểm tra sau (<code>select</code>/<code>poll</code>/<code>epoll</code> — multiplexing). Nền tảng của event loop (Node.js, nginx) — một thread xử lý hàng nghìn connection.", en: "<b>Non-blocking I/O</b>: call returns immediately; app checks for readiness later (<code>select</code>/<code>poll</code>/<code>epoll</code> — I/O multiplexing). Foundation of event loops (Node.js, nginx) — one thread handles thousands of connections." },
            { vi: "<b>Async I/O (AIO)</b>: kernel thực hiện I/O ở background, thông báo hoàn thành qua callback/signal. Khác non-blocking ở chỗ app không cần polling.", en: "<b>Async I/O (AIO)</b>: kernel performs I/O in the background and notifies completion via callback/signal. Differs from non-blocking in that the app does not poll." },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Khi thiết kế hệ thống: nếu I/O-bound và nhiều connection đồng thời → dùng non-blocking/async I/O với event loop. Nếu CPU-bound → dùng thread/process pool.",
          en: "For system design: if I/O-bound with many concurrent connections → use non-blocking/async I/O with an event loop. If CPU-bound → use a thread/process pool.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "\"Inode = passport của file (metadata). Non-blocking I/O + epoll = cách nginx xử lý 10K connections trên một thread. Blocking I/O = one thread per connection — không scale.\"",
          en: "\"Inode = file passport (metadata). Non-blocking I/O + epoll = how nginx handles 10K connections on one thread. Blocking I/O = one thread per connection — doesn't scale.\"",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "Tiến trình và luồng khác nhau thế nào về không gian địa chỉ?", en: "How do processes and threads differ in address space?" },
      back: { vi: "Tiến trình có <b>không gian địa chỉ riêng</b> (cô lập). Các luồng trong cùng tiến trình <b>chia sẻ heap và file descriptor</b> nhưng mỗi luồng có stack và register riêng.", en: "Processes have <b>separate address spaces</b> (isolated). Threads in the same process <b>share the heap and file descriptors</b> but each has its own stack and registers." },
    },
    {
      front: { vi: "Context switch là gì? Tại sao context switch của luồng rẻ hơn tiến trình?", en: "What is a context switch? Why is a thread context switch cheaper than a process one?" },
      back: { vi: "Context switch = OS lưu trạng thái hiện tại (register, PC, SP) rồi nạp trạng thái khác. Luồng rẻ hơn vì <b>không cần đổi page table</b> — cùng không gian địa chỉ.", en: "Context switch = OS saves current state (registers, PC, SP) and loads another. Threads are cheaper because <b>no page table swap</b> is needed — same address space." },
    },
    {
      front: { vi: "Round Robin khác FCFS thế nào?", en: "How does Round Robin differ from FCFS?" },
      back: { vi: "FCFS chạy đến khi xong (non-preemptive). Round Robin cho mỗi job <b>một quantum</b> rồi cướp CPU và xoay vòng — <b>preemptive</b>, đảm bảo công bằng và thời gian phản hồi tốt.", en: "FCFS runs to completion (non-preemptive). Round Robin gives each job <b>one time quantum</b> then preempts and rotates — <b>preemptive</b>, ensuring fairness and good response time." },
    },
    {
      front: { vi: "TLB là gì và tại sao nó quan trọng?", en: "What is the TLB and why does it matter?" },
      back: { vi: "TLB (Translation Lookaside Buffer) là <b>cache phần cứng</b> của page table entries. Hit → dịch địa chỉ ảo→vật lý trong ~1 cycle. Không có TLB, mỗi truy cập bộ nhớ tốn ~100 cycles để tra page table.", en: "TLB is a <b>hardware cache</b> of page-table entries. Hit → virtual-to-physical translation in ~1 cycle. Without TLB, every memory access costs ~100 cycles to walk the page table." },
    },
    {
      front: { vi: "Page fault là gì? Minor vs major fault?", en: "What is a page fault? Minor vs major?" },
      back: { vi: "Page fault xảy ra khi truy cập page không có trong RAM. <b>Minor</b>: page chỉ chưa map (nhanh, không cần I/O). <b>Major</b>: phải load từ disk (tốn hàng ms — đắt).", en: "A page fault occurs when accessing a page not in RAM. <b>Minor</b>: page just not yet mapped (fast, no I/O). <b>Major</b>: must load from disk (costs milliseconds — expensive)." },
    },
    {
      front: { vi: "Race condition là gì? Dùng gì để ngăn?", en: "What is a race condition? How to prevent it?" },
      back: { vi: "Race condition: kết quả phụ thuộc vào thứ tự lên lịch luồng khi truy cập dữ liệu dùng chung mà không đồng bộ. Ngăn bằng <b>mutex</b>, <b>semaphore</b>, hoặc <b>atomic operations</b>.", en: "Race condition: result depends on thread scheduling order when shared data is accessed without sync. Prevent with a <b>mutex</b>, <b>semaphore</b>, or <b>atomic operations</b>." },
    },
    {
      front: { vi: "Mutex vs Binary Semaphore: điểm khác nhau quan trọng nhất?", en: "Mutex vs Binary Semaphore: the key difference?" },
      back: { vi: "Mutex có <b>chủ sở hữu</b> — chỉ luồng đã lock mới có thể unlock. Semaphore không có chủ — bất kỳ luồng nào cũng có thể signal. Mutex an toàn hơn để bảo vệ critical section.", en: "A mutex has an <b>owner</b> — only the locking thread can unlock it. A semaphore has no owner — any thread can signal. Use mutex for owning a critical section." },
    },
    {
      front: { vi: "4 điều kiện Coffman của deadlock?", en: "The 4 Coffman conditions for deadlock?" },
      back: { vi: "(1) <b>Mutual Exclusion</b>, (2) <b>Hold and Wait</b>, (3) <b>No Preemption</b>, (4) <b>Circular Wait</b>. Cả 4 phải đồng thời xảy ra. Phá bất kỳ một cái là thoát deadlock.", en: "(1) <b>Mutual Exclusion</b>, (2) <b>Hold and Wait</b>, (3) <b>No Preemption</b>, (4) <b>Circular Wait</b>. All four must hold simultaneously. Breaking any one prevents deadlock." },
    },
    {
      front: { vi: "Livelock khác deadlock thế nào?", en: "How does livelock differ from deadlock?" },
      back: { vi: "Deadlock: luồng <b>không hoạt động</b>, mỗi cái chờ cái kia. Livelock: luồng <b>đang chạy</b> nhưng liên tục thay đổi trạng thái để nhường nhau — không tiến được, không bị block.", en: "Deadlock: threads are <b>inactive</b>, each waiting on another. Livelock: threads are <b>active</b> but keep yielding to each other — no progress, but not blocked." },
    },
    {
      front: { vi: "Phương thức IPC nào nhanh nhất và tại sao?", en: "Which IPC method is fastest and why?" },
      back: { vi: "<b>Shared Memory</b> — nhanh nhất vì dữ liệu không qua kernel (không copy). Tiến trình truy cập trực tiếp vùng RAM dùng chung. Cần tự đồng bộ.", en: "<b>Shared Memory</b> — fastest because data bypasses the kernel (no copy). Processes access the shared RAM region directly. Must synchronize explicitly." },
    },
    {
      front: { vi: "Non-blocking I/O khác blocking I/O thế nào? Dùng khi nào?", en: "How does non-blocking I/O differ from blocking? When to use it?" },
      back: { vi: "Blocking: call chặn luồng cho đến khi xong. Non-blocking: call trả về ngay, app dùng <code>epoll</code>/<code>select</code> để biết khi nào sẵn. Dùng non-blocking khi cần xử lý nhiều connection đồng thời trên ít thread (event loop).", en: "Blocking: call suspends the thread until done. Non-blocking: call returns immediately; app uses <code>epoll</code>/<code>select</code> to know when ready. Use non-blocking for many concurrent connections on few threads (event loop)." },
    },
    {
      front: { vi: "Inode là gì? Có chứa tên file không?", en: "What is an inode? Does it hold the file name?" },
      back: { vi: "Inode lưu <b>metadata của file</b> (kích thước, quyền, timestamp, con trỏ data block). <b>Không</b> chứa tên file — tên nằm trong directory entry. Hard link = nhiều tên trỏ về cùng một inode.", en: "Inode stores <b>file metadata</b> (size, permissions, timestamps, data block pointers). <b>Does not</b> hold the file name — that lives in the directory entry. A hard link = multiple names pointing to the same inode." },
    },
  ],
  quiz: [
    {
      q: { vi: "Điểm khác biệt chính giữa tiến trình và luồng là gì?", en: "What is the main difference between a process and a thread?" },
      options: [
        { vi: "Luồng có stack riêng; tiến trình thì không", en: "Threads have a private stack; processes do not" },
        { vi: "Tiến trình có không gian địa chỉ riêng; nhiều luồng chia sẻ không gian địa chỉ của tiến trình cha", en: "Processes have private address spaces; threads within a process share the parent's address space" },
        { vi: "Tiến trình chỉ có thể chạy một luồng", en: "A process can only run one thread" },
        { vi: "Luồng không thể chia sẻ dữ liệu với nhau", en: "Threads cannot share data with each other" },
      ],
      answer: 1,
      explain: { vi: "Mỗi tiến trình có không gian địa chỉ cô lập. Các luồng trong cùng tiến trình chia sẻ heap/FD nhưng có stack riêng.", en: "Each process has an isolated address space. Threads in the same process share the heap/FDs but each has its own stack." },
    },
    {
      q: { vi: "Tại sao context switch của luồng rẻ hơn của tiến trình?", en: "Why is a thread context switch cheaper than a process context switch?" },
      options: [
        { vi: "Luồng không có register nên không cần lưu trạng thái", en: "Threads have no registers so no state needs saving" },
        { vi: "Luồng context switch không cần đổi page table", en: "Thread context switches do not require a page table swap" },
        { vi: "Luồng luôn chạy trong kernel mode", en: "Threads always run in kernel mode" },
        { vi: "Luồng không cần lưu program counter", en: "Threads do not need to save the program counter" },
      ],
      answer: 1,
      explain: { vi: "Luồng trong cùng tiến trình dùng chung page table → không cần swap TLB/page table, giảm chi phí đáng kể.", en: "Threads share the same page table → no TLB flush or page table swap, which is the dominant cost in a process switch." },
    },
    {
      q: { vi: "Thuật toán lập lịch nào đảm bảo thời gian chờ trung bình nhỏ nhất?", en: "Which scheduling algorithm minimizes average waiting time?" },
      options: [
        { vi: "FCFS", en: "FCFS" },
        { vi: "Round Robin với quantum nhỏ", en: "Round Robin with small quantum" },
        { vi: "SJF (Shortest Job First)", en: "SJF (Shortest Job First)" },
        { vi: "Priority Scheduling", en: "Priority Scheduling" },
      ],
      answer: 2,
      explain: { vi: "SJF tối thiểu thời gian chờ trung bình về mặt toán học. Nhược điểm: cần biết burst time trước và có thể gây starvation cho job dài.", en: "SJF provably minimizes average waiting time. Downside: requires knowing burst times upfront and can starve long jobs." },
    },
    {
      q: { vi: "TLB miss xảy ra điều gì?", en: "What happens on a TLB miss?" },
      options: [
        { vi: "Chương trình bị crash ngay lập tức", en: "The program crashes immediately" },
        { vi: "OS phải tra page table trong RAM để lấy địa chỉ vật lý", en: "The OS must walk the page table in RAM to get the physical address" },
        { vi: "Trang bị load từ disk", en: "The page is loaded from disk" },
        { vi: "Tiến trình bị đình chỉ vĩnh viễn", en: "The process is suspended permanently" },
      ],
      answer: 1,
      explain: { vi: "TLB miss → phải tra page table trong RAM (hardware page table walk hoặc OS trap) — đắt hơn hit vài chục lần. Page fault chỉ xảy ra nếu trang không có trong RAM.", en: "TLB miss → must walk the page table in RAM (hardware walk or OS trap) — tens of times more expensive than a hit. A page fault only occurs if the page is not in RAM at all." },
    },
    {
      q: { vi: "Race condition xảy ra khi nào?", en: "When does a race condition occur?" },
      options: [
        { vi: "Khi một tiến trình dùng quá nhiều CPU", en: "When a process uses too much CPU" },
        { vi: "Khi nhiều luồng truy cập dữ liệu dùng chung mà không có đồng bộ", en: "When multiple threads access shared data without synchronization" },
        { vi: "Khi hệ thống hết RAM", en: "When the system runs out of RAM" },
        { vi: "Khi một thread đọc file và thread khác ghi file khác nhau", en: "When one thread reads a file while another writes a different file" },
      ],
      answer: 1,
      explain: { vi: "Race condition = kết quả phụ thuộc vào thứ tự lên lịch khi truy cập shared state mà không có đồng bộ hóa.", en: "Race condition = result depends on scheduling order when shared state is accessed without synchronization." },
    },
    {
      q: { vi: "Điều kiện nào trong 4 điều kiện Coffman dễ phá nhất trong thực tế để ngăn deadlock?", en: "Which Coffman condition is most practical to break to prevent deadlock?" },
      options: [
        { vi: "Mutual Exclusion", en: "Mutual Exclusion" },
        { vi: "Hold and Wait", en: "Hold and Wait" },
        { vi: "No Preemption", en: "No Preemption" },
        { vi: "Circular Wait", en: "Circular Wait" },
      ],
      answer: 3,
      explain: { vi: "Đặt <b>thứ tự toàn cục</b> cho tất cả lock và yêu cầu mọi luồng lock theo thứ tự đó là cách phổ biến nhất để phá Circular Wait. Mutex không thể phá Mutual Exclusion; Hold-and-Wait khó hơn vì cần request tất cả tài nguyên cùng lúc.", en: "Imposing a <b>global lock ordering</b> and requiring all threads to acquire locks in that order is the most common way to break Circular Wait. You can't easily break Mutual Exclusion (mutex semantics); Hold-and-Wait is harder (requires requesting all resources at once)." },
    },
    {
      q: { vi: "Phân biệt livelock và starvation?", en: "Distinguish livelock from starvation?" },
      options: [
        { vi: "Livelock = tất cả dừng lại; starvation = một số dừng lại", en: "Livelock = all stop; starvation = some stop" },
        { vi: "Livelock = đang chạy nhưng không tiến; starvation = luôn bị bỏ qua", en: "Livelock = running but no progress; starvation = perpetually bypassed" },
        { vi: "Livelock chỉ xảy ra với tiến trình; starvation với luồng", en: "Livelock only occurs with processes; starvation with threads" },
        { vi: "Chúng là một khái niệm", en: "They are the same concept" },
      ],
      answer: 1,
      explain: { vi: "Livelock: các tiến trình đang active nhưng liên tục nhường nhau → không tiến được. Starvation: một tiến trình không bao giờ được cấp tài nguyên vì luôn có kẻ ưu tiên cao hơn.", en: "Livelock: processes are active but keep yielding to each other → no progress. Starvation: a process never gets the resource because higher-priority ones always preempt it." },
    },
    {
      q: { vi: "Hệ thống I/O nào phù hợp nhất để xây dựng web server xử lý hàng nghìn connection đồng thời?", en: "Which I/O model is best for a web server handling thousands of concurrent connections?" },
      options: [
        { vi: "Blocking I/O với một thread mỗi connection", en: "Blocking I/O with one thread per connection" },
        { vi: "Non-blocking I/O với event loop (epoll/kqueue)", en: "Non-blocking I/O with an event loop (epoll/kqueue)" },
        { vi: "Synchronous file I/O", en: "Synchronous file I/O" },
        { vi: "Polling vòng lặp bận rộn (busy-wait loop)", en: "Busy-wait polling loop" },
      ],
      answer: 1,
      explain: { vi: "Non-blocking I/O + event loop (như Node.js/nginx) cho phép <b>một thread</b> quản lý hàng nghìn connection. One-thread-per-connection không scale vì mỗi thread tốn ~1MB stack + overhead context switch.", en: "Non-blocking I/O + event loop (like Node.js/nginx) lets <b>one thread</b> manage thousands of connections. One-thread-per-connection doesn't scale — each thread consumes ~1 MB stack plus context-switch overhead." },
    },
    {
      q: { vi: "Inode trong Unix filesystem lưu gì?", en: "What does a Unix inode store?" },
      options: [
        { vi: "Tên file và nội dung file", en: "File name and file content" },
        { vi: "Metadata (kích thước, quyền, timestamp, con trỏ data block) nhưng không phải tên file", en: "Metadata (size, permissions, timestamps, data block pointers) but not the file name" },
        { vi: "Chỉ lưu nội dung file", en: "Only the file content" },
        { vi: "Tên file, nội dung, và quyền truy cập", en: "File name, content, and access permissions" },
      ],
      answer: 1,
      explain: { vi: "Inode = metadata (kích thước, quyền, timestamp, block pointers). Tên file nằm trong directory entry trỏ đến inode. Hard link = nhiều directory entry cùng trỏ về một inode.", en: "Inode = metadata (size, permissions, timestamps, block pointers). The file name lives in the directory entry that points to the inode. A hard link = multiple directory entries pointing to the same inode." },
    },
    {
      q: { vi: "Trong shared memory IPC, tại sao cần đồng bộ bổ sung?", en: "In shared-memory IPC, why is additional synchronization needed?" },
      options: [
        { vi: "Kernel tự động đồng bộ shared memory", en: "The kernel automatically synchronizes shared memory" },
        { vi: "Nhiều tiến trình có thể đọc/ghi cùng lúc gây race condition", en: "Multiple processes can read/write simultaneously, causing race conditions" },
        { vi: "Shared memory chỉ cho phép đọc", en: "Shared memory only allows reading" },
        { vi: "Shared memory không hiệu quả hơn pipe", en: "Shared memory is not more efficient than pipes" },
      ],
      answer: 1,
      explain: { vi: "Shared memory không có cơ chế đồng bộ tích hợp. Nhiều tiến trình đọc/ghi cùng vùng nhớ mà không đồng bộ dẫn đến race condition → cần mutex hoặc semaphore.", en: "Shared memory has no built-in synchronization. Multiple processes reading/writing the same region without sync leads to race conditions → must use a mutex or semaphore." },
    },
  ],
});
