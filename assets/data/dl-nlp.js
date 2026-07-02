/* Deep Learning & NLP — neural nets, transformers, tokenization, training */
PREP.register({
  id: "dl-nlp",
  icon: "🧠",
  category: "ai",
  title: { vi: "Deep Learning & NLP", en: "Deep Learning & NLP" },
  blurb: {
    vi: "Từ neuron đơn giản đến Transformer — trực giác về cách mạng lưới thần kinh học, vì sao attention thắng RNN, và cách huấn luyện mô hình thực tế.",
    en: "From a single neuron to the Transformer — intuition for how neural networks learn, why attention beat RNNs, and how models are actually trained.",
  },
  sections: [
    {
      id: "ml-to-dl",
      title: { vi: "1. Từ ML → DL: neuron, MLP, vì sao \"deep\"", en: "1. From ML → DL: neuron, MLP, why \"deep\"" },
      blocks: [
        {
          type: "prose",
          vi: "Một <b>neuron nhân tạo</b> chỉ là một phép tính đơn giản: nhận nhiều input, nhân mỗi input với một <b>trọng số (weight)</b>, cộng lại với <b>bias</b>, rồi đẩy qua một <b>hàm kích hoạt (activation function)</b> phi tuyến. Xếp nhiều neuron thành một lớp (layer), xếp nhiều layer nối tiếp nhau ta được <b>MLP (Multi-Layer Perceptron)</b> — mạng nơ-ron truyền thẳng cơ bản nhất.",
          en: "An <b>artificial neuron</b> is just a simple computation: take several inputs, multiply each by a <b>weight</b>, add a <b>bias</b>, then pass the sum through a non-linear <b>activation function</b>. Stack neurons into a layer, stack layers one after another, and you get an <b>MLP (Multi-Layer Perceptron)</b> — the most basic feed-forward neural network.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Deep</b> = có nhiều hidden layer (thường &gt;2-3). Mỗi layer học một mức <b>biểu diễn (representation)</b> trừu tượng hơn layer trước — ví dụ ảnh: layer đầu học cạnh (edge), layer giữa học hình dạng, layer sau học object.", en: "<b>Deep</b> = having many hidden layers (typically more than 2-3). Each layer learns a more abstract <b>representation</b> than the previous — e.g. for images: early layers learn edges, middle layers learn shapes, later layers learn objects." },
            { vi: "<b>Universal approximation theorem</b>: về lý thuyết một mạng đủ rộng (1 hidden layer, đủ neuron) có thể xấp xỉ mọi hàm liên tục — nhưng thực tế mạng <b>sâu</b> học hiệu quả hơn nhiều so với mạng <b>rộng</b> nông với cùng số tham số.", en: "<b>Universal approximation theorem</b>: theoretically a wide-enough network (1 hidden layer, enough neurons) can approximate any continuous function — but in practice a <b>deep</b> network learns far more efficiently than a shallow <b>wide</b> one with the same parameter count." },
            { vi: "Không có activation phi tuyến, xếp nhiều layer tuyến tính chỉ tương đương <b>một</b> phép biến đổi tuyến tính duy nhất — mất hết lợi ích của \"deep\".", en: "Without non-linear activations, stacking linear layers collapses into <b>one</b> single linear transformation — losing all the benefit of going \"deep\"." },
          ],
        },
        {
          type: "code",
          code: "# Một neuron: z = w1*x1 + w2*x2 + b, output = activation(z)\nimport numpy as np\n\ndef relu(z):\n    return np.maximum(0, z)\n\nx = np.array([1.0, 2.0])       # 2 input features\nw = np.array([0.5, -1.0])      # weights (học được)\nb = 0.1                          # bias\n\nz = np.dot(w, x) + b\noutput = relu(z)                # neuron 1 lớp\nprint(output)\n\n# MLP: nhiều layer nối tiếp\n# input -> Linear -> ReLU -> Linear -> ReLU -> Linear -> output",
          caption: { vi: "Một neuron là weighted sum + activation; MLP là chuỗi các layer như vậy nối tiếp nhau.", en: "A neuron is a weighted sum + activation; an MLP is a chain of such layers." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Trực giác: mạng nơ-ron học bằng cách <b>tự động tìm feature</b> từ dữ liệu thô, thay vì con người tự thiết kế feature (feature engineering) như ML cổ điển. Đây là lý do DL vượt trội trên dữ liệu phi cấu trúc (ảnh, text, âm thanh).",
          en: "Intuition: neural networks learn by <b>automatically discovering features</b> from raw data, instead of humans hand-designing features (feature engineering) like classical ML. This is why DL excels on unstructured data (images, text, audio).",
        },
      ],
    },
    {
      id: "backprop-gd",
      title: { vi: "2. Backprop + gradient descent trực giác", en: "2. Backprop + gradient descent intuition" },
      blocks: [
        {
          type: "prose",
          vi: "Huấn luyện mạng = tìm bộ trọng số làm <b>hàm mất mát (loss function)</b> nhỏ nhất. <b>Gradient descent</b> là thuật toán: tính xem loss thay đổi thế nào nếu nhích mỗi trọng số một chút (đạo hàm/gradient), rồi cập nhật trọng số theo hướng <b>ngược</b> gradient (để loss giảm).",
          en: "Training a network means finding the weights that minimize a <b>loss function</b>. <b>Gradient descent</b> is the algorithm: compute how loss would change if you nudged each weight slightly (the gradient), then update weights in the <b>opposite</b> direction of the gradient (so loss decreases).",
        },
        {
          type: "list",
          ordered: true,
          items: [
            { vi: "<b>Forward pass</b>: đẩy input qua mạng, tính output và loss.", en: "<b>Forward pass</b>: push input through the network, compute output and loss." },
            { vi: "<b>Backward pass (backpropagation)</b>: dùng <b>chain rule</b> của giải tích để lan truyền gradient của loss ngược từ output về từng trọng số, layer theo layer.", en: "<b>Backward pass (backpropagation)</b>: use the calculus <b>chain rule</b> to propagate the loss gradient backward from the output to every weight, layer by layer." },
            { vi: "<b>Update</b>: mỗi trọng số w được cập nhật <code>w = w - learning_rate * gradient</code>. Lặp lại hàng nghìn/triệu lần trên nhiều batch dữ liệu.", en: "<b>Update</b>: each weight w is updated as <code>w = w - learning_rate * gradient</code>. Repeat thousands/millions of times over many data batches." },
          ],
        },
        {
          type: "prose",
          vi: "Trực giác không cần đạo hàm nặng: hãy tưởng tượng bạn đang đứng trên một quả đồi mù sương (hàm loss theo hàng triệu chiều trọng số) và muốn xuống thấp nhất có thể. Gradient cho biết <b>hướng dốc nhất đi lên</b> tại vị trí hiện tại; bạn đi ngược lại hướng đó, một bước nhỏ (learning rate), rồi lặp lại.",
          en: "Intuition without heavy calculus: imagine standing on a foggy hill (the loss function over millions of weight dimensions) trying to get as low as possible. The gradient tells you the <b>steepest uphill direction</b> from where you stand; you step in the opposite direction, a small step (the learning rate), and repeat.",
        },
        {
          type: "callout",
          variant: "key",
          vi: "Backprop <b>không phải</b> một thuật toán học riêng — nó chỉ là cách tính gradient hiệu quả (dùng chain rule + tái sử dụng kết quả trung gian) để gradient descent có thể chạy được trên mạng nhiều triệu tham số.",
          en: "Backprop is <b>not</b> a separate learning algorithm — it is just an efficient way to compute gradients (via the chain rule + reusing intermediate results) so gradient descent can run on networks with millions of parameters.",
        },
      ],
    },
    {
      id: "activation-loss-optimizer",
      title: { vi: "3. Activation / loss / optimizer (bảng chọn)", en: "3. Activation / loss / optimizer (selection tables)" },
      blocks: [
        {
          type: "prose",
          vi: "Ba lựa chọn ảnh hưởng lớn nhất đến việc mạng có học được không: <b>activation function</b> (phi tuyến ở mỗi layer), <b>loss function</b> (đo sai số), <b>optimizer</b> (cách cập nhật trọng số).",
          en: "Three choices matter most for whether a network learns well: the <b>activation function</b> (non-linearity per layer), the <b>loss function</b> (measuring error), and the <b>optimizer</b> (how weights get updated).",
        },
        {
          type: "table",
          headers: { vi: ["Activation", "Đặc điểm", "Dùng khi"], en: ["Activation", "Characteristics", "Use when"] },
          rows: [
            { vi: ["ReLU", "max(0,x), nhanh, tránh vanishing gradient phần lớn", "Mặc định cho hidden layer trong CNN/MLP"], en: ["ReLU", "max(0,x), fast, mostly avoids vanishing gradient", "Default for hidden layers in CNN/MLP"] },
            { vi: ["Sigmoid", "Nén về (0,1), dễ vanishing gradient khi sâu", "Output layer cho binary classification"], en: ["Sigmoid", "Squashes to (0,1), prone to vanishing gradient when deep", "Output layer for binary classification"] },
            { vi: ["Softmax", "Chuẩn hóa vector thành phân phối xác suất tổng = 1", "Output layer cho multi-class classification"], en: ["Softmax", "Normalizes a vector into a probability distribution summing to 1", "Output layer for multi-class classification"] },
            { vi: ["GELU/SiLU", "Mượt hơn ReLU, hiệu năng tốt trong Transformer", "Transformer, LLM hiện đại"], en: ["GELU/SiLU", "Smoother than ReLU, performs well in Transformers", "Transformers, modern LLMs"] },
          ],
        },
        {
          type: "table",
          headers: { vi: ["Loss", "Dùng cho", "Optimizer", "Ghi chú"], en: ["Loss", "Used for", "Optimizer", "Notes"] },
          rows: [
            { vi: ["MSE (Mean Squared Error)", "Regression", "SGD", "Cập nhật thẳng theo gradient, cần tune LR cẩn thận"], en: ["MSE (Mean Squared Error)", "Regression", "SGD", "Updates directly along the gradient, LR needs careful tuning"] },
            { vi: ["Cross-Entropy", "Classification (binary/multi-class)", "SGD + Momentum", "Thêm \"quán tính\" giúp vượt qua vùng phẳng/local minima nhỏ"], en: ["Cross-Entropy", "Classification (binary/multi-class)", "SGD + Momentum", "Adds \"inertia\" to help escape flat regions/small local minima"] },
            { vi: ["Contrastive/Triplet loss", "Embedding learning (similarity)", "Adam", "Learning rate thích ứng per-parameter, hội tụ nhanh, ít cần tune"], en: ["Contrastive/Triplet loss", "Embedding learning (similarity)", "Adam", "Per-parameter adaptive learning rate, converges fast, needs less tuning"] },
            { vi: ["KL Divergence", "So sánh 2 phân phối xác suất (distillation, VAE)", "AdamW", "Adam + weight decay tách biệt đúng cách — chuẩn cho Transformer/LLM"], en: ["KL Divergence", "Comparing 2 probability distributions (distillation, VAE)", "AdamW", "Adam + properly decoupled weight decay — the standard for Transformers/LLMs"] },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Mặc định an toàn hiện nay cho hầu hết bài toán DL: <b>ReLU/GELU</b> cho hidden layer, <b>Cross-Entropy</b> cho classification, <b>AdamW</b> cho optimizer.",
          en: "A safe modern default for most DL problems: <b>ReLU/GELU</b> for hidden layers, <b>Cross-Entropy</b> for classification, <b>AdamW</b> as the optimizer.",
        },
      ],
    },
    {
      id: "cnn-rnn-lstm",
      title: { vi: "4. CNN & RNN/LSTM ngắn gọn — dùng khi nào, hạn chế", en: "4. CNN & RNN/LSTM in brief — when to use, limitations" },
      blocks: [
        {
          type: "prose",
          vi: "<b>CNN (Convolutional Neural Network)</b> dùng bộ lọc (filter/kernel) trượt qua ảnh để phát hiện pattern cục bộ (cạnh, texture), tận dụng tính <b>local + translation invariance</b> của ảnh. <b>RNN (Recurrent Neural Network)</b> xử lý dữ liệu tuần tự (text, time series) bằng cách giữ một <b>hidden state</b> truyền qua từng bước thời gian.",
          en: "<b>CNN (Convolutional Neural Network)</b> slides filters/kernels across an image to detect local patterns (edges, textures), exploiting the <b>local + translation invariance</b> nature of images. <b>RNN (Recurrent Neural Network)</b> processes sequential data (text, time series) by carrying a <b>hidden state</b> forward through each time step.",
        },
        {
          type: "table",
          headers: { vi: ["Kiến trúc", "Dùng khi", "Hạn chế chính"], en: ["Architecture", "Use when", "Main limitation"] },
          rows: [
            { vi: ["CNN", "Ảnh, video, dữ liệu có cấu trúc lưới không gian", "Không nắm bắt tốt phụ thuộc xa (long-range dependency) nếu không xếp nhiều layer/dilation"], en: ["CNN", "Images, video, spatially gridded data", "Doesn't capture long-range dependencies well without many layers/dilation"] },
            { vi: ["RNN/LSTM", "Chuỗi ngắn: time series, text ngắn (trước 2017)", "Xử lý <b>tuần tự</b> (không song song hóa được) → chậm; <b>vanishing gradient</b> khi chuỗi dài dù LSTM đã cải thiện bằng gate"], en: ["RNN/LSTM", "Short sequences: time series, short text (pre-2017)", "Processes <b>sequentially</b> (cannot parallelize) → slow; <b>vanishing gradient</b> on long sequences even though LSTM improves this with gates"] },
          ],
        },
        {
          type: "prose",
          vi: "<b>LSTM (Long Short-Term Memory)</b> thêm các \"cổng\" (gate: forget, input, output) để kiểm soát thông tin nào giữ lại/quên đi trong hidden state, giảm vanishing gradient so với RNN thuần — nhưng vẫn tuần tự, vẫn khó với chuỗi rất dài. Đây chính là động lực dẫn đến Transformer.",
          en: "<b>LSTM (Long Short-Term Memory)</b> adds \"gates\" (forget, input, output) to control what information to keep or discard in the hidden state, reducing vanishing gradient compared to plain RNNs — but it is still sequential and still struggles with very long sequences. This limitation is exactly what motivated the Transformer.",
        },
        {
          type: "callout",
          variant: "info",
          vi: "CNN vẫn rất mạnh cho computer vision (đôi khi kết hợp với attention: hybrid CNN-Transformer). RNN/LSTM ngày nay chủ yếu gặp trong hệ thống cũ hoặc bài toán time-series nhỏ; hầu hết NLP hiện đại dùng Transformer.",
          en: "CNNs remain strong for computer vision (sometimes combined with attention in hybrid CNN-Transformer models). RNN/LSTM today mostly appear in legacy systems or small time-series problems; most modern NLP uses Transformers.",
        },
      ],
    },
    {
      id: "transformer-attention",
      title: { vi: "5. Transformer & self-attention", en: "5. Transformer & self-attention" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Self-attention</b> cho phép mỗi từ trong câu \"nhìn\" vào <b>mọi</b> từ khác trong câu cùng lúc (song song, không tuần tự như RNN) để quyết định từ nào liên quan đến từ nào, bất kể khoảng cách. Đây là bước đột phá của paper \"Attention Is All You Need\" (2017).",
          en: "<b>Self-attention</b> lets every word in a sentence \"look at\" <b>every other</b> word simultaneously (in parallel, not sequentially like an RNN) to decide which words are relevant to which, regardless of distance. This was the breakthrough of the \"Attention Is All You Need\" paper (2017).",
        },
        {
          type: "prose",
          vi: "Trực giác Q/K/V: mỗi từ được chiếu (project) thành 3 vector — <b>Query (Q)</b> \"tôi đang tìm gì\", <b>Key (K)</b> \"tôi có thông tin gì để cung cấp\", <b>Value (V)</b> \"nội dung thực sự tôi mang theo\". Điểm attention giữa 2 từ = độ tương đồng giữa Query của từ này và Key của từ kia (dot product); điểm đó dùng làm trọng số để lấy trung bình có trọng số các Value.",
          en: "Q/K/V intuition: each word is projected into 3 vectors — <b>Query (Q)</b> \"what am I looking for\", <b>Key (K)</b> \"what information do I offer\", <b>Value (V)</b> \"the actual content I carry\". The attention score between two words = the similarity between one word's Query and the other's Key (dot product); that score weights a weighted average of the Values.",
        },
        {
          type: "code",
          code: "# Self-attention giản lược (một head)\n# Q, K, V: (seq_len, d_k) — chiếu tuyến tính từ embedding input\nimport numpy as np\n\ndef softmax(x, axis=-1):\n    e = np.exp(x - np.max(x, axis=axis, keepdims=True))\n    return e / e.sum(axis=axis, keepdims=True)\n\ndef self_attention(Q, K, V):\n    d_k = Q.shape[-1]\n    scores = Q @ K.T / np.sqrt(d_k)   # (seq_len, seq_len) — độ liên quan giữa các từ\n    weights = softmax(scores)         # chuẩn hóa thành trọng số attention\n    return weights @ V                 # trung bình có trọng số của Value",
          caption: { vi: "Công thức attention: softmax(QK^T / sqrt(d_k)) V — chia cho sqrt(d_k) để ổn định gradient.", en: "The attention formula: softmax(QK^T / sqrt(d_k)) V — dividing by sqrt(d_k) stabilizes gradients." },
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Multi-head attention</b>: chạy nhiều bộ Q/K/V song song (nhiều \"head\"), mỗi head học một loại quan hệ khác nhau (cú pháp, ngữ nghĩa, đồng tham chiếu...), rồi ghép kết quả lại.", en: "<b>Multi-head attention</b>: run several Q/K/V sets in parallel (multiple \"heads\"), each head learning a different type of relationship (syntax, semantics, coreference...), then concatenate the results." },
            { vi: "<b>Positional encoding</b>: self-attention tự nó không biết thứ tự từ (permutation-invariant) — phải cộng thêm vector mã hóa vị trí vào embedding để mô hình biết từ nào đứng trước/sau.", en: "<b>Positional encoding</b>: self-attention itself has no notion of word order (it's permutation-invariant) — a position-encoding vector must be added to the embedding so the model knows which word comes before/after." },
            { vi: "Vì sao thắng RNN: attention <b>song song hóa hoàn toàn</b> trên GPU (không phải đợi bước trước xong như RNN) và kết nối trực tiếp giữa 2 từ bất kỳ (đường đi gradient ngắn = O(1) thay vì O(n)) → học phụ thuộc xa tốt hơn, train nhanh hơn trên dữ liệu lớn.", en: "Why it beats RNNs: attention is <b>fully parallelizable</b> on GPUs (no need to wait for the previous step like an RNN) and directly connects any two words (gradient path length O(1) instead of O(n)) → better long-range dependency learning, faster training at scale." },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Transformer = <b>self-attention</b> (mối quan hệ giữa các từ) + <b>feed-forward layer</b> (xử lý từng vị trí độc lập) + <b>residual connection & layer norm</b> (giúp train mạng rất sâu ổn định) — lặp lại nhiều lần thành nhiều \"block\".",
          en: "Transformer = <b>self-attention</b> (relationships between words) + <b>feed-forward layer</b> (processing each position independently) + <b>residual connections & layer norm</b> (stabilizing training of very deep networks) — repeated many times as stacked \"blocks\".",
        },
      ],
    },
    {
      id: "tokenization-embeddings",
      title: { vi: "6. Tokenization (BPE) + embeddings (word2vec→contextual)", en: "6. Tokenization (BPE) + embeddings (word2vec→contextual)" },
      blocks: [
        {
          type: "prose",
          vi: "Máy tính không hiểu chữ, chỉ hiểu số. <b>Tokenization</b> là bước chia văn bản thành các đơn vị nhỏ (token) rồi ánh xạ mỗi token sang một số nguyên (ID). <b>Embedding</b> là bước ánh xạ ID đó sang một vector số thực nhiều chiều, mang ý nghĩa ngữ nghĩa.",
          en: "Computers don't understand text, only numbers. <b>Tokenization</b> splits text into small units (tokens) and maps each to an integer ID. An <b>embedding</b> then maps that ID to a real-valued vector that carries semantic meaning.",
        },
        {
          type: "prose",
          vi: "<b>BPE (Byte-Pair Encoding)</b>: thuật toán tokenization phổ biến nhất cho LLM hiện đại. Bắt đầu từ ký tự đơn lẻ, lặp lại việc gộp cặp ký tự/chuỗi con xuất hiện thường xuyên nhất thành 1 token mới, cho đến khi đạt kích thước từ vựng mong muốn (vd. 50k token). Ưu điểm: xử lý được từ hiếm/từ mới bằng cách tách thành sub-word, không cần từ vựng vô hạn.",
          en: "<b>BPE (Byte-Pair Encoding)</b>: the most common tokenization algorithm for modern LLMs. Starting from individual characters, it repeatedly merges the most frequent pair of characters/substrings into a new token, until reaching the desired vocabulary size (e.g. 50k tokens). Benefit: it handles rare/unseen words by splitting them into sub-words, avoiding the need for an infinite vocabulary.",
        },
        {
          type: "table",
          headers: { vi: ["Loại embedding", "Đặc điểm", "Ví dụ"], en: ["Embedding type", "Characteristics", "Example"] },
          rows: [
            { vi: ["Static (word2vec, GloVe)", "Mỗi từ có <b>đúng 1</b> vector cố định, không đổi theo ngữ cảnh", "\"bank\" (ngân hàng) và \"bank\" (bờ sông) có cùng vector"], en: ["Static (word2vec, GloVe)", "Each word has <b>exactly one</b> fixed vector, regardless of context", "\"bank\" (financial) and \"bank\" (river) share the same vector"] },
            { vi: ["Contextual (BERT, GPT embeddings)", "Vector của một từ <b>thay đổi</b> tùy câu/ngữ cảnh xung quanh (sinh ra bởi self-attention)", "\"bank\" trong 2 câu khác nhau có 2 vector khác nhau"], en: ["Contextual (BERT, GPT embeddings)", "A word's vector <b>changes</b> depending on surrounding context (produced via self-attention)", "\"bank\" in two different sentences yields two different vectors"] },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "word2vec nổi tiếng với tính chất đại số: <code>vector(\"king\") - vector(\"man\") + vector(\"woman\") ≈ vector(\"queen\")</code> — cho thấy embedding nắm bắt được quan hệ ngữ nghĩa dưới dạng hình học.",
          en: "word2vec is famous for its algebraic property: <code>vector(\"king\") - vector(\"man\") + vector(\"woman\") ≈ vector(\"queen\")</code> — showing embeddings capture semantic relationships geometrically.",
        },
      ],
    },
    {
      id: "transfer-learning",
      title: { vi: "7. Transfer learning & fine-tuning", en: "7. Transfer learning & fine-tuning" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Transfer learning</b>: lấy một mô hình đã <b>pretrain</b> (huấn luyện trước) trên tập dữ liệu khổng lồ, tổng quát (vd. toàn bộ internet text, hoặc ImageNet), rồi tái sử dụng/điều chỉnh cho bài toán cụ thể của mình — thay vì train từ đầu (from scratch), vốn cần rất nhiều dữ liệu và compute.",
          en: "<b>Transfer learning</b>: take a model already <b>pretrained</b> on a huge, general dataset (e.g. all internet text, or ImageNet), then reuse/adapt it for your specific task — instead of training from scratch, which requires enormous data and compute.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Feature extraction</b>: đóng băng (freeze) toàn bộ mô hình pretrained, chỉ train một lớp phân loại nhỏ gắn thêm ở cuối. Nhanh, cần ít dữ liệu, nhưng ít linh hoạt.", en: "<b>Feature extraction</b>: freeze the entire pretrained model, only train a small classification head added on top. Fast, needs little data, but less flexible." },
            { vi: "<b>Fine-tuning</b>: mở khóa (unfreeze) một phần hoặc toàn bộ trọng số, tiếp tục train trên dữ liệu riêng với learning rate <b>nhỏ</b> để không phá vỡ kiến thức đã học.", en: "<b>Fine-tuning</b>: unfreeze some or all weights, continue training on your own data with a <b>small</b> learning rate so as not to destroy the pretrained knowledge." },
            { vi: "<b>Parameter-efficient fine-tuning (PEFT)</b> — ví dụ <b>LoRA</b>: chỉ train một số ma trận nhỏ chèn thêm (thay vì toàn bộ tỷ tỷ tham số), giảm mạnh chi phí GPU/bộ nhớ, phổ biến khi fine-tune LLM lớn.", en: "<b>Parameter-efficient fine-tuning (PEFT)</b> — e.g. <b>LoRA</b>: only train a small number of inserted matrices (instead of all billions of parameters), drastically cutting GPU/memory cost, commonly used to fine-tune large LLMs." },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Quy tắc chọn: dữ liệu ít + tương tự domain pretrained → feature extraction hoặc LoRA. Dữ liệu nhiều + khác domain → fine-tune sâu hơn (nhiều layer) với LR nhỏ.",
          en: "Rule of thumb: little data + similar domain to pretraining → feature extraction or LoRA. Lots of data + different domain → deeper fine-tuning (more layers) with a small LR.",
        },
      ],
    },
    {
      id: "training-practical",
      title: { vi: "8. Training thực tế: batch, LR schedule, GPU, khi nào không cần DL", en: "8. Practical training: batch, LR schedule, GPU, when DL is overkill" },
      blocks: [
        {
          type: "prose",
          vi: "Vài khái niệm thực chiến khi train mô hình DL: <b>batch size</b> (số mẫu xử lý mỗi lần cập nhật trọng số), <b>epoch</b> (một lượt duyệt hết toàn bộ dữ liệu train), <b>learning rate schedule</b> (thay đổi LR theo thời gian train thay vì cố định).",
          en: "A few practical concepts when training DL models: <b>batch size</b> (number of samples processed per weight update), <b>epoch</b> (one full pass over the training data), <b>learning rate schedule</b> (varying LR over training instead of keeping it fixed).",
        },
        {
          type: "table",
          headers: { vi: ["Khái niệm", "Ý nghĩa", "Ghi chú"], en: ["Concept", "Meaning", "Notes"] },
          rows: [
            { vi: ["Batch size", "Số mẫu/1 lần forward+backward+update", "Nhỏ: nhiễu nhiều hơn nhưng generalize tốt hơn; lớn: ổn định, tận dụng GPU tốt hơn nhưng cần nhiều VRAM"], en: ["Batch size", "Samples per forward+backward+update", "Small: noisier but often generalizes better; large: more stable, better GPU utilization but needs more VRAM"] },
            { vi: ["Warmup", "Tăng dần LR từ ~0 lên giá trị đích ở vài bước đầu", "Tránh cập nhật quá lớn khi trọng số còn ngẫu nhiên, gây mất ổn định"], en: ["Warmup", "Gradually ramp LR from ~0 up to target over the first few steps", "Avoids huge updates while weights are still random, which destabilizes training"] },
            { vi: ["Cosine decay", "Giảm LR dần theo đường cosine sau warmup", "Chuẩn phổ biến khi train mô hình lớn (LLM, vision transformer)"], en: ["Cosine decay", "Gradually decay LR along a cosine curve after warmup", "Common standard for training large models (LLMs, vision transformers)"] },
            { vi: ["Early stopping", "Dừng train khi validation loss ngừng cải thiện", "Chống overfitting, tiết kiệm compute"], en: ["Early stopping", "Stop training when validation loss stops improving", "Prevents overfitting, saves compute"] },
          ],
        },
        {
          type: "prose",
          vi: "<b>GPU</b> quan trọng vì phép nhân ma trận (matrix multiplication) — phép toán cốt lõi của neural net — song song hóa cực tốt trên hàng nghìn core nhỏ của GPU, nhanh hơn CPU (ít core, mạnh từng core) rất nhiều lần cho khối lượng công việc này.",
          en: "<b>GPUs</b> matter because matrix multiplication — the core operation of neural nets — parallelizes extremely well across the thousands of small cores on a GPU, vastly outperforming a CPU (few, powerful cores) for this workload.",
        },
        {
          type: "callout",
          variant: "warning",
          vi: "<b>Không phải lúc nào cũng cần DL.</b> Với dữ liệu dạng bảng (tabular) cỡ nhỏ/vừa, các mô hình cổ điển như <b>gradient boosting (XGBoost/LightGBM)</b> thường chính xác hơn, train nhanh hơn, dễ diễn giải hơn và không cần GPU. DL tỏa sáng nhất với dữ liệu phi cấu trúc (ảnh, text, âm thanh) và tập dữ liệu rất lớn.",
          en: "<b>DL is not always the right tool.</b> For small/medium tabular data, classical models like <b>gradient boosting (XGBoost/LightGBM)</b> are often more accurate, faster to train, easier to interpret, and don't need a GPU. DL shines most on unstructured data (images, text, audio) and very large datasets.",
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Chốt phỏng vấn: <b>\"Transformer thắng RNN vì self-attention song song hóa được và kết nối trực tiếp mọi cặp từ (đường gradient O(1)). Nhưng deep learning không phải viên đạn bạc — với tabular data nhỏ, gradient boosting vẫn thường thắng.\"</b>",
          en: "Interview soundbite: <b>\"Transformers beat RNNs because self-attention parallelizes and directly connects every pair of words (O(1) gradient path). But deep learning isn't a silver bullet — for small tabular data, gradient boosting often still wins.\"</b>",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "\"Deep\" trong deep learning nghĩa là gì?", en: "What does \"deep\" mean in deep learning?" },
      back: { vi: "Mạng có nhiều hidden layer nối tiếp nhau; mỗi layer học một mức biểu diễn (representation) trừu tượng hơn layer trước, tự động trích xuất feature từ dữ liệu thô.", en: "A network with many hidden layers stacked in sequence; each layer learns a more abstract representation than the previous, automatically extracting features from raw data." },
    },
    {
      front: { vi: "Backpropagation dùng để làm gì?", en: "What is backpropagation used for?" },
      back: { vi: "Tính gradient của loss theo từng trọng số một cách hiệu quả bằng chain rule, để gradient descent có thể cập nhật hàng triệu tham số của mạng.", en: "Efficiently computes the gradient of the loss with respect to every weight via the chain rule, so gradient descent can update a network's millions of parameters." },
    },
    {
      front: { vi: "Khi nào dùng Sigmoid vs Softmax ở output layer?", en: "When to use Sigmoid vs Softmax at the output layer?" },
      back: { vi: "Sigmoid: binary classification (1 output, xác suất 1 lớp). Softmax: multi-class classification (nhiều output, tổng xác suất = 1).", en: "Sigmoid: binary classification (1 output, probability of one class). Softmax: multi-class classification (multiple outputs summing to a probability of 1)." },
    },
    {
      front: { vi: "Vì sao LSTM cải thiện so với RNN thuần?", en: "Why does LSTM improve on plain RNN?" },
      back: { vi: "Thêm các gate (forget/input/output) kiểm soát thông tin giữ lại/quên trong hidden state, giảm vanishing gradient — nhưng vẫn xử lý tuần tự nên vẫn chậm và khó với chuỗi rất dài.", en: "Adds gates (forget/input/output) to control what information is kept/discarded in the hidden state, reducing vanishing gradient — but it's still sequential, so still slow and limited on very long sequences." },
    },
    {
      front: { vi: "Vai trò của Query, Key, Value trong self-attention?", en: "What is the role of Query, Key, Value in self-attention?" },
      back: { vi: "Query = thứ từ này đang tìm; Key = thông tin từ khác cung cấp; Value = nội dung thực sự. Điểm attention = độ tương đồng Q-K, dùng làm trọng số để lấy trung bình có trọng số các Value.", en: "Query = what this word is looking for; Key = information other words offer; Value = actual content. Attention score = Q-K similarity, used to weight-average the Values." },
    },
    {
      front: { vi: "Vì sao cần positional encoding trong Transformer?", en: "Why is positional encoding needed in Transformers?" },
      back: { vi: "Self-attention tự nó không phân biệt thứ tự từ (permutation-invariant); positional encoding cộng thêm thông tin vị trí vào embedding để mô hình biết từ nào đứng trước/sau.", en: "Self-attention itself has no notion of word order (it's permutation-invariant); positional encoding adds position information to embeddings so the model knows which word comes before/after." },
    },
    {
      front: { vi: "Vì sao Transformer train nhanh hơn RNN trên GPU?", en: "Why do Transformers train faster than RNNs on GPU?" },
      back: { vi: "Self-attention xử lý toàn bộ chuỗi song song (không phải đợi bước trước như RNN), tận dụng tối đa khả năng tính toán song song của GPU.", en: "Self-attention processes the entire sequence in parallel (no need to wait for the previous step like an RNN), fully exploiting the GPU's parallel compute capability." },
    },
    {
      front: { vi: "BPE (Byte-Pair Encoding) hoạt động thế nào?", en: "How does BPE (Byte-Pair Encoding) work?" },
      back: { vi: "Bắt đầu từ ký tự đơn, lặp lại việc gộp cặp ký tự/chuỗi con xuất hiện thường xuyên nhất thành token mới cho đến khi đạt kích thước từ vựng mong muốn. Xử lý được từ hiếm bằng cách tách sub-word.", en: "Starts from single characters, repeatedly merges the most frequent character/substring pair into a new token until reaching the target vocabulary size. Handles rare words by splitting into sub-words." },
    },
    {
      front: { vi: "Khác biệt giữa static embedding (word2vec) và contextual embedding (BERT)?", en: "Difference between static embeddings (word2vec) and contextual embeddings (BERT)?" },
      back: { vi: "Static: mỗi từ có đúng 1 vector cố định bất kể ngữ cảnh. Contextual: vector của từ thay đổi tùy câu/ngữ cảnh xung quanh, sinh ra qua self-attention.", en: "Static: each word has exactly one fixed vector regardless of context. Contextual: a word's vector changes depending on surrounding context, produced via self-attention." },
    },
    {
      front: { vi: "Fine-tuning khác feature extraction thế nào?", en: "How does fine-tuning differ from feature extraction?" },
      back: { vi: "Feature extraction: đóng băng toàn bộ mô hình pretrained, chỉ train lớp mới thêm vào. Fine-tuning: mở khóa một phần/toàn bộ trọng số, train tiếp với LR nhỏ.", en: "Feature extraction: freeze the entire pretrained model, only train the newly added layer. Fine-tuning: unfreeze some/all weights, continue training with a small LR." },
    },
    {
      front: { vi: "Khi nào KHÔNG nên dùng deep learning?", en: "When should you NOT use deep learning?" },
      back: { vi: "Với dữ liệu tabular nhỏ/vừa — gradient boosting (XGBoost/LightGBM) thường chính xác hơn, train nhanh hơn, dễ diễn giải hơn, không cần GPU.", en: "With small/medium tabular data — gradient boosting (XGBoost/LightGBM) is often more accurate, faster to train, easier to interpret, and doesn't need a GPU." },
    },
  ],
  quiz: [
    {
      q: { vi: "Nếu mạng nơ-ron không có activation phi tuyến, điều gì xảy ra?", en: "If a neural network has no non-linear activation, what happens?" },
      options: [
        { vi: "Mạng học nhanh hơn nhiều", en: "The network learns much faster" },
        { vi: "Nhiều layer tuyến tính xếp chồng chỉ tương đương một phép biến đổi tuyến tính duy nhất", en: "Stacked linear layers collapse into a single linear transformation" },
        { vi: "Mạng tự động trở thành CNN", en: "The network automatically becomes a CNN" },
        { vi: "Không có gì thay đổi", en: "Nothing changes" },
      ],
      answer: 1,
      explain: { vi: "Không có phi tuyến, composite của nhiều phép biến đổi tuyến tính vẫn là một phép biến đổi tuyến tính — mạng mất khả năng học các pattern phức tạp, phi tuyến.", en: "Without non-linearity, a composite of linear transformations is still just one linear transformation — the network loses the ability to learn complex, non-linear patterns." },
    },
    {
      q: { vi: "Backpropagation dựa trên nguyên lý toán học nào?", en: "What mathematical principle does backpropagation rely on?" },
      options: [
        { vi: "Chain rule (quy tắc dây chuyền của đạo hàm)", en: "The chain rule (of derivatives)" },
        { vi: "Định lý Bayes", en: "Bayes' theorem" },
        { vi: "Phân tích Fourier", en: "Fourier analysis" },
        { vi: "Đại số tuyến tính thuần túy, không dùng đạo hàm", en: "Pure linear algebra, no derivatives" },
      ],
      answer: 0,
      explain: { vi: "Backprop dùng chain rule để lan truyền gradient của loss ngược qua từng layer, tính gradient cho mỗi trọng số một cách hiệu quả.", en: "Backprop uses the chain rule to propagate the loss gradient backward through each layer, efficiently computing the gradient for every weight." },
    },
    {
      q: { vi: "AdamW khác gì so với SGD thuần?", en: "How does AdamW differ from plain SGD?" },
      options: [
        { vi: "AdamW không dùng gradient", en: "AdamW doesn't use gradients" },
        { vi: "AdamW có learning rate thích ứng per-parameter và weight decay tách biệt đúng cách", en: "AdamW has a per-parameter adaptive learning rate and properly decoupled weight decay" },
        { vi: "AdamW chỉ dùng cho CNN", en: "AdamW is only for CNNs" },
        { vi: "AdamW chậm hơn SGD trong mọi trường hợp", en: "AdamW is always slower than SGD" },
      ],
      answer: 1,
      explain: { vi: "AdamW kết hợp learning rate thích ứng (adaptive) cho từng tham số với weight decay được tách biệt đúng cách khỏi gradient update — là chuẩn phổ biến khi train Transformer/LLM.", en: "AdamW combines a per-parameter adaptive learning rate with weight decay properly decoupled from the gradient update — the common standard for training Transformers/LLMs." },
    },
    {
      q: { vi: "Hạn chế chính của RNN so với Transformer là gì?", en: "What is the main limitation of RNNs compared to Transformers?" },
      options: [
        { vi: "RNN không thể xử lý text", en: "RNNs cannot process text" },
        { vi: "RNN xử lý tuần tự, không song song hóa được và khó học phụ thuộc xa", en: "RNNs process sequentially, cannot be parallelized, and struggle with long-range dependencies" },
        { vi: "RNN cần nhiều tham số hơn Transformer", en: "RNNs need more parameters than Transformers" },
        { vi: "RNN không dùng được activation function", en: "RNNs cannot use activation functions" },
      ],
      answer: 1,
      explain: { vi: "RNN phải xử lý từng bước thời gian tuần tự (bước sau phụ thuộc bước trước) nên không tận dụng được song song hóa GPU, và gradient phải đi qua nhiều bước gây vanishing gradient với chuỗi dài.", en: "RNNs must process time steps sequentially (each step depends on the previous), so they can't exploit GPU parallelism, and gradients must traverse many steps, causing vanishing gradient on long sequences." },
    },
    {
      q: { vi: "Trong self-attention, điểm attention giữa 2 từ được tính bằng gì?", en: "In self-attention, how is the attention score between two words computed?" },
      options: [
        { vi: "Khoảng cách Euclidean giữa 2 embedding", en: "The Euclidean distance between two embeddings" },
        { vi: "Tích vô hướng (dot product) giữa Query của từ này và Key của từ kia", en: "The dot product between one word's Query and the other's Key" },
        { vi: "Tần suất xuất hiện của 2 từ trong corpus", en: "The co-occurrence frequency of the two words in the corpus" },
        { vi: "Độ dài của mỗi từ", en: "The length of each word" },
      ],
      answer: 1,
      explain: { vi: "Attention score = dot product giữa Query của từ hiện tại và Key của từ khác, chia cho sqrt(d_k) để ổn định, rồi đưa qua softmax để chuẩn hóa thành trọng số.", en: "Attention score = dot product between the current word's Query and another word's Key, scaled by sqrt(d_k) for stability, then passed through softmax to normalize into weights." },
    },
    {
      q: { vi: "Vì sao Transformer cần positional encoding?", en: "Why does the Transformer need positional encoding?" },
      options: [
        { vi: "Vì self-attention không phân biệt được thứ tự từ (permutation-invariant)", en: "Because self-attention is permutation-invariant and can't distinguish word order" },
        { vi: "Vì GPU không hỗ trợ tính vị trí", en: "Because GPUs don't support computing position" },
        { vi: "Để giảm số lượng tham số", en: "To reduce the number of parameters" },
        { vi: "Chỉ cần thiết khi dùng CNN kết hợp Transformer", en: "Only needed when combining CNN with Transformer" },
      ],
      answer: 0,
      explain: { vi: "Self-attention xử lý tập các từ mà không quan tâm thứ tự — nếu tráo đổi vị trí 2 từ, kết quả attention (bỏ qua positional encoding) sẽ không đổi. Positional encoding bù đắp thông tin thứ tự bị thiếu.", en: "Self-attention treats the input as a set of words regardless of order — swapping two words' positions (ignoring positional encoding) wouldn't change the attention output. Positional encoding restores the missing order information." },
    },
    {
      q: { vi: "BPE (Byte-Pair Encoding) giải quyết vấn đề gì?", en: "What problem does BPE (Byte-Pair Encoding) solve?" },
      options: [
        { vi: "Xử lý từ hiếm/từ mới bằng cách tách thành sub-word, tránh từ vựng vô hạn", en: "Handles rare/unseen words by splitting into sub-words, avoiding an infinite vocabulary" },
        { vi: "Tăng tốc độ GPU khi train", en: "Speeds up GPU training" },
        { vi: "Loại bỏ hoàn toàn nhu cầu embedding", en: "Eliminates the need for embeddings entirely" },
        { vi: "Chuyển ảnh thành text", en: "Converts images to text" },
      ],
      answer: 0,
      explain: { vi: "BPE gộp dần các cặp ký tự/chuỗi con thường gặp thành token, cho phép biểu diễn từ hiếm/mới bằng các sub-word đã biết thay vì cần một token riêng cho mọi từ có thể.", en: "BPE iteratively merges frequent character/substring pairs into tokens, allowing rare/unseen words to be represented via known sub-words instead of needing a dedicated token for every possible word." },
    },
    {
      q: { vi: "Static embedding (word2vec) khác contextual embedding (BERT) ở điểm nào?", en: "How does a static embedding (word2vec) differ from a contextual embedding (BERT)?" },
      options: [
        { vi: "Static embedding nhanh hơn khi inference nhưng kém chính xác hơn luôn", en: "Static embeddings are always faster at inference but always less accurate" },
        { vi: "Static: 1 vector cố định/từ; Contextual: vector thay đổi theo ngữ cảnh câu", en: "Static: one fixed vector per word; Contextual: vector changes with sentence context" },
        { vi: "Contextual embedding không dùng được cho NLP", en: "Contextual embeddings can't be used for NLP" },
        { vi: "Static embedding chỉ dùng cho tiếng Anh", en: "Static embeddings only work for English" },
      ],
      answer: 1,
      explain: { vi: "word2vec/GloVe gán mỗi từ một vector cố định bất kể ngữ cảnh; BERT/GPT sinh vector khác nhau cho cùng một từ tùy câu chứa nó, nhờ cơ chế self-attention.", en: "word2vec/GloVe assign each word a fixed vector regardless of context; BERT/GPT generate different vectors for the same word depending on its surrounding sentence, via self-attention." },
    },
    {
      q: { vi: "LoRA (một dạng PEFT) giúp ích gì khi fine-tune LLM lớn?", en: "How does LoRA (a form of PEFT) help when fine-tuning large LLMs?" },
      options: [
        { vi: "Train toàn bộ tỷ tỷ tham số nhanh hơn nhờ GPU mạnh hơn", en: "Trains all billions of parameters faster via stronger GPUs" },
        { vi: "Chỉ train một số ma trận nhỏ chèn thêm, giảm mạnh chi phí GPU/bộ nhớ", en: "Only trains a small number of inserted matrices, drastically cutting GPU/memory cost" },
        { vi: "Loại bỏ hoàn toàn nhu cầu dữ liệu train", en: "Eliminates the need for training data entirely" },
        { vi: "Tăng kích thước context window", en: "Increases the context window size" },
      ],
      answer: 1,
      explain: { vi: "LoRA chèn thêm các ma trận nhỏ (low-rank) và chỉ train chúng, giữ nguyên phần lớn trọng số gốc — giảm đáng kể VRAM và compute cần thiết so với fine-tune toàn bộ mô hình.", en: "LoRA inserts small low-rank matrices and trains only those, keeping most original weights frozen — significantly reducing the VRAM and compute needed compared to full fine-tuning." },
    },
    {
      q: { vi: "Khi nào gradient boosting (XGBoost) thường tốt hơn deep learning?", en: "When does gradient boosting (XGBoost) often outperform deep learning?" },
      options: [
        { vi: "Với ảnh có độ phân giải cao", en: "With high-resolution images" },
        { vi: "Với dữ liệu tabular cỡ nhỏ/vừa", en: "With small/medium-sized tabular data" },
        { vi: "Với văn bản dài cần hiểu ngữ cảnh sâu", en: "With long text requiring deep contextual understanding" },
        { vi: "Với âm thanh thô (raw audio)", en: "With raw audio data" },
      ],
      answer: 1,
      explain: { vi: "Trên dữ liệu dạng bảng nhỏ/vừa, gradient boosting thường chính xác hơn, train nhanh hơn, dễ diễn giải và không cần GPU so với deep learning — vốn tỏa sáng nhất trên dữ liệu phi cấu trúc, khối lượng lớn.", en: "On small/medium tabular data, gradient boosting is typically more accurate, faster to train, more interpretable, and doesn't need a GPU compared to deep learning — which shines most on large-scale unstructured data." },
    },
  ],
});
