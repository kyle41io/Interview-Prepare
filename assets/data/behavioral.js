/* Behavioral / soft-skills interview */
PREP.register({
  id: "behavioral",
  icon: "🗣️",
  category: "behavioral",
  title: { vi: "Phỏng vấn hành vi (Behavioral)", en: "Behavioral interview" },
  blurb: {
    vi: "Vòng kỹ thuật chứng minh bạn LÀM được; vòng behavioral chứng minh người ta MUỐN làm việc với bạn. Dùng khung STAR và chuẩn bị sẵn 5-6 câu chuyện.",
    en: "The technical round proves you CAN do the job; the behavioral round proves people WANT to work with you. Use the STAR framework and prepare 5–6 stories.",
  },
  sections: [
    {
      id: "star",
      title: { vi: "1. Khung STAR (xương sống mọi câu trả lời)", en: "1. The STAR framework (backbone of every answer)" },
      blocks: [
        { type: "list", items: [
          { vi: "<b>S — Situation:</b> bối cảnh ngắn gọn (1-2 câu). Dự án nào, vai trò gì.", en: "<b>S — Situation:</b> brief context (1–2 sentences). Which project, your role." },
          { vi: "<b>T — Task:</b> nhiệm vụ/thách thức cụ thể bạn phải giải quyết.", en: "<b>T — Task:</b> the specific challenge or goal you had to address." },
          { vi: "<b>A — Action:</b> <b>bạn</b> đã làm gì (dùng \"tôi\", không phải \"chúng tôi\"). Đây là phần dài nhất.", en: "<b>A — Action:</b> what <b>you</b> did (say \"I\", not \"we\"). This is the longest part." },
          { vi: "<b>R — Result:</b> kết quả, tốt nhất là <b>có số liệu</b> (giảm 40% thời gian, 0 downtime…). Thêm bài học rút ra.", en: "<b>R — Result:</b> the outcome, ideally <b>quantified</b> (cut time 40%, zero downtime…). Add what you learned." },
        ] },
        { type: "callout", variant: "tip", vi: "Dành ~70% thời gian cho <b>Action</b> + <b>Result</b>. Situation/Task chỉ là khung. Người phỏng vấn muốn nghe <b>bạn</b> đã quyết định & hành động gì.", en: "Spend ~70% on <b>Action</b> + <b>Result</b>. Situation/Task is just framing. The interviewer wants to hear what <b>you</b> decided & did." },
        { type: "callout", variant: "warning", vi: "Bẫy thường gặp: kể \"chúng tôi\" suốt → không rõ <b>bạn</b> đóng góp gì. Và đừng kể chuyện không có kết quả rõ ràng.", en: "Common trap: saying \"we\" throughout → unclear what <b>you</b> contributed. And don't tell stories without a clear result." },
      ],
    },
    {
      id: "questions",
      title: { vi: "2. Câu hỏi hay gặp & cách tiếp cận", en: "2. Common questions & how to approach" },
      blocks: [
        { type: "table",
          headers: { vi: ["Câu hỏi", "Họ thực sự muốn biết"], en: ["Question", "What they really want"] },
          rows: [
            { vi: ["Kể về một dự án bạn tự hào", "Phạm vi tác động, vai trò của bạn, độ sâu kỹ thuật"], en: ["Tell me about a project you're proud of", "Impact, your role, technical depth"] },
            { vi: ["Lần bạn xử lý xung đột trong team", "Giao tiếp, đồng cảm, hướng giải quyết"], en: ["A time you handled team conflict", "Communication, empathy, resolution"] },
            { vi: ["Lần bạn thất bại / mắc lỗi", "Tự nhận trách nhiệm + học được gì (growth mindset)"], en: ["A time you failed / made a mistake", "Ownership + what you learned (growth mindset)"] },
            { vi: ["Bug/sự cố khó nhất bạn từng debug", "Tư duy phân tích, sự kiên trì, phương pháp"], en: ["Hardest bug/incident you debugged", "Analytical thinking, persistence, method"] },
            { vi: ["Lần bạn bất đồng với quản lý/đồng nghiệp", "Dám lên tiếng có lý lẽ, rồi disagree-and-commit"], en: ["A time you disagreed with a manager/peer", "Speaking up with reason, then disagree-and-commit"] },
            { vi: ["Vì sao rời công ty cũ / vì sao công ty này", "Động lực thật, sự phù hợp, đã tìm hiểu chưa"], en: ["Why leave / why this company", "Genuine motivation, fit, did you research them"] },
          ] },
        { type: "callout", variant: "key", vi: "Chuẩn bị sẵn <b>5-6 câu chuyện</b> từ kinh nghiệm thật (kể cả dự án OWork) và \"tái sử dụng\" chúng cho nhiều câu hỏi: một chuyện về <i>impact</i>, một về <i>xung đột</i>, một về <i>thất bại</i>, một về <i>debug khó</i>, một về <i>lãnh đạo/chủ động</i>.", en: "Prepare <b>5–6 stories</b> from real experience (including OWork) and reuse them across questions: one about <i>impact</i>, one about <i>conflict</i>, one about <i>failure</i>, one about <i>hard debugging</i>, one about <i>leadership/initiative</i>." },
      ],
    },
    {
      id: "ask",
      title: { vi: "3. Câu hỏi NÊN hỏi lại người phỏng vấn", en: "3. Questions YOU should ask them" },
      blocks: [
        { type: "prose", vi: "Luôn chuẩn bị 3-4 câu hỏi — \"không có câu hỏi nào\" là tín hiệu xấu (thiếu quan tâm). Câu hỏi tốt thể hiện bạn đã suy nghĩ nghiêm túc:", en: "Always prepare 3–4 questions — \"no questions\" is a bad signal (lack of interest). Good questions show you've thought seriously:" },
        { type: "list", items: [
          { vi: "\"Một ngày làm việc điển hình của vị trí này như thế nào?\"", en: "\"What does a typical day look like in this role?\"" },
          { vi: "\"Thách thức kỹ thuật lớn nhất team đang đối mặt là gì?\"", en: "\"What's the biggest technical challenge the team faces right now?\"" },
          { vi: "\"Quy trình review code / deploy / on-call ở đây ra sao?\"", en: "\"How do code review / deploys / on-call work here?\"" },
          { vi: "\"Người làm tốt ở vị trí này sau 6 tháng trông như thế nào?\"", en: "\"What does success in this role look like after 6 months?\"" },
          { vi: "\"Team học hỏi & phát triển kỹ thuật như thế nào?\"", en: "\"How does the team learn and grow technically?\"" },
        ] },
        { type: "callout", variant: "tip", vi: "Tránh hỏi lương/nghỉ phép ở vòng kỹ thuật đầu — để dành cho HR/vòng offer. Ưu tiên câu hỏi về <b>công việc & con người</b>.", en: "Avoid salary/leave questions in early technical rounds — save those for HR/offer stage. Prioritize questions about the <b>work & people</b>." },
      ],
    },
    {
      id: "tips",
      title: { vi: "4. Mẹo tổng & checklist trước phỏng vấn", en: "4. General tips & pre-interview checklist" },
      blocks: [
        { type: "list", items: [
          { vi: "<b>Nghiên cứu công ty</b>: sản phẩm, stack công nghệ, tin tức gần đây. Gắn câu trả lời với họ.", en: "<b>Research the company</b>: product, tech stack, recent news. Tie answers back to them." },
          { vi: "<b>Trung thực</b>: không biết thì nói \"em chưa làm cái này, nhưng em sẽ tiếp cận thế này…\". Bịa là rủi ro lớn.", en: "<b>Be honest</b>: if you don't know, say \"I haven't done this, but here's how I'd approach it…\". Bluffing is high-risk." },
          { vi: "<b>Ngắn gọn, có cấu trúc</b>: trả lời 1-2 phút/câu rồi dừng hỏi \"anh/chị muốn em đi sâu hơn không?\".", en: "<b>Concise & structured</b>: answer in 1–2 minutes, then ask \"would you like me to go deeper?\"" },
          { vi: "<b>Nhiệt tình & tò mò</b>: thái độ học hỏi quan trọng ngang kỹ năng, nhất là với junior/mid.", en: "<b>Enthusiasm & curiosity</b>: attitude matters as much as skill, especially at junior/mid level." },
          { vi: "<b>Gửi email cảm ơn</b> sau phỏng vấn — nhỏ nhưng tạo ấn tượng tốt.", en: "<b>Send a thank-you email</b> afterwards — small touch, good impression." },
        ] },
        { type: "callout", variant: "soundbite", vi: "Một câu trả lời behavioral tốt = một câu chuyện thật, theo STAR, nhấn vào hành động của BẠN và kết thúc bằng kết quả đo được + bài học. Chuẩn bị trước, đừng ứng biến.", en: "A good behavioral answer = a true story, in STAR form, focused on YOUR actions and ending with a measurable result + a lesson. Prepare in advance, don't improvise." },
      ],
    },
  ],
  flashcards: [
    { front: { vi: "STAR là viết tắt của gì?", en: "What does STAR stand for?" }, back: { vi: "<b>S</b>ituation (bối cảnh) · <b>T</b>ask (nhiệm vụ) · <b>A</b>ction (hành động của bạn) · <b>R</b>esult (kết quả, có số liệu). Dành ~70% cho Action + Result.", en: "<b>S</b>ituation · <b>T</b>ask · <b>A</b>ction (yours) · <b>R</b>esult (quantified). Spend ~70% on Action + Result." } },
    { front: { vi: "Lỗi lớn nhất khi kể chuyện theo STAR?", en: "Biggest mistake when telling a STAR story?" }, back: { vi: "Nói \"chúng tôi\" suốt → không rõ <b>bạn</b> đóng góp gì. Dùng \"tôi\" cho phần Action. Và phải có Result rõ ràng.", en: "Saying \"we\" throughout → unclear what <b>you</b> did. Use \"I\" in the Action. And always include a clear Result." } },
    { front: { vi: "Khi được hỏi về một thất bại, họ muốn nghe gì?", en: "When asked about a failure, what do they want to hear?" }, back: { vi: "Bạn <b>nhận trách nhiệm</b> (ownership) và <b>học được gì</b> (growth mindset) — không đổ lỗi, không kể chuyện \"điểm yếu là tôi quá cầu toàn\".", en: "That you took <b>ownership</b> and <b>learned</b> (growth mindset) — no blame-shifting, no \"my weakness is I'm too much of a perfectionist\"." } },
    { front: { vi: "Nên hỏi lại người phỏng vấn mấy câu?", en: "How many questions should you ask the interviewer?" }, back: { vi: "<b>3-4 câu</b> đã chuẩn bị. \"Không có câu hỏi\" = tín hiệu thiếu quan tâm. Hỏi về công việc, thách thức kỹ thuật, định nghĩa thành công.", en: "<b>3–4 prepared</b> questions. \"No questions\" = a disinterest signal. Ask about the work, technical challenges, what success looks like." } },
    { front: { vi: "Nên làm gì khi gặp câu hỏi mình không biết?", en: "What to do with a question you don't know?" }, back: { vi: "Trung thực: \"Em chưa làm cái này, nhưng em sẽ tiếp cận thế này…\". Thể hiện cách tư duy. <b>Đừng bịa</b> — rủi ro lớn hơn nhiều.", en: "Be honest: \"I haven't done this, but here's how I'd approach it…\". Show your reasoning. <b>Don't bluff</b> — far riskier." } },
    { front: { vi: "Bao nhiêu câu chuyện nên chuẩn bị sẵn?", en: "How many stories should you prepare?" }, back: { vi: "<b>5-6 câu chuyện</b> thật, mỗi câu cho một chủ đề: impact, xung đột, thất bại, debug khó, lãnh đạo/chủ động. Tái sử dụng cho nhiều câu hỏi.", en: "<b>5–6 real stories</b>, each for a theme: impact, conflict, failure, hard debugging, leadership/initiative. Reuse across questions." } },
  ],
  quiz: [
    { q: { vi: "Trong STAR, phần nào nên chiếm nhiều thời gian nhất?", en: "In STAR, which part should take the most time?" },
      options: [{ vi: "Situation", en: "Situation" }, { vi: "Task", en: "Task" }, { vi: "Action (và Result)", en: "Action (and Result)" }, { vi: "Chia đều bốn phần", en: "Split evenly across four" }], answer: 2,
      explain: { vi: "~70% cho Action + Result — đó là nơi thể hiện bạn đã quyết định & làm gì, và tác động ra sao.", en: "~70% on Action + Result — that's where you show what you decided & did, and the impact." } },
    { q: { vi: "Cách trả lời tốt nhất cho \"kể về một lần bạn thất bại\"?", en: "Best way to answer \"tell me about a failure\"?" },
      options: [{ vi: "Nói mình chưa từng thất bại", en: "Say you've never failed" }, { vi: "Đổ lỗi cho hoàn cảnh/đồng đội", en: "Blame circumstances/teammates" }, { vi: "Nhận trách nhiệm + nêu bài học rút ra", en: "Take ownership + state the lesson learned" }, { vi: "Kể điểm yếu giả như 'quá cầu toàn'", en: "Give a fake weakness like 'too perfectionist'" }], answer: 2,
      explain: { vi: "Họ chấm ownership + growth mindset. Nhận lỗi thật + bài học cụ thể cho thấy bạn trưởng thành.", en: "They grade ownership + growth mindset. A real mistake + concrete lesson shows maturity." } },
    { q: { vi: "Khi gặp câu hỏi kỹ thuật bạn không biết, nên?", en: "Facing a technical question you don't know, you should?" },
      options: [{ vi: "Bịa một câu trả lời nghe hợp lý", en: "Make up a plausible-sounding answer" }, { vi: "Im lặng", en: "Stay silent" }, { vi: "Thừa nhận & trình bày cách bạn sẽ tiếp cận", en: "Admit it & explain how you'd approach it" }, { vi: "Đổi chủ đề", en: "Change the subject" }], answer: 2,
      explain: { vi: "Trung thực + thể hiện tư duy giải quyết vấn đề ăn điểm hơn nhiều so với bịa (dễ bị bóc ngay).", en: "Honesty + showing problem-solving thinking scores far better than bluffing (easily exposed)." } },
  ],
});
