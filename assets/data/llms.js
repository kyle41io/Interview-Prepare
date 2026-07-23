/* Large Language Models (LLMs) — training pipeline, sampling, RAG, eval, safety */
PREP.register({
  id: "llms",
  tier: "pro",
  icon: "🤖",
  category: "ai",
  title: { vi: "Large Language Models (LLMs)", en: "Large Language Models (LLMs)" },
  blurb: {
    vi: "Từ next-token prediction đến RLHF, context window, RAG và an toàn — những gì cần biết để nói chuyện tự tin về LLM trong phỏng vấn.",
    en: "From next-token prediction to RLHF, context windows, RAG, and safety — what you need to know to speak confidently about LLMs in interviews.",
  },
  sections: [
    {
      id: "what-is-llm",
      title: { vi: "1. LLM là gì, next-token prediction, scaling", en: "1. What is an LLM, next-token prediction, scaling" },
      blocks: [
        {
          type: "prose",
          vi: "<b>LLM (Large Language Model)</b> là một mạng Transformer khổng lồ (hàng tỷ đến hàng nghìn tỷ tham số) được huấn luyện để làm một việc duy nhất: <b>dự đoán token tiếp theo</b> (next-token prediction) dựa trên các token đứng trước. Từ khả năng tưởng như đơn giản này, khi mô hình đủ lớn và dữ liệu đủ nhiều, xuất hiện các năng lực phức tạp như suy luận, viết code, dịch thuật.",
          en: "An <b>LLM (Large Language Model)</b> is a massive Transformer network (billions to trillions of parameters) trained for one single job: <b>predict the next token</b> based on the tokens that came before. From this seemingly simple ability, once the model and data are large enough, complex capabilities emerge — reasoning, writing code, translation.",
        },
        {
          type: "prose",
          vi: "<b>Scaling laws</b>: hiệu năng của LLM cải thiện một cách <b>có thể dự đoán được</b> theo hàm mũ nghịch (power law) khi tăng 3 yếu tố cùng lúc: <b>số tham số</b> mô hình, <b>lượng dữ liệu</b> huấn luyện, và <b>compute</b> (FLOPs). Đây là lý do các công ty đổ hàng trăm triệu USD để train mô hình ngày càng lớn hơn.",
          en: "<b>Scaling laws</b>: LLM performance improves <b>predictably</b> as a power law when scaling up three factors together: model <b>parameter count</b>, <b>training data</b> volume, and <b>compute</b> (FLOPs). This is why companies pour hundreds of millions of dollars into training ever-larger models.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Emergent abilities</b>: một số năng lực (few-shot reasoning, chain-of-thought) chỉ xuất hiện rõ rệt khi mô hình vượt một ngưỡng kích thước nhất định — không tăng dần đều mà như \"nhảy bậc\".", en: "<b>Emergent abilities</b>: some capabilities (few-shot reasoning, chain-of-thought) only appear clearly once a model crosses a certain size threshold — not a smooth ramp but more of a \"step jump\"." },
            { vi: "<b>Chinchilla scaling</b>: với một ngân sách compute cố định, có một tỷ lệ tối ưu giữa số tham số và số token dữ liệu — train mô hình quá lớn với quá ít data (như GPT-3 ban đầu) là lãng phí compute.", en: "<b>Chinchilla scaling</b>: for a fixed compute budget, there's an optimal ratio between parameter count and training tokens — training an oversized model on too little data (as early GPT-3 did) wastes compute." },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Trực giác cốt lõi: LLM không \"hiểu\" theo nghĩa con người — nó là một hàm xác suất khổng lồ <code>P(token_tiếp_theo | các_token_trước_đó)</code>, nhưng khi hàm này được học từ đủ dữ liệu nhân loại, nó mô phỏng được rất nhiều dạng suy luận.",
          en: "Core intuition: an LLM doesn't \"understand\" in the human sense — it's a giant probability function <code>P(next_token | previous_tokens)</code>, but when learned from enough human data, this function ends up simulating many forms of reasoning.",
        },
      ],
    },
    {
      id: "training-pipeline",
      title: { vi: "2. Pipeline huấn luyện: pretraining → SFT → RLHF/alignment", en: "2. Training pipeline: pretraining → SFT → RLHF/alignment" },
      blocks: [
        {
          type: "prose",
          vi: "Một LLM hiện đại (như ChatGPT) không được train trong một bước, mà qua nhiều giai đoạn nối tiếp, mỗi giai đoạn tinh chỉnh hành vi mô hình theo một mục tiêu khác nhau.",
          en: "A modern LLM (like ChatGPT) isn't trained in one step, but through several sequential stages, each refining the model's behavior toward a different goal.",
        },
        {
          type: "table",
          headers: { vi: ["Giai đoạn", "Mục tiêu", "Dữ liệu"], en: ["Stage", "Goal", "Data"] },
          rows: [
            { vi: ["1. Pretraining", "Học ngôn ngữ, kiến thức thế giới qua next-token prediction", "Terabyte text từ internet, sách, code (không gán nhãn)"], en: ["1. Pretraining", "Learn language and world knowledge via next-token prediction", "Terabytes of internet text, books, code (unlabeled)"] },
            { vi: ["2. SFT (Supervised Fine-Tuning)", "Dạy mô hình <b>làm theo chỉ dẫn</b> (instruction-following), trả lời đúng định dạng hội thoại", "Cặp (câu hỏi, câu trả lời mẫu) do con người viết/chọn lọc"], en: ["2. SFT (Supervised Fine-Tuning)", "Teach the model to <b>follow instructions</b> and reply in a conversational format", "(question, ideal answer) pairs written/curated by humans"] },
            { vi: ["3. RLHF/Alignment", "Căn chỉnh output theo <b>sở thích con người</b> (hữu ích, an toàn, trung thực)", "Con người xếp hạng nhiều câu trả lời → train reward model → tối ưu policy bằng RL (hoặc DPO)"], en: ["3. RLHF/Alignment", "Align outputs with <b>human preferences</b> (helpful, harmless, honest)", "Humans rank multiple answers → train a reward model → optimize the policy via RL (or DPO)"] },
          ],
        },
        {
          type: "prose",
          vi: "<b>RLHF (Reinforcement Learning from Human Feedback)</b>: con người so sánh cặp câu trả lời (\"câu nào tốt hơn?\"), dữ liệu này train một <b>reward model</b> học cách chấm điểm chất lượng câu trả lời, sau đó dùng thuật toán RL (thường là PPO) để tinh chỉnh LLM sao cho tối đa hóa điểm số này. <b>DPO (Direct Preference Optimization)</b> là kỹ thuật mới hơn, đạt hiệu quả tương tự mà không cần train reward model riêng và ổn định hơn khi train.",
          en: "<b>RLHF (Reinforcement Learning from Human Feedback)</b>: humans compare pairs of responses (\"which is better?\"), this data trains a <b>reward model</b> that learns to score response quality, then an RL algorithm (usually PPO) fine-tunes the LLM to maximize that score. <b>DPO (Direct Preference Optimization)</b> is a newer technique achieving similar effects without training a separate reward model, and is more stable to train.",
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Nhớ nhanh: <b>Pretraining</b> dạy mô hình \"biết nói\", <b>SFT</b> dạy \"biết trả lời đúng format\", <b>RLHF</b> dạy \"trả lời theo cách con người thích\".",
          en: "Quick recall: <b>Pretraining</b> teaches the model \"how to speak\", <b>SFT</b> teaches it \"how to answer in the right format\", <b>RLHF</b> teaches it \"to answer the way humans prefer\".",
        },
      ],
    },
    {
      id: "context-tokens-cost",
      title: { vi: "3. Context window, token & chi phí", en: "3. Context window, tokens & cost" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Context window</b> là số token tối đa mà LLM có thể \"nhìn thấy\" cùng lúc (input + output) trong một lượt gọi — vượt quá giới hạn này, thông tin cũ nhất sẽ bị cắt bỏ. LLM tính phí và giới hạn theo <b>token</b>, không phải theo từ hay ký tự.",
          en: "The <b>context window</b> is the maximum number of tokens an LLM can \"see\" at once (input + output) in a single call — exceeding it truncates the oldest information. LLMs are priced and limited by <b>tokens</b>, not words or characters.",
        },
        {
          type: "table",
          headers: { vi: ["Đại lượng", "Ước lượng nhanh"], en: ["Quantity", "Rule of thumb"] },
          rows: [
            { vi: ["1 token (tiếng Anh)", "≈ 4 ký tự, hoặc ≈ 0.75 từ"], en: ["1 token (English)", "≈ 4 characters, or ≈ 0.75 words"] },
            { vi: ["1,000 token", "≈ 750 từ tiếng Anh (~1.5 trang A4)"], en: ["1,000 tokens", "≈ 750 English words (~1.5 A4 pages)"] },
            { vi: ["Context 128k token", "≈ 96,000 từ ≈ một cuốn tiểu thuyết ngắn"], en: ["128k token context", "≈ 96,000 words ≈ a short novel"] },
            { vi: ["Chi phí API", "Tính riêng theo input token và output token (output thường đắt hơn 2-4 lần)"], en: ["API cost", "Charged separately for input tokens and output tokens (output is typically 2-4x pricier)"] },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Context window lớn <b>không đồng nghĩa</b> mô hình dùng tốt mọi thông tin trong đó — hiện tượng <b>\"lost in the middle\"</b>: mô hình thường nhớ tốt thông tin ở <b>đầu</b> và <b>cuối</b> prompt hơn ở giữa.",
          en: "A large context window does <b>not</b> mean the model uses all of it equally well — the <b>\"lost in the middle\"</b> phenomenon: models tend to recall information at the <b>start</b> and <b>end</b> of a prompt better than in the middle.",
        },
      ],
    },
    {
      id: "sampling",
      title: { vi: "4. Sampling: temperature/top-p, vì sao output khác nhau", en: "4. Sampling: temperature/top-p, why output varies" },
      blocks: [
        {
          type: "prose",
          vi: "Ở mỗi bước, LLM sinh ra một <b>phân phối xác suất</b> trên toàn bộ từ vựng cho token tiếp theo. Thay vì luôn chọn token có xác suất cao nhất (greedy — deterministic nhưng nhàm chán, lặp lại), ta <b>lấy mẫu (sample)</b> từ phân phối đó — đây là lý do cùng một prompt có thể cho ra output khác nhau mỗi lần.",
          en: "At each step, the LLM outputs a <b>probability distribution</b> over the entire vocabulary for the next token. Instead of always picking the highest-probability token (greedy — deterministic but bland and repetitive), we <b>sample</b> from that distribution — which is why the same prompt can produce different outputs each time.",
        },
        {
          type: "table",
          headers: { vi: ["Tham số", "Ý nghĩa", "Giá trị thấp", "Giá trị cao"], en: ["Parameter", "Meaning", "Low value", "High value"] },
          rows: [
            { vi: ["Temperature", "\"Làm phẳng\" hay \"làm nhọn\" phân phối xác suất trước khi sample", "Gần 0: gần như greedy, ổn định, ít sáng tạo", "Cao (&gt;1): ngẫu nhiên hơn, sáng tạo hơn, dễ lạc đề/sai hơn"], en: ["Temperature", "Flattens or sharpens the probability distribution before sampling", "Near 0: nearly greedy, deterministic, less creative", "High (>1): more random, more creative, more prone to going off-track/wrong"] },
            { vi: ["Top-p (nucleus sampling)", "Chỉ sample trong tập token nhỏ nhất có tổng xác suất ≥ p", "p thấp (0.1): chỉ chọn trong vài token khả năng cao nhất", "p cao (0.95): cho phép tập token đa dạng hơn tham gia sample"], en: ["Top-p (nucleus sampling)", "Sample only from the smallest set of tokens whose cumulative probability ≥ p", "Low p (0.1): only pick among a few most-likely tokens", "High p (0.95): allows a wider, more diverse set of tokens"] },
            { vi: ["Top-k", "Chỉ giữ lại k token có xác suất cao nhất trước khi sample", "k nhỏ: giới hạn chặt lựa chọn", "k lớn: gần như không giới hạn"], en: ["Top-k", "Keep only the k highest-probability tokens before sampling", "Small k: tightly restricts choices", "Large k: almost unrestricted"] },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Quy tắc thực dụng: task cần <b>chính xác/nhất quán</b> (code, trích xuất dữ liệu, toán) → temperature thấp (0-0.3). Task cần <b>sáng tạo</b> (viết văn, brainstorm) → temperature cao hơn (0.7-1.0).",
          en: "Practical rule: tasks needing <b>precision/consistency</b> (code, data extraction, math) → low temperature (0-0.3). Tasks needing <b>creativity</b> (writing, brainstorming) → higher temperature (0.7-1.0).",
        },
      ],
    },
    {
      id: "hallucination",
      title: { vi: "5. Hallucination: nguyên nhân + giảm thiểu", en: "5. Hallucination: causes + mitigation" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Hallucination</b> là khi LLM sinh ra thông tin nghe có vẻ tự tin, trôi chảy nhưng <b>sai sự thật</b> hoặc bịa đặt (vd. trích dẫn nguồn không tồn tại). Nguyên nhân gốc rễ: LLM được train để sinh ra chuỗi token <b>hợp lý về mặt ngôn ngữ</b>, không phải để tra cứu sự thật — nó không có cơ chế nội tại để biết \"tôi không chắc\".",
          en: "<b>Hallucination</b> is when an LLM generates information that sounds confident and fluent but is <b>factually wrong</b> or fabricated (e.g. citing sources that don't exist). Root cause: LLMs are trained to produce <b>linguistically plausible</b> token sequences, not to look up facts — they have no built-in mechanism to know \"I'm not sure\".",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Nguyên nhân</b>: kiến thức bị \"đóng băng\" tại thời điểm cắt dữ liệu train (knowledge cutoff); dữ liệu train có thể chứa thông tin sai; mô hình bị ép phải sinh câu trả lời dù không đủ thông tin (do training thưởng cho sự tự tin/trôi chảy).", en: "<b>Causes</b>: knowledge is frozen at the training data cutoff; training data may contain incorrect information; the model is pushed to produce an answer even without enough information (because training rewards confident, fluent output)." },
            { vi: "<b>Grounding</b>: cung cấp ngữ cảnh thực tế (tài liệu, kết quả tìm kiếm) trong prompt để mô hình dựa vào đó trả lời, thay vì chỉ dựa vào kiến thức nội tại đã \"quên\"/sai.", en: "<b>Grounding</b>: supply real, up-to-date context (documents, search results) in the prompt so the model bases its answer on that, instead of relying solely on internal knowledge that may be outdated/wrong." },
            { vi: "<b>Citations</b>: yêu cầu mô hình trích dẫn nguồn cụ thể cho mỗi khẳng định, giúp con người kiểm chứng và giảm khả năng bịa đặt trơn tru không kiểm tra được.", en: "<b>Citations</b>: require the model to cite specific sources for each claim, helping humans verify and reducing smooth, unverifiable fabrication." },
            { vi: "Kỹ thuật khác: <b>RAG</b> (xem mục 6), giảm temperature, yêu cầu mô hình nói \"tôi không biết\" khi thiếu thông tin, và <b>fact-checking</b> hậu kiểm bằng một mô hình/hệ thống thứ hai.", en: "Other techniques: <b>RAG</b> (see section 6), lowering temperature, instructing the model to say \"I don't know\" when uncertain, and post-hoc <b>fact-checking</b> via a second model/system." },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Hallucination <b>không thể loại bỏ hoàn toàn</b> với kiến trúc LLM hiện tại — chỉ có thể giảm thiểu. Luôn cần con người review với các use case rủi ro cao (y tế, pháp lý, tài chính).",
          en: "Hallucination <b>cannot be fully eliminated</b> with current LLM architectures — only mitigated. Human review is always needed for high-stakes use cases (medical, legal, financial).",
        },
      ],
    },
    {
      id: "prompt-finetune-rag",
      title: { vi: "6. Prompt vs Fine-tune vs RAG — bảng quyết định", en: "6. Prompt vs Fine-tune vs RAG — decision table" },
      blocks: [
        {
          type: "prose",
          vi: "Ba cách chính để tùy biến hành vi LLM cho bài toán cụ thể, mỗi cách phù hợp với một nhu cầu khác nhau — và <b>không loại trừ lẫn nhau</b>, thường kết hợp cả ba.",
          en: "Three main ways to customize LLM behavior for a specific task, each suited to different needs — and <b>not mutually exclusive</b>, often combined together.",
        },
        {
          type: "table",
          headers: { vi: ["Kỹ thuật", "Dùng khi", "Ưu điểm", "Nhược điểm"], en: ["Technique", "Use when", "Pros", "Cons"] },
          rows: [
            { vi: ["Prompt engineering", "Cần thay đổi hành vi nhanh, không có nhiều dữ liệu", "Không cần train, rẻ, triển khai tức thì", "Giới hạn bởi context window, kém ổn định hơn"], en: ["Prompt engineering", "Need to change behavior quickly, little data available", "No training needed, cheap, instant deployment", "Limited by context window, less consistent"] },
            { vi: ["RAG (Retrieval-Augmented Generation)", "Cần kiến thức <b>cập nhật/riêng tư</b> mà mô hình chưa biết", "Giảm hallucination, dữ liệu dễ cập nhật (không cần train lại), có thể trích dẫn nguồn", "Cần hạ tầng retrieval (vector DB), độ trễ tăng, chất lượng phụ thuộc retrieval"], en: ["RAG (Retrieval-Augmented Generation)", "Need <b>up-to-date/private</b> knowledge the model doesn't have", "Reduces hallucination, data is easy to update (no retraining), can cite sources", "Needs retrieval infra (vector DB), added latency, quality depends on retrieval"] },
            { vi: ["Fine-tuning", "Cần thay đổi <b>hành vi/phong cách/format</b> sâu, ổn định, lặp lại nhiều lần", "Nhất quán cao, không tốn token prompt dài mỗi lần gọi", "Tốn chi phí train, cần dữ liệu chất lượng, khó cập nhật kiến thức mới (phải train lại)"], en: ["Fine-tuning", "Need deep, stable, repeatable changes to <b>behavior/style/format</b>", "Highly consistent, no need for a long prompt on every call", "Training cost, needs quality data, hard to update new knowledge (requires retraining)"] },
          ],
        },
        {
          type: "prose",
          vi: "<b>RAG</b> hoạt động bằng cách: (1) chia tài liệu thành đoạn nhỏ (chunk), (2) chuyển mỗi chunk thành vector embedding, lưu vào <b>vector database</b>; (3) khi có câu hỏi, tìm các chunk tương đồng nhất (semantic search); (4) chèn các chunk đó vào prompt làm ngữ cảnh cho LLM trả lời.",
          en: "<b>RAG</b> works as follows: (1) split documents into small chunks, (2) convert each chunk into an embedding vector, stored in a <b>vector database</b>; (3) when a query arrives, find the most similar chunks (semantic search); (4) inject those chunks into the prompt as context for the LLM to answer from.",
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Quy tắc chọn nhanh: kiến thức thay đổi thường xuyên/riêng tư → <b>RAG</b>. Cần đổi <b>giọng văn/format/hành vi</b> cố định → <b>fine-tune</b>. Chỉ cần chỉnh sửa nhanh, thử nghiệm → <b>prompt engineering</b>.",
          en: "Quick rule: knowledge that changes often/is private → <b>RAG</b>. Need to change fixed <b>tone/format/behavior</b> → <b>fine-tune</b>. Just need a quick tweak, experimentation → <b>prompt engineering</b>.",
        },
      ],
    },
    {
      id: "evaluation",
      title: { vi: "7. Đánh giá LLM: benchmark, LLM-as-judge, human eval", en: "7. Evaluating LLMs: benchmarks, LLM-as-judge, human eval" },
      blocks: [
        {
          type: "prose",
          vi: "Đánh giá LLM khó hơn ML cổ điển vì output là <b>văn bản tự do</b>, không có một đáp án đúng duy nhất để so khớp chính xác. Có nhiều lớp phương pháp đánh giá, thường kết hợp nhiều lớp.",
          en: "Evaluating LLMs is harder than classical ML because output is <b>free-form text</b>, with no single correct answer to match exactly. There are several layers of evaluation methods, usually combined.",
        },
        {
          type: "table",
          headers: { vi: ["Phương pháp", "Mô tả", "Hạn chế"], en: ["Method", "Description", "Limitation"] },
          rows: [
            { vi: ["Benchmark tự động", "Bộ câu hỏi chuẩn có đáp án cố định (MMLU, HumanEval, GSM8K...)", "Dễ bị \"học tủ\" (data contamination), không phản ánh use case thực tế"], en: ["Automated benchmarks", "Standard question sets with fixed answers (MMLU, HumanEval, GSM8K...)", "Prone to data contamination, doesn't reflect real-world use cases"] },
            { vi: ["LLM-as-judge", "Dùng một LLM mạnh khác để chấm điểm/so sánh output", "Nhanh, rẻ hơn human eval, nhưng có thể thiên vị (bias) chính mô hình cùng họ, chưa hoàn toàn tin cậy"], en: ["LLM-as-judge", "Use another strong LLM to score/compare outputs", "Faster, cheaper than human eval, but can be biased toward its own model family, not fully reliable"] },
            { vi: ["Human evaluation", "Con người trực tiếp chấm điểm/so sánh câu trả lời", "Chính xác nhất nhưng chậm, đắt, khó scale"], en: ["Human evaluation", "Humans directly score/compare answers", "Most accurate but slow, expensive, hard to scale"] },
            { vi: ["A/B testing / online eval", "Đo hành vi người dùng thật (click, retention) khi triển khai thực tế", "Cần thời gian, chỉ áp dụng được sau khi đã deploy"], en: ["A/B testing / online eval", "Measure real user behavior (clicks, retention) in production", "Takes time, only applicable after deployment"] },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "Xu hướng thực tế trong công nghiệp: dùng <b>LLM-as-judge</b> để đánh giá nhanh, quy mô lớn trong quá trình phát triển, kết hợp <b>human eval</b> định kỳ và <b>online metric</b> sau khi deploy để xác nhận cuối cùng.",
          en: "Common industry practice: use <b>LLM-as-judge</b> for fast, large-scale evaluation during development, combined with periodic <b>human eval</b> and <b>online metrics</b> post-deployment for final confirmation.",
        },
      ],
    },
    {
      id: "function-calling-agents",
      title: { vi: "8. Function calling / structured output / agents", en: "8. Function calling / structured output / agents" },
      blocks: [
        {
          type: "prose",
          vi: "LLM mặc định chỉ sinh ra <b>văn bản tự do</b>. Để tích hợp vào phần mềm thực tế, cần các cơ chế ép output có cấu trúc hoặc cho phép mô hình \"hành động\".",
          en: "By default, LLMs only generate <b>free-form text</b>. To integrate into real software, mechanisms are needed to constrain output structure or let the model \"take actions\".",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Structured output</b>: ép LLM trả về đúng định dạng (vd. JSON theo schema cho trước) — dùng constrained decoding hoặc yêu cầu rõ trong prompt, giúp code dễ parse kết quả một cách tin cậy.", en: "<b>Structured output</b>: force the LLM to return a specific format (e.g. JSON matching a given schema) — via constrained decoding or explicit prompt instructions, making results reliably parseable by code." },
            { vi: "<b>Function calling (tool use)</b>: mô hình được cung cấp danh sách \"công cụ\" (hàm) với mô tả + tham số; khi cần, mô hình sinh ra một lời gọi hàm có cấu trúc (tên hàm + tham số) thay vì trả lời trực tiếp — hệ thống bên ngoài thực thi hàm đó rồi trả kết quả lại cho mô hình.", en: "<b>Function calling (tool use)</b>: the model is given a list of \"tools\" (functions) with descriptions + parameters; when needed, it emits a structured function call (name + arguments) instead of answering directly — an external system executes it and returns the result to the model." },
            { vi: "<b>Agent</b>: một LLM chạy trong vòng lặp <b>quan sát → suy nghĩ → hành động</b> (ReAct pattern), tự quyết định gọi tool nào, đọc kết quả, rồi quyết định bước tiếp theo, lặp lại cho đến khi hoàn thành nhiệm vụ đa bước.", en: "<b>Agent</b>: an LLM running in an <b>observe → think → act</b> loop (the ReAct pattern), autonomously deciding which tool to call, reading the result, then deciding the next step, repeating until a multi-step task is complete." },
          ],
        },
        {
          type: "code",
          code: "// Ví dụ khai báo tool cho function calling (dạng JSON schema)\n{\n  \"name\": \"get_weather\",\n  \"description\": \"Get current weather for a city\",\n  \"parameters\": {\n    \"type\": \"object\",\n    \"properties\": {\n      \"city\": { \"type\": \"string\" }\n    },\n    \"required\": [\"city\"]\n  }\n}\n// LLM có thể trả về: { \"tool\": \"get_weather\", \"arguments\": { \"city\": \"Hanoi\" } }\n// thay vì tự bịa ra thời tiết",
          caption: { vi: "Function calling: mô hình sinh lời gọi hàm có cấu trúc thay vì tự bịa câu trả lời.", en: "Function calling: the model emits a structured function call instead of fabricating an answer itself." },
        },
        {
          type: "callout",
          variant: "key",
          vi: "Agent = LLM + tool + vòng lặp quyết định. Sức mạnh thực sự đến từ việc kết hợp LLM (suy luận ngôn ngữ) với các hệ thống bên ngoài đáng tin cậy (database, API, calculator) — LLM không cần \"nhớ\" mọi thứ hay tự tính toán chính xác, nó chỉ cần biết <b>khi nào gọi công cụ nào</b>.",
          en: "Agent = LLM + tools + a decision loop. The real power comes from combining an LLM (language reasoning) with reliable external systems (databases, APIs, calculators) — the LLM doesn't need to \"remember\" everything or compute precisely itself, it just needs to know <b>when to call which tool</b>.",
        },
      ],
    },
    {
      id: "safety-limits",
      title: { vi: "9. An toàn & giới hạn: injection, jailbreak, data privacy", en: "9. Safety & limits: injection, jailbreak, data privacy" },
      blocks: [
        {
          type: "prose",
          vi: "Khi LLM được tích hợp vào sản phẩm thực tế (nhất là với quyền truy cập tool/dữ liệu), xuất hiện các rủi ro bảo mật đặc thù mà kỹ sư cần hiểu.",
          en: "When LLMs are integrated into real products (especially with tool/data access), specific security risks emerge that engineers must understand.",
        },
        {
          type: "table",
          headers: { vi: ["Rủi ro", "Mô tả", "Giảm thiểu"], en: ["Risk", "Description", "Mitigation"] },
          rows: [
            { vi: ["Prompt injection", "Nội dung độc hại chèn trong input/tài liệu (vd. \"bỏ qua hướng dẫn trước, làm X\") khiến mô hình chệch khỏi mục tiêu ban đầu", "Tách rõ system prompt/dữ liệu người dùng, sanitize input, giới hạn quyền hạn của tool"], en: ["Prompt injection", "Malicious content embedded in input/documents (e.g. \"ignore previous instructions, do X\") derails the model from its intended goal", "Clearly separate system prompt from user data, sanitize input, limit tool permissions"] },
            { vi: ["Jailbreak", "Kỹ thuật khiến mô hình vượt qua các rào chắn an toàn đã train (vd. đóng vai, roleplay để né filter)", "RLHF/alignment liên tục, filter đầu ra bổ sung, red-teaming định kỳ"], en: ["Jailbreak", "Techniques that trick the model into bypassing its trained safety guardrails (e.g. roleplay to dodge filters)", "Continuous RLHF/alignment, additional output filtering, periodic red-teaming"] },
            { vi: ["Data privacy/leakage", "Dữ liệu nhạy cảm trong prompt có thể bị mô hình \"nhớ\" và lộ ra ở câu trả lời khác, hoặc bị bên thứ 3 (nhà cung cấp API) lưu trữ", "Không gửi PII không cần thiết, dùng tùy chọn \"không train trên dữ liệu của tôi\", cân nhắc self-host với dữ liệu nhạy cảm"], en: ["Data privacy/leakage", "Sensitive data in a prompt may be \"memorized\" by the model and leak in other responses, or be stored by a third-party API provider", "Avoid sending unnecessary PII, use \"don't train on my data\" options, consider self-hosting for sensitive data"] },
          ],
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Nguyên tắc bảo mật quan trọng nhất: <b>không bao giờ tin tưởng hoàn toàn output của LLM</b> khi nó có quyền thực thi hành động thực (gửi email, xóa file, giao dịch) — luôn cần lớp xác thực/quyền hạn (permission) độc lập với chính LLM.",
          en: "The single most important security principle: <b>never fully trust LLM output</b> when it has permission to take real actions (send email, delete files, make transactions) — always enforce a permission/validation layer independent of the LLM itself.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Chốt phỏng vấn: <b>\"LLM là hàm dự đoán token tiếp theo được scale khổng lồ, không phải nguồn sự thật — RAG và grounding giảm hallucination, nhưng an toàn thật sự đến từ việc không bao giờ để LLM tự quyết hành động có hậu quả thật mà không qua permission layer riêng.\"</b>",
          en: "Interview soundbite: <b>\"An LLM is a next-token prediction function scaled up massively, not a source of truth — RAG and grounding reduce hallucination, but real safety comes from never letting the LLM autonomously trigger consequential actions without an independent permission layer.\"</b>",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "LLM về cơ bản làm gì ở mỗi bước sinh văn bản?", en: "What does an LLM fundamentally do at each text generation step?" },
      back: { vi: "Dự đoán phân phối xác suất cho token tiếp theo dựa trên các token trước đó (next-token prediction), rồi lấy mẫu hoặc chọn token từ phân phối đó.", en: "Predicts a probability distribution for the next token based on previous tokens (next-token prediction), then samples/selects a token from that distribution." },
    },
    {
      front: { vi: "Scaling law nói lên điều gì?", en: "What do scaling laws say?" },
      back: { vi: "Hiệu năng LLM cải thiện theo hàm mũ nghịch (power law) khi tăng đồng thời số tham số, lượng dữ liệu train và compute — có thể dự đoán được, không ngẫu nhiên.", en: "LLM performance improves as a power law when parameter count, training data, and compute are scaled up together — predictably, not randomly." },
    },
    {
      front: { vi: "Ba giai đoạn chính trong pipeline huấn luyện LLM hiện đại là gì?", en: "What are the three main stages in a modern LLM training pipeline?" },
      back: { vi: "Pretraining (học ngôn ngữ/kiến thức qua next-token prediction) → SFT (dạy làm theo chỉ dẫn) → RLHF/alignment (căn chỉnh theo sở thích con người).", en: "Pretraining (learn language/knowledge via next-token prediction) → SFT (teach instruction-following) → RLHF/alignment (align to human preferences)." },
    },
    {
      front: { vi: "RLHF hoạt động thế nào?", en: "How does RLHF work?" },
      back: { vi: "Con người xếp hạng các câu trả lời → train reward model chấm điểm chất lượng → dùng RL (PPO) hoặc DPO để tối ưu LLM tối đa hóa điểm số này.", en: "Humans rank responses → train a reward model to score quality → use RL (PPO) or DPO to optimize the LLM to maximize that score." },
    },
    {
      front: { vi: "1,000 token tiếng Anh ước lượng bằng bao nhiêu từ?", en: "About how many English words is 1,000 tokens?" },
      back: { vi: "Khoảng 750 từ (1 token ≈ 0.75 từ, hoặc ≈ 4 ký tự).", en: "About 750 words (1 token ≈ 0.75 words, or ≈ 4 characters)." },
    },
    {
      front: { vi: "Temperature ảnh hưởng thế nào đến output LLM?", en: "How does temperature affect LLM output?" },
      back: { vi: "Temperature thấp → gần greedy, ổn định, ít sáng tạo (tốt cho code/toán). Temperature cao → ngẫu nhiên hơn, sáng tạo hơn nhưng dễ sai/lạc đề hơn.", en: "Low temperature → nearly greedy, deterministic, less creative (good for code/math). High temperature → more random, more creative but more error-prone/off-track." },
    },
    {
      front: { vi: "Nguyên nhân gốc rễ của hallucination là gì?", en: "What is the root cause of hallucination?" },
      back: { vi: "LLM được train để sinh chuỗi token hợp lý về ngôn ngữ, không phải để tra cứu sự thật — nó không có cơ chế nội tại để biết \"tôi không chắc\".", en: "LLMs are trained to generate linguistically plausible token sequences, not to look up facts — they have no built-in mechanism to know \"I'm not sure\"." },
    },
    {
      front: { vi: "Khi nào nên chọn RAG thay vì fine-tune?", en: "When should you choose RAG over fine-tuning?" },
      back: { vi: "Khi cần kiến thức cập nhật/riêng tư thay đổi thường xuyên — RAG dễ cập nhật dữ liệu (không cần train lại) và giảm hallucination bằng cách trích dẫn nguồn.", en: "When you need frequently-changing, up-to-date/private knowledge — RAG makes data easy to update (no retraining) and reduces hallucination via citable sources." },
    },
    {
      front: { vi: "LLM-as-judge có hạn chế gì?", en: "What is a limitation of LLM-as-judge?" },
      back: { vi: "Nhanh và rẻ hơn human eval, nhưng có thể thiên vị các mô hình cùng họ/phong cách giống mình, chưa hoàn toàn đáng tin cậy như con người đánh giá.", en: "Faster and cheaper than human eval, but can be biased toward models of the same family/style, not fully as reliable as human judgment." },
    },
    {
      front: { vi: "Function calling giải quyết vấn đề gì?", en: "What problem does function calling solve?" },
      back: { vi: "Cho phép LLM sinh ra lời gọi hàm có cấu trúc (tên + tham số) để hệ thống bên ngoài thực thi, thay vì mô hình tự bịa kết quả hoặc chỉ trả lời bằng văn bản tự do.", en: "Lets the LLM emit a structured function call (name + arguments) for an external system to execute, instead of the model fabricating results or only replying in free text." },
    },
    {
      front: { vi: "Prompt injection là gì?", en: "What is prompt injection?" },
      back: { vi: "Nội dung độc hại chèn trong input/tài liệu (vd. \"bỏ qua hướng dẫn trước\") khiến LLM chệch khỏi mục tiêu ban đầu của hệ thống.", en: "Malicious content embedded in input/documents (e.g. \"ignore previous instructions\") that derails the LLM from the system's intended goal." },
    },
    {
      front: { vi: "Nguyên tắc bảo mật quan trọng nhất khi LLM có quyền hành động thực là gì?", en: "What is the most important security principle when an LLM can take real actions?" },
      back: { vi: "Không bao giờ tin tưởng hoàn toàn output LLM — luôn cần lớp xác thực/quyền hạn (permission) độc lập trước khi thực thi hành động có hậu quả thật.", en: "Never fully trust LLM output — always enforce an independent permission/validation layer before executing any consequential real action." },
    },
  ],
  quiz: [
    {
      q: { vi: "LLM về bản chất được huấn luyện để làm gì?", en: "What is an LLM fundamentally trained to do?" },
      options: [
        { vi: "Tra cứu sự thật từ một cơ sở dữ liệu nội bộ", en: "Look up facts from an internal database" },
        { vi: "Dự đoán token tiếp theo dựa trên các token trước đó", en: "Predict the next token based on previous tokens" },
        { vi: "Dịch trực tiếp giữa các ngôn ngữ lập trình", en: "Directly translate between programming languages" },
        { vi: "Tính toán số học chính xác", en: "Perform precise arithmetic" },
      ],
      answer: 1,
      explain: { vi: "LLM là một mô hình next-token prediction — sinh ra phân phối xác suất cho token kế tiếp dựa trên ngữ cảnh trước đó; các năng lực phức tạp hơn xuất hiện (emerge) từ việc học tốt nhiệm vụ này ở quy mô lớn.", en: "An LLM is a next-token prediction model — it produces a probability distribution for the next token given prior context; more complex abilities emerge from learning this task well at scale." },
    },
    {
      q: { vi: "SFT (Supervised Fine-Tuning) trong pipeline LLM có vai trò gì?", en: "What role does SFT (Supervised Fine-Tuning) play in the LLM pipeline?" },
      options: [
        { vi: "Dạy mô hình kiến thức thế giới từ đầu", en: "Teach the model world knowledge from scratch" },
        { vi: "Dạy mô hình làm theo chỉ dẫn và trả lời đúng định dạng hội thoại", en: "Teach the model to follow instructions and respond in a conversational format" },
        { vi: "Tăng kích thước context window", en: "Increase the context window size" },
        { vi: "Nén mô hình để chạy nhanh hơn", en: "Compress the model to run faster" },
      ],
      answer: 1,
      explain: { vi: "SFT dùng các cặp (câu hỏi, câu trả lời mẫu) để dạy mô hình đã pretrain biết cách làm theo chỉ dẫn, trả lời theo định dạng hội thoại thay vì chỉ tiếp tục văn bản.", en: "SFT uses (question, ideal answer) pairs to teach a pretrained model to follow instructions and answer conversationally, rather than just continuing text." },
    },
    {
      q: { vi: "RLHF sử dụng dữ liệu gì để train reward model?", en: "What data does RLHF use to train the reward model?" },
      options: [
        { vi: "Văn bản thô chưa gán nhãn từ internet", en: "Raw, unlabeled internet text" },
        { vi: "Con người xếp hạng/so sánh các cặp câu trả lời", en: "Human rankings/comparisons of pairs of responses" },
        { vi: "Kết quả benchmark tự động như MMLU", en: "Automated benchmark results like MMLU" },
        { vi: "Log lỗi từ hệ thống production", en: "Error logs from production systems" },
      ],
      answer: 1,
      explain: { vi: "Con người so sánh cặp câu trả lời (\"câu nào tốt hơn\"), dữ liệu này dùng để train reward model học chấm điểm chất lượng, sau đó tối ưu LLM bằng RL để tối đa hóa điểm số.", en: "Humans compare pairs of responses (\"which is better\"), and this data trains the reward model to score quality, after which RL optimizes the LLM to maximize that score." },
    },
    {
      q: { vi: "Hiện tượng \"lost in the middle\" mô tả điều gì?", en: "What does the \"lost in the middle\" phenomenon describe?" },
      options: [
        { vi: "Mô hình quên hoàn toàn mọi thứ sau khi vượt context window", en: "The model completely forgets everything past the context window" },
        { vi: "Mô hình nhớ tốt thông tin ở đầu/cuối prompt hơn ở giữa", en: "The model recalls information at the start/end of the prompt better than the middle" },
        { vi: "Mô hình luôn trả lời sai với câu hỏi dài", en: "The model always answers long questions incorrectly" },
        { vi: "Context window luôn bị cắt ở giữa câu", en: "The context window always truncates mid-sentence" },
      ],
      answer: 1,
      explain: { vi: "Dù context window lớn, mô hình có xu hướng sử dụng tốt hơn thông tin nằm ở đầu và cuối prompt so với thông tin nằm ở giữa — cần đặt thông tin quan trọng ở vị trí dễ \"nhìn thấy\".", en: "Even with a large context window, models tend to use information at the start and end of a prompt more effectively than information in the middle — important content should be placed where it's easily \"seen\"." },
    },
    {
      q: { vi: "Temperature thấp (gần 0) trong sampling cho kết quả gì?", en: "What does a low temperature (near 0) in sampling produce?" },
      options: [
        { vi: "Output ngẫu nhiên, sáng tạo cao", en: "Highly random, creative output" },
        { vi: "Output gần như deterministic, giống lựa chọn greedy", en: "Nearly deterministic output, similar to greedy selection" },
        { vi: "Output luôn dài hơn", en: "Always longer output" },
        { vi: "Mô hình từ chối trả lời", en: "The model refuses to answer" },
      ],
      answer: 1,
      explain: { vi: "Temperature gần 0 làm phân phối xác suất trở nên \"nhọn\" hơn, gần như luôn chọn token có xác suất cao nhất — cho output ổn định, lặp lại, phù hợp task cần chính xác.", en: "A temperature near 0 sharpens the probability distribution, almost always picking the highest-probability token — giving stable, repeatable output, suited to precision-requiring tasks." },
    },
    {
      q: { vi: "Grounding giúp giảm hallucination bằng cách nào?", en: "How does grounding help reduce hallucination?" },
      options: [
        { vi: "Tăng temperature để mô hình sáng tạo hơn", en: "Increasing temperature to make the model more creative" },
        { vi: "Cung cấp ngữ cảnh thực tế trong prompt để mô hình dựa vào thay vì chỉ dùng kiến thức nội tại", en: "Supplying real context in the prompt so the model relies on it instead of only internal knowledge" },
        { vi: "Xóa toàn bộ system prompt", en: "Removing the entire system prompt" },
        { vi: "Giảm số lượng tham số của mô hình", en: "Reducing the model's parameter count" },
      ],
      answer: 1,
      explain: { vi: "Grounding cung cấp tài liệu/dữ liệu thực tế, cập nhật trong ngữ cảnh (prompt) để mô hình trả lời dựa trên đó, giảm phụ thuộc vào kiến thức nội tại có thể lỗi thời hoặc sai.", en: "Grounding supplies real, up-to-date documents/data in the context (prompt) so the model answers based on that, reducing reliance on internal knowledge that may be outdated or wrong." },
    },
    {
      q: { vi: "RAG phù hợp nhất khi nào so với fine-tuning?", en: "When is RAG most suitable compared to fine-tuning?" },
      options: [
        { vi: "Khi cần thay đổi giọng văn/phong cách cố định của mô hình", en: "When you need to change the model's fixed tone/style" },
        { vi: "Khi cần kiến thức cập nhật/riêng tư thay đổi thường xuyên", en: "When you need frequently-changing, up-to-date/private knowledge" },
        { vi: "Khi không có bất kỳ dữ liệu nào", en: "When there is no data at all" },
        { vi: "Khi cần giảm độ trễ (latency) tối đa", en: "When you need to minimize latency at all costs" },
      ],
      answer: 1,
      explain: { vi: "RAG cho phép cập nhật kiến thức dễ dàng (chỉ cần cập nhật vector database) mà không cần train lại mô hình — lý tưởng cho dữ liệu thay đổi thường xuyên hoặc riêng tư.", en: "RAG allows easy knowledge updates (just update the vector database) without retraining the model — ideal for frequently-changing or private data." },
    },
    {
      q: { vi: "Rủi ro chính của LLM-as-judge là gì?", en: "What is a key risk of LLM-as-judge?" },
      options: [
        { vi: "Không thể chạy tự động", en: "It cannot run automatically" },
        { vi: "Có thể thiên vị các mô hình cùng họ/phong cách giống mình", en: "It can be biased toward models of the same family/similar style" },
        { vi: "Luôn chậm hơn human eval", en: "It is always slower than human eval" },
        { vi: "Không thể dùng để so sánh 2 output", en: "It cannot be used to compare two outputs" },
      ],
      answer: 1,
      explain: { vi: "LLM-as-judge nhanh và rẻ hơn human eval nhưng có thể thể hiện self-bias, ưu ái các câu trả lời có phong cách giống mô hình chấm điểm hoặc cùng họ mô hình.", en: "LLM-as-judge is faster and cheaper than human eval but can show self-bias, favoring responses with a style similar to the judging model or from the same model family." },
    },
    {
      q: { vi: "Function calling cho phép LLM làm gì?", en: "What does function calling allow an LLM to do?" },
      options: [
        { vi: "Tự viết lại trọng số của chính nó", en: "Rewrite its own weights" },
        { vi: "Sinh ra lời gọi hàm có cấu trúc (tên + tham số) để hệ thống ngoài thực thi", en: "Emit a structured function call (name + arguments) for an external system to execute" },
        { vi: "Chạy trực tiếp code Python trong quá trình inference", en: "Directly execute Python code during inference" },
        { vi: "Tăng context window tự động", en: "Automatically increase its context window" },
      ],
      answer: 1,
      explain: { vi: "Mô hình được cung cấp mô tả các \"tool\"; khi cần, nó sinh ra một lời gọi hàm có cấu trúc (JSON: tên hàm + tham số) — hệ thống bên ngoài thực thi rồi trả kết quả lại cho mô hình.", en: "The model is given descriptions of \"tools\"; when needed, it emits a structured function call (JSON: name + arguments) — an external system executes it and returns the result to the model." },
    },
    {
      q: { vi: "Nguyên tắc bảo mật nào quan trọng nhất khi LLM/agent có quyền thực thi hành động thực?", en: "What security principle matters most when an LLM/agent can execute real actions?" },
      options: [
        { vi: "Luôn dùng temperature = 0", en: "Always use temperature = 0" },
        { vi: "Không bao giờ tin tưởng hoàn toàn output LLM — cần lớp permission độc lập", en: "Never fully trust LLM output — enforce an independent permission layer" },
        { vi: "Chỉ dùng model có context window lớn nhất", en: "Only use the model with the largest context window" },
        { vi: "Tắt hoàn toàn logging để bảo mật", en: "Disable all logging entirely for security" },
      ],
      answer: 1,
      explain: { vi: "Vì LLM có thể bị prompt injection/jailbreak hoặc tự sai, hệ thống cần một lớp xác thực/quyền hạn độc lập với LLM trước khi cho phép thực thi hành động có hậu quả thật (xóa dữ liệu, giao dịch, gửi email).", en: "Because LLMs can be subject to prompt injection/jailbreak or simply make mistakes, systems need a permission/validation layer independent of the LLM before allowing consequential real actions (data deletion, transactions, sending emails)." },
    },
  ],
});
