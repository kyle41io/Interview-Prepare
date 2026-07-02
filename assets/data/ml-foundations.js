/* Machine Learning Foundations — core ML concepts topic */
PREP.register({
  id: "ml-foundations",
  icon: "📊",
  category: "ai",
  title: { vi: "Machine Learning Foundations", en: "Machine Learning Foundations" },
  blurb: {
    vi: "Nền tảng ML mà mọi ứng viên AI/Data cần nắm: các loại học máy, quy trình xây dựng model, cách đánh giá đúng, và trực giác đằng sau các thuật toán phổ biến nhất. Đây là bộ câu hỏi phỏng vấn xuất hiện nhiều nhất trước khi đi sâu vào Deep Learning.",
    en: "The ML foundation every AI/Data candidate needs: types of learning, the model-building pipeline, correct evaluation, and intuition behind the most common algorithms. This is the most frequently asked interview ground before diving into Deep Learning.",
  },
  sections: [
    {
      id: "what-is-ml",
      title: { vi: "1. ML là gì: Supervised vs Unsupervised vs RL", en: "1. What is ML: Supervised vs Unsupervised vs RL" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Machine Learning</b> là cách xây dựng hệ thống <b>học từ dữ liệu</b> để tìm ra pattern/quy luật, thay vì lập trình luật thủ công (rule-based). Có 3 nhóm học máy chính, phân biệt bởi loại dữ liệu và mục tiêu.",
          en: "<b>Machine Learning</b> builds systems that <b>learn patterns from data</b> instead of hand-coded rules. There are 3 main paradigms, distinguished by the data available and the goal.",
        },
        {
          type: "table",
          headers: { vi: ["Loại", "Dữ liệu", "Mục tiêu", "Ví dụ"], en: ["Type", "Data", "Goal", "Example"] },
          rows: [
            { vi: ["<b>Supervised</b>", "Có nhãn (input, label)", "Học ánh xạ input → output để dự đoán nhãn mới", "Dự đoán giá nhà, phát hiện email spam"], en: ["<b>Supervised</b>", "Labeled (input, label)", "Learn a mapping input → output to predict labels on new data", "House price prediction, spam detection"] },
            { vi: ["<b>Unsupervised</b>", "Không có nhãn", "Tìm cấu trúc/pattern ẩn trong dữ liệu", "Phân cụm khách hàng, giảm chiều dữ liệu"], en: ["<b>Unsupervised</b>", "Unlabeled", "Discover hidden structure/patterns in data", "Customer segmentation, dimensionality reduction"] },
            { vi: ["<b>Reinforcement Learning</b>", "Agent + môi trường + reward", "Học chính sách (policy) tối đa hóa reward tích lũy qua tương tác", "Chơi game (AlphaGo), robot, hệ thống gợi ý"], en: ["<b>Reinforcement Learning</b>", "Agent + environment + reward", "Learn a policy maximizing cumulative reward via interaction", "Game playing (AlphaGo), robotics, recommendation"] },
          ],
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "Supervised chia tiếp thành <b>Regression</b> (dự đoán số liên tục, vd giá nhà) và <b>Classification</b> (dự đoán nhãn rời rạc, vd spam/not-spam).", en: "Supervised splits further into <b>Regression</b> (predicting a continuous number, e.g. price) and <b>Classification</b> (predicting a discrete label, e.g. spam/not-spam)." },
            { vi: "<b>Semi-supervised</b> là dạng lai: ít dữ liệu có nhãn + nhiều dữ liệu không nhãn, phổ biến khi gán nhãn tốn kém.", en: "<b>Semi-supervised</b> is a hybrid: a little labeled data + a lot of unlabeled data, common when labeling is expensive." },
          ],
        },
        {
          type: "callout",
          variant: "info",
          vi: "Câu hỏi hay gặp: <b>\"AI vs ML vs Deep Learning?\"</b> AI là khái niệm rộng nhất (máy làm việc như con người); ML là tập con của AI (học từ dữ liệu); Deep Learning là tập con của ML dùng mạng neural nhiều lớp.",
          en: "Common question: <b>\"AI vs ML vs Deep Learning?\"</b> AI is the broadest concept (machines acting intelligently); ML is a subset of AI (learning from data); Deep Learning is a subset of ML using multi-layer neural networks.",
        },
      ],
    },
    {
      id: "ml-pipeline",
      title: { vi: "2. Quy trình: Data → Features → Train → Eval → Deploy", en: "2. Pipeline: Data → Features → Train → Eval → Deploy" },
      blocks: [
        {
          type: "prose",
          vi: "Một dự án ML thực tế không chỉ là \"gọi <code>.fit()</code>\" — phần lớn thời gian (thường 70-80%) nằm ở thu thập/làm sạch dữ liệu và feature engineering, không phải chọn thuật toán.",
          en: "A real ML project is not just \"call <code>.fit()</code>\" — most of the time (often 70-80%) goes into data collection/cleaning and feature engineering, not algorithm selection.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            { vi: "<b>Thu thập & làm sạch dữ liệu (data collection & cleaning)</b> — xử lý missing values, outliers, dữ liệu trùng/lỗi.", en: "<b>Data collection & cleaning</b> — handle missing values, outliers, duplicate/corrupt records." },
            { vi: "<b>Feature engineering</b> — biến đổi dữ liệu thô thành đặc trưng (feature) có ý nghĩa cho model (encoding, scaling, tạo feature mới).", en: "<b>Feature engineering</b> — transform raw data into meaningful features (encoding, scaling, creating new features)." },
            { vi: "<b>Chia dữ liệu</b> — train/validation/test split để đánh giá khách quan.", en: "<b>Data splitting</b> — train/validation/test split for unbiased evaluation." },
            { vi: "<b>Training</b> — chọn thuật toán, huấn luyện model trên tập train, tune hyperparameter trên tập validation.", en: "<b>Training</b> — pick an algorithm, fit on the train set, tune hyperparameters on the validation set." },
            { vi: "<b>Evaluation</b> — đo hiệu năng trên tập test (chưa từng thấy) bằng metric phù hợp bài toán.", en: "<b>Evaluation</b> — measure performance on the unseen test set with a metric appropriate to the problem." },
            { vi: "<b>Deploy & monitor</b> — đưa model vào production, theo dõi <b>model/data drift</b> theo thời gian, retrain định kỳ.", en: "<b>Deploy & monitor</b> — ship the model to production, watch for <b>model/data drift</b> over time, retrain periodically." },
          ],
        },
        {
          type: "code",
          code: "from sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.metrics import accuracy_score\n\n# 1-3. Split\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, random_state=42, stratify=y\n)\n\n# 2. Feature scaling — fit CHỈ trên train, transform cả train & test\nscaler = StandardScaler()\nX_train_scaled = scaler.fit_transform(X_train)\nX_test_scaled = scaler.transform(X_test)   # KHÔNG fit lại trên test!\n\n# 4. Train\nmodel = LogisticRegression()\nmodel.fit(X_train_scaled, y_train)\n\n# 5. Evaluate\npreds = model.predict(X_test_scaled)\nprint(\"Accuracy:\", accuracy_score(y_test, preds))",
          caption: { vi: "Fit scaler/encoder chỉ trên train rồi transform cả train và test — tránh rò rỉ thông tin từ test set.", en: "Fit the scaler/encoder only on train, then transform both train and test — avoids leaking information from the test set." },
        },
        {
          type: "callout",
          variant: "warning",
          vi: "Lỗi kinh điển: gọi <code>scaler.fit_transform()</code> trên <b>toàn bộ</b> dữ liệu trước khi split. Điều này khiến thông tin từ tập test \"rò rỉ\" vào quá trình train (data leakage), làm kết quả đánh giá lạc quan giả tạo.",
          en: "Classic mistake: calling <code>scaler.fit_transform()</code> on the <b>whole</b> dataset before splitting. This leaks information from the test set into training (data leakage), producing artificially optimistic evaluation results.",
        },
      ],
    },
    {
      id: "splits-cv-leakage",
      title: { vi: "3. Train/Val/Test split, Cross-Validation, Data Leakage", en: "3. Train/Val/Test split, Cross-Validation, Data Leakage" },
      blocks: [
        {
          type: "prose",
          vi: "Mục tiêu cốt lõi của đánh giá model là ước lượng khả năng <b>tổng quát hóa (generalization)</b> — hiệu năng trên dữ liệu chưa từng thấy. Vì vậy dữ liệu phải được chia tách nghiêm ngặt.",
          en: "The core goal of evaluation is estimating <b>generalization</b> — performance on data the model has never seen. This requires strict separation of data.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Train set</b> — dùng để model học tham số (weights).", en: "<b>Train set</b> — used to learn the model's parameters (weights)." },
            { vi: "<b>Validation set</b> — dùng để chọn hyperparameter, so sánh model, early stopping. Model không học trực tiếp từ đây nhưng ta \"nhìn\" vào nó để ra quyết định.", en: "<b>Validation set</b> — used to select hyperparameters, compare models, early stopping. The model doesn't learn from it directly, but we \"look\" at it to make decisions." },
            { vi: "<b>Test set</b> — chỉ dùng <b>một lần duy nhất</b> ở cuối để báo cáo hiệu năng thực tế, không được dùng để tune bất cứ điều gì.", en: "<b>Test set</b> — used <b>only once</b> at the very end to report real-world performance; never used to tune anything." },
            { vi: "<b>K-fold Cross-Validation</b> — chia train thành K phần, luân phiên dùng K-1 phần để train và 1 phần để validate, lặp K lần rồi lấy trung bình. Giúp ước lượng ổn định hơn khi dữ liệu ít, giảm phụ thuộc vào một lần split cụ thể.", en: "<b>K-fold Cross-Validation</b> — split train into K folds, rotate training on K-1 folds and validating on 1, repeat K times and average. Gives a more stable estimate with limited data and reduces dependence on one particular split." },
          ],
        },
        {
          type: "code",
          code: "from sklearn.model_selection import KFold, cross_val_score\n\nmodel = LogisticRegression()\nscores = cross_val_score(model, X_train, y_train, cv=5)  # 5-fold CV\nprint(scores.mean(), scores.std())  # điểm trung bình + độ lệch chuẩn",
          caption: { vi: "cross_val_score tự động lặp K-fold và trả về mảng điểm số cho mỗi fold.", en: "cross_val_score automatically loops K-fold and returns an array of scores per fold." },
        },
        {
          type: "table",
          headers: { vi: ["Loại leakage", "Nguyên nhân", "Cách phòng tránh"], en: ["Leakage type", "Cause", "How to prevent"] },
          rows: [
            { vi: ["Rò rỉ tiền xử lý", "Fit scaler/encoder trên toàn bộ dữ liệu trước khi split", "Chỉ fit trên train, transform cho val/test"], en: ["Preprocessing leakage", "Fitting scaler/encoder on the full dataset before splitting", "Fit only on train, transform val/test"] },
            { vi: ["Rò rỉ thời gian (temporal)", "Dùng dữ liệu tương lai để dự đoán quá khứ (shuffle time-series ngẫu nhiên)", "Split theo thời gian (time-based split), không shuffle"], en: ["Temporal leakage", "Using future data to predict the past (randomly shuffling time-series)", "Time-based split, no shuffling"] },
            { vi: ["Rò rỉ nhóm (group)", "Cùng 1 user/entity xuất hiện cả ở train và test", "GroupKFold — tách theo group/entity"], en: ["Group leakage", "The same user/entity appears in both train and test", "GroupKFold — split by group/entity"] },
          ],
        },
        {
          type: "callout",
          variant: "key",
          vi: "Nguyên tắc vàng: <b>test set phải mô phỏng dữ liệu thực tế mà model sẽ gặp trong production</b>. Nếu test set \"rò rỉ\" thông tin, điểm đánh giá sẽ cao giả tạo và model sẽ thất bại khi deploy thật.",
          en: "Golden rule: <b>the test set must simulate the real data the model will face in production</b>. If it leaks information, evaluation scores will be artificially high and the model will fail once deployed.",
        },
      ],
    },
    {
      id: "bias-variance-regularization",
      title: { vi: "4. Bias-Variance, Overfitting/Underfitting & Regularization", en: "4. Bias-Variance, Overfitting/Underfitting & Regularization" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Bias</b> — sai số do model quá đơn giản, không nắm bắt được pattern thật (underfitting). <b>Variance</b> — sai số do model quá nhạy với nhiễu/biến động của tập train cụ thể (overfitting). Mục tiêu là tìm điểm cân bằng (<b>bias-variance tradeoff</b>).",
          en: "<b>Bias</b> — error from a model too simple to capture the true pattern (underfitting). <b>Variance</b> — error from a model too sensitive to noise/fluctuations in the specific training set (overfitting). The goal is to find the sweet spot (the <b>bias-variance tradeoff</b>).",
        },
        {
          type: "table",
          headers: { vi: ["Dấu hiệu", "Underfitting (high bias)", "Overfitting (high variance)"], en: ["Symptom", "Underfitting (high bias)", "Overfitting (high variance)"] },
          rows: [
            { vi: ["Train error", "Cao", "Thấp"], en: ["Train error", "High", "Low"] },
            { vi: ["Test error", "Cao (~ train error)", "Cao (>> train error)"], en: ["Test error", "High (~ train error)", "High (>> train error)"] },
            { vi: ["Nguyên nhân", "Model quá đơn giản, thiếu feature", "Model quá phức tạp, học cả nhiễu"], en: ["Cause", "Model too simple, missing features", "Model too complex, memorizing noise"] },
            { vi: ["Cách khắc phục", "Model phức tạp hơn, thêm feature", "Regularization, thêm data, giảm độ phức tạp, early stopping"], en: ["Fix", "More complex model, add features", "Regularization, more data, reduce complexity, early stopping"] },
          ],
        },
        {
          type: "prose",
          vi: "<b>Regularization</b> giảm overfitting bằng cách phạt (penalize) trọng số lớn, ép model đơn giản hơn:",
          en: "<b>Regularization</b> reduces overfitting by penalizing large weights, forcing a simpler model:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>L1 (Lasso)</b> — phạt tổng trị tuyệt đối trọng số (<code>Σ|w|</code>), có xu hướng đưa một số trọng số về đúng 0 → <b>feature selection</b> tự động.", en: "<b>L1 (Lasso)</b> — penalizes the sum of absolute weights (<code>Σ|w|</code>), tends to push some weights to exactly 0 → automatic <b>feature selection</b>." },
            { vi: "<b>L2 (Ridge)</b> — phạt tổng bình phương trọng số (<code>Σw²</code>), giảm đều trọng số về gần 0 nhưng hiếm khi bằng 0 → giảm ảnh hưởng của feature nhiễu.", en: "<b>L2 (Ridge)</b> — penalizes the sum of squared weights (<code>Σw²</code>), shrinks weights toward 0 evenly but rarely to exactly 0 → dampens noisy features." },
            { vi: "<b>Early stopping</b> — dừng training khi validation loss ngừng giảm (bắt đầu tăng), tránh model học quá khớp vào train.", en: "<b>Early stopping</b> — halt training once validation loss stops improving (starts rising), preventing the model from over-fitting train data." },
          ],
        },
        {
          type: "code",
          code: "from sklearn.linear_model import Lasso, Ridge\n\n# L1 — alpha càng lớn, phạt càng mạnh, càng nhiều trọng số về 0\nlasso = Lasso(alpha=0.1).fit(X_train, y_train)\n\n# L2 — giảm đều trọng số, ít khi về đúng 0\nridge = Ridge(alpha=1.0).fit(X_train, y_train)",
          caption: { vi: "alpha (lambda) là hyperparameter điều khiển độ mạnh của regularization — tune qua validation set.", en: "alpha (lambda) is the hyperparameter controlling regularization strength — tuned via the validation set." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Cách phát hiện overfitting nhanh nhất trong phỏng vấn: vẽ <b>learning curve</b> (train error vs val error theo epoch/số mẫu). Khoảng cách lớn giữa 2 đường = overfitting; cả 2 đường đều cao = underfitting.",
          en: "The quickest way to spot overfitting in an interview: plot a <b>learning curve</b> (train error vs val error over epochs/samples). A large gap between the two = overfitting; both high = underfitting.",
        },
      ],
    },
    {
      id: "metrics",
      title: { vi: "5. Metrics: Accuracy/Precision/Recall/F1/AUC & Confusion Matrix", en: "5. Metrics: Accuracy/Precision/Recall/F1/AUC & Confusion Matrix" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Confusion matrix</b> là nền tảng của mọi metric phân loại: đếm số dự đoán đúng/sai theo 4 loại — True Positive (TP), True Negative (TN), False Positive (FP), False Negative (FN).",
          en: "The <b>confusion matrix</b> underlies every classification metric: it counts correct/incorrect predictions across 4 categories — True Positive (TP), True Negative (TN), False Positive (FP), False Negative (FN).",
        },
        {
          type: "table",
          headers: { vi: ["Metric", "Công thức", "Khi nào dùng"], en: ["Metric", "Formula", "When to use"] },
          rows: [
            { vi: ["<b>Accuracy</b>", "(TP+TN)/Tổng", "Dữ liệu cân bằng (balanced classes)"], en: ["<b>Accuracy</b>", "(TP+TN)/Total", "Balanced classes"] },
            { vi: ["<b>Precision</b>", "TP/(TP+FP)", "Chi phí False Positive cao — vd lọc email spam (không muốn chặn nhầm email quan trọng)"], en: ["<b>Precision</b>", "TP/(TP+FP)", "False Positives are costly — e.g. spam filter (don't block important email)"] },
            { vi: ["<b>Recall</b>", "TP/(TP+FN)", "Chi phí False Negative cao — vd chẩn đoán ung thư (không muốn bỏ sót ca bệnh)"], en: ["<b>Recall</b>", "TP/(TP+FN)", "False Negatives are costly — e.g. cancer diagnosis (don't miss a real case)"] },
            { vi: ["<b>F1-score</b>", "2·(Precision·Recall)/(Precision+Recall)", "Cần cân bằng Precision & Recall, dữ liệu mất cân bằng (imbalanced)"], en: ["<b>F1-score</b>", "2·(Precision·Recall)/(Precision+Recall)", "Need to balance Precision & Recall, imbalanced data"] },
            { vi: ["<b>AUC-ROC</b>", "Diện tích dưới đường ROC (TPR vs FPR)", "So sánh model độc lập với threshold, dữ liệu imbalanced vừa phải"], en: ["<b>AUC-ROC</b>", "Area under the ROC curve (TPR vs FPR)", "Compare models independent of threshold, moderately imbalanced data"] },
          ],
        },
        {
          type: "code",
          code: "from sklearn.metrics import (\n    accuracy_score, precision_score, recall_score, f1_score,\n    confusion_matrix, roc_auc_score,\n)\n\nprint(confusion_matrix(y_test, preds))\n# [[TN FP]\n#  [FN TP]]\n\nprint(\"Precision:\", precision_score(y_test, preds))\nprint(\"Recall:\", recall_score(y_test, preds))\nprint(\"F1:\", f1_score(y_test, preds))\nprint(\"AUC:\", roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]))",
          caption: { vi: "AUC cần predict_proba (xác suất), không phải predict (nhãn cứng), vì nó đánh giá qua nhiều threshold.", en: "AUC needs predict_proba (probabilities), not predict (hard labels), since it evaluates across many thresholds." },
        },
        {
          type: "callout",
          variant: "key",
          vi: "Với dữ liệu <b>mất cân bằng</b> (vd 99% class A, 1% class B), <b>accuracy gây hiểu lầm</b> — model đoán bừa toàn class A vẫn đạt accuracy 99%. Luôn dùng Precision/Recall/F1/AUC cho bài toán imbalanced.",
          en: "With <b>imbalanced</b> data (e.g. 99% class A, 1% class B), <b>accuracy is misleading</b> — a model that always predicts class A still scores 99% accuracy. Always use Precision/Recall/F1/AUC for imbalanced problems.",
        },
      ],
    },
    {
      id: "linear-logistic-regression",
      title: { vi: "6. Trực giác Linear & Logistic Regression", en: "6. Linear & Logistic Regression Intuition" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Linear Regression</b> — mô hình cơ bản nhất, dự đoán giá trị liên tục bằng tổ hợp tuyến tính của feature: <code>y = w1x1 + w2x2 + ... + b</code>. Học tham số bằng cách tối thiểu hóa <b>Mean Squared Error (MSE)</b>, thường qua Gradient Descent.",
          en: "<b>Linear Regression</b> — the most basic model, predicts a continuous value as a linear combination of features: <code>y = w1x1 + w2x2 + ... + b</code>. Parameters are learned by minimizing <b>Mean Squared Error (MSE)</b>, typically via Gradient Descent.",
        },
        {
          type: "prose",
          vi: "<b>Logistic Regression</b> — dùng cho phân loại (dù tên có \"regression\"). Áp hàm <b>sigmoid</b> lên tổ hợp tuyến tính để nén output về khoảng (0, 1), diễn giải như xác suất thuộc lớp dương. Học bằng cách tối thiểu hóa <b>log loss / cross-entropy</b>.",
          en: "<b>Logistic Regression</b> — used for classification (despite the name \"regression\"). It applies a <b>sigmoid</b> function to the linear combination to squash the output into (0, 1), interpreted as the probability of the positive class. Learned by minimizing <b>log loss / cross-entropy</b>.",
        },
        {
          type: "code",
          code: "# Linear Regression — dự đoán số liên tục\nfrom sklearn.linear_model import LinearRegression\nlr = LinearRegression().fit(X_train, y_train)   # tối thiểu MSE\npred_price = lr.predict(X_test)                  # ví dụ: giá nhà\n\n# Logistic Regression — dự đoán xác suất/nhãn nhị phân\nfrom sklearn.linear_model import LogisticRegression\nclf = LogisticRegression().fit(X_train, y_train)  # tối thiểu log loss\nproba = clf.predict_proba(X_test)[:, 1]           # P(class = 1), sigmoid output\nlabel = clf.predict(X_test)                        # threshold mặc định 0.5",
          caption: { vi: "Linear Regression tối ưu MSE cho output liên tục; Logistic Regression tối ưu log loss cho xác suất.", en: "Linear Regression optimizes MSE for continuous output; Logistic Regression optimizes log loss for probabilities." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "Sigmoid: <code>σ(z) = 1/(1+e^(-z))</code>. Khi <code>z</code> rất lớn dương → gần 1; rất âm → gần 0; z=0 → 0.5. Đây là lý do threshold mặc định để phân loại là 0.5.",
          en: "Sigmoid: <code>σ(z) = 1/(1+e^(-z))</code>. When <code>z</code> is very positive → close to 1; very negative → close to 0; z=0 → 0.5. This is why the default classification threshold is 0.5.",
        },
      ],
    },
    {
      id: "trees-ensembles",
      title: { vi: "7. Decision Tree, Random Forest, Gradient Boosting", en: "7. Decision Tree, Random Forest, Gradient Boosting" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Decision Tree</b> chia dữ liệu đệ quy bằng các câu hỏi if/else trên feature (vd \"tuổi > 30?\") để tối ưu độ \"thuần\" (purity, đo bằng Gini/entropy) của mỗi nhánh. Dễ diễn giải nhưng dễ overfit nếu để cây quá sâu.",
          en: "A <b>Decision Tree</b> recursively splits data using if/else questions on features (e.g. \"age > 30?\") to optimize node \"purity\" (measured by Gini/entropy). Easy to interpret but prone to overfitting if grown too deep.",
        },
        {
          type: "table",
          headers: { vi: ["Model", "Ý tưởng", "Ưu điểm", "Nhược điểm"], en: ["Model", "Idea", "Pros", "Cons"] },
          rows: [
            { vi: ["<b>Decision Tree</b>", "1 cây chia nhánh theo feature", "Dễ diễn giải, không cần scale feature", "Dễ overfit, không ổn định (biến động cao với data)"], en: ["<b>Decision Tree</b>", "A single tree splitting on features", "Interpretable, no feature scaling needed", "Prone to overfitting, high variance"] },
            { vi: ["<b>Random Forest</b>", "<b>Bagging</b>: nhiều cây độc lập trên bootstrap samples + random feature subset, lấy trung bình/vote", "Giảm variance mạnh, ổn định, ít cần tune", "Kém diễn giải hơn 1 cây, chậm hơn khi dự đoán"], en: ["<b>Random Forest</b>", "<b>Bagging</b>: many independent trees on bootstrap samples + random feature subsets, averaged/voted", "Strongly reduces variance, stable, needs little tuning", "Less interpretable than one tree, slower inference"] },
            { vi: ["<b>Gradient Boosting</b> (XGBoost/LightGBM)", "<b>Boosting</b>: xây cây tuần tự, mỗi cây sửa lỗi (residual) của cây trước", "Độ chính xác cao nhất trên dữ liệu dạng bảng (tabular)", "Dễ overfit nếu không tune, train tuần tự (chậm hơn RF để song song hóa)"], en: ["<b>Gradient Boosting</b> (XGBoost/LightGBM)", "<b>Boosting</b>: builds trees sequentially, each correcting the previous tree's residual errors", "Best accuracy on tabular data in practice", "Prone to overfitting without tuning, sequential training (harder to parallelize than RF)"] },
          ],
        },
        {
          type: "code",
          code: "from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier\n\nrf = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42)\nrf.fit(X_train, y_train)\nprint(rf.feature_importances_)   # feature nào ảnh hưởng nhiều nhất\n\ngb = GradientBoostingClassifier(n_estimators=200, learning_rate=0.05)\ngb.fit(X_train, y_train)",
          caption: { vi: "Bagging (Random Forest) giảm variance bằng cách trung bình hóa; Boosting giảm bias bằng cách học tuần tự từ lỗi.", en: "Bagging (Random Forest) reduces variance by averaging; Boosting reduces bias by learning sequentially from errors." },
        },
        {
          type: "callout",
          variant: "key",
          vi: "Ghi nhớ nhanh: <b>Bagging = song song, giảm variance</b> (Random Forest). <b>Boosting = tuần tự, giảm bias</b> (Gradient Boosting/XGBoost). Với dữ liệu dạng bảng, Gradient Boosting thường thắng deep learning về accuracy.",
          en: "Quick memory hook: <b>Bagging = parallel, reduces variance</b> (Random Forest). <b>Boosting = sequential, reduces bias</b> (Gradient Boosting/XGBoost). For tabular data, Gradient Boosting often beats deep learning on accuracy.",
        },
      ],
    },
    {
      id: "unsupervised-kmeans-pca",
      title: { vi: "8. Unsupervised: K-Means & PCA", en: "8. Unsupervised: K-Means & PCA" },
      blocks: [
        {
          type: "prose",
          vi: "<b>K-Means</b> — thuật toán <b>phân cụm (clustering)</b> phổ biến nhất: chia dữ liệu thành K cụm sao cho các điểm trong cùng cụm gần nhau nhất (theo khoảng cách tới centroid).",
          en: "<b>K-Means</b> — the most popular <b>clustering</b> algorithm: partitions data into K clusters so points within a cluster are as close as possible (by distance to the centroid).",
        },
        {
          type: "list",
          ordered: true,
          items: [
            { vi: "Chọn ngẫu nhiên K centroid ban đầu.", en: "Randomly initialize K centroids." },
            { vi: "Gán mỗi điểm dữ liệu vào centroid gần nhất.", en: "Assign each data point to its nearest centroid." },
            { vi: "Cập nhật centroid = trung bình các điểm trong cụm.", en: "Update each centroid = mean of points in its cluster." },
            { vi: "Lặp lại bước 2-3 đến khi centroid không đổi (hội tụ).", en: "Repeat steps 2-3 until centroids stop changing (convergence)." },
          ],
        },
        {
          type: "prose",
          vi: "<b>PCA (Principal Component Analysis)</b> — kỹ thuật <b>giảm chiều dữ liệu (dimensionality reduction)</b>: tìm các trục (principal components) mà dữ liệu có phương sai (variance) lớn nhất, chiếu dữ liệu lên số chiều thấp hơn mà vẫn giữ được phần lớn thông tin.",
          en: "<b>PCA (Principal Component Analysis)</b> — a <b>dimensionality reduction</b> technique: finds the axes (principal components) of maximum variance in the data and projects it onto fewer dimensions while preserving most of the information.",
        },
        {
          type: "code",
          code: "from sklearn.cluster import KMeans\nfrom sklearn.decomposition import PCA\n\n# K-Means: cần chọn K (vd bằng Elbow method)\nkm = KMeans(n_clusters=3, random_state=42, n_init=10)\nclusters = km.fit_predict(X)     # nhãn cụm cho mỗi điểm\n\n# PCA: giảm từ N chiều xuống 2 chiều để visualize\npca = PCA(n_components=2)\nX_reduced = pca.fit_transform(X_scaled)   # nên scale trước khi PCA\nprint(pca.explained_variance_ratio_)       # % variance mỗi component giữ lại",
          caption: { vi: "K-Means cần scale feature (khoảng cách nhạy với đơn vị đo); PCA cũng vậy vì dựa trên phương sai.", en: "K-Means requires feature scaling (distance is unit-sensitive); PCA does too since it's variance-based." },
        },
        {
          type: "callout",
          variant: "tip",
          vi: "<b>Elbow method</b> chọn K cho K-Means: vẽ đồ thị inertia (tổng khoảng cách bình phương trong cụm) theo K, chọn điểm \"khuỷu tay\" nơi đường cong bắt đầu phẳng lại — thêm cụm không còn cải thiện nhiều.",
          en: "The <b>elbow method</b> picks K for K-Means: plot inertia (sum of squared in-cluster distances) against K and pick the \"elbow\" point where the curve flattens — adding more clusters stops helping much.",
        },
      ],
    },
    {
      id: "feature-engineering-imbalance",
      title: { vi: "9. Feature Engineering & Class Imbalance", en: "9. Feature Engineering & Class Imbalance" },
      blocks: [
        {
          type: "prose",
          vi: "<b>Feature engineering</b> thường quyết định hiệu năng model nhiều hơn cả việc chọn thuật toán. Các kỹ thuật phổ biến:",
          en: "<b>Feature engineering</b> often determines model performance more than algorithm choice. Common techniques:",
        },
        {
          type: "table",
          headers: { vi: ["Kỹ thuật", "Áp dụng cho", "Ví dụ"], en: ["Technique", "Applies to", "Example"] },
          rows: [
            { vi: ["<b>One-hot encoding</b>", "Categorical không có thứ tự", "màu = [đỏ, xanh, vàng] → 3 cột nhị phân"], en: ["<b>One-hot encoding</b>", "Unordered categoricals", "color = [red, blue, yellow] → 3 binary columns"] },
            { vi: ["<b>Label/Ordinal encoding</b>", "Categorical có thứ tự", "hạng = [thấp, trung, cao] → 0, 1, 2"], en: ["<b>Label/Ordinal encoding</b>", "Ordered categoricals", "level = [low, medium, high] → 0, 1, 2"] },
            { vi: ["<b>Scaling</b> (Standard/MinMax)", "Feature số, đặc biệt cho model dựa trên khoảng cách/gradient", "chuẩn hóa tuổi, thu nhập về cùng thang đo"], en: ["<b>Scaling</b> (Standard/MinMax)", "Numeric features, especially distance/gradient-based models", "normalize age, income to a common scale"] },
            { vi: ["<b>Binning/Discretization</b>", "Feature số cần đơn giản hóa quan hệ phi tuyến", "tuổi → nhóm tuổi (0-18, 19-35, ...)"], en: ["<b>Binning/Discretization</b>", "Numeric features needing simplified non-linear relations", "age → age groups (0-18, 19-35, ...)"] },
            { vi: ["<b>Tạo feature mới</b>", "Kết hợp domain knowledge", "ngày đặt hàng → thứ trong tuần, cuối tuần?"], en: ["<b>New feature creation</b>", "Combining domain knowledge", "order date → day of week, is weekend?"] },
          ],
        },
        {
          type: "prose",
          vi: "<b>Class imbalance</b> (vd gian lận thẻ tín dụng: 0.1% positive) khiến model thiên vị lớp đa số. Các hướng xử lý:",
          en: "<b>Class imbalance</b> (e.g. credit-card fraud: 0.1% positive) biases models toward the majority class. Ways to address it:",
        },
        {
          type: "list",
          ordered: false,
          items: [
            { vi: "<b>Resampling</b> — oversampling lớp thiểu số (vd <b>SMOTE</b> sinh mẫu tổng hợp) hoặc undersampling lớp đa số.", en: "<b>Resampling</b> — oversample the minority class (e.g. <b>SMOTE</b> synthesizes new samples) or undersample the majority class." },
            { vi: "<b>Class weights</b> — phạt nặng hơn khi model dự đoán sai lớp thiểu số (vd <code>class_weight=\"balanced\"</code>).", en: "<b>Class weights</b> — penalize misclassifying the minority class more heavily (e.g. <code>class_weight=\"balanced\"</code>)." },
            { vi: "<b>Đổi metric</b> — dùng Precision/Recall/F1/AUC-PR thay vì accuracy (xem Section 5).", en: "<b>Change the metric</b> — use Precision/Recall/F1/AUC-PR instead of accuracy (see Section 5)." },
            { vi: "<b>Threshold tuning</b> — điều chỉnh ngưỡng phân loại (không nhất thiết 0.5) để cân bằng precision/recall theo bài toán.", en: "<b>Threshold tuning</b> — adjust the classification threshold (not necessarily 0.5) to balance precision/recall for the problem." },
          ],
        },
        {
          type: "code",
          code: "from sklearn.linear_model import LogisticRegression\n\n# Cách đơn giản nhất: class_weight tự động cân bằng theo tần suất lớp\nclf = LogisticRegression(class_weight=\"balanced\")\nclf.fit(X_train, y_train)\n\n# SMOTE — sinh mẫu tổng hợp cho lớp thiểu số (thư viện imbalanced-learn)\n# from imblearn.over_sampling import SMOTE\n# X_res, y_res = SMOTE().fit_resample(X_train, y_train)",
          caption: { vi: "class_weight=\"balanced\" là cách nhanh nhất để thử trước khi resampling phức tạp hơn.", en: "class_weight=\"balanced\" is the quickest thing to try before more elaborate resampling." },
        },
        {
          type: "callout",
          variant: "soundbite",
          vi: "Chốt phỏng vấn: <b>\"ML không phải chọn thuật toán 'tốt nhất' — mà là chu trình split đúng, chọn metric đúng với bài toán, và hiểu bias-variance tradeoff để biết khi nào cần thêm data, feature, hay regularization.\"</b>",
          en: "Interview soundbite: <b>\"ML isn't about picking the 'best' algorithm — it's a disciplined loop of correct splitting, choosing the right metric for the problem, and understanding the bias-variance tradeoff to know when you need more data, better features, or regularization.\"</b>",
        },
      ],
    },
  ],
  flashcards: [
    {
      front: { vi: "Khác biệt chính giữa Supervised và Unsupervised Learning?", en: "What's the key difference between Supervised and Unsupervised Learning?" },
      back: { vi: "Supervised học từ dữ liệu <b>có nhãn</b> (input, output) để dự đoán nhãn mới. Unsupervised học từ dữ liệu <b>không nhãn</b> để tìm cấu trúc/pattern ẩn (vd clustering).", en: "Supervised learns from <b>labeled</b> data (input, output) to predict new labels. Unsupervised learns from <b>unlabeled</b> data to discover hidden structure/patterns (e.g. clustering)." },
    },
    {
      front: { vi: "Tại sao phải chia dữ liệu thành train/validation/test thay vì chỉ train/test?", en: "Why split data into train/validation/test instead of just train/test?" },
      back: { vi: "Validation set dùng để tune hyperparameter và chọn model mà không \"đụng\" vào test set. Nếu tune trực tiếp trên test set, kết quả đánh giá cuối cùng sẽ bị thiên lệch (không còn khách quan).", en: "The validation set is used to tune hyperparameters and select models without touching the test set. If you tune directly on the test set, the final evaluation becomes biased (no longer objective)." },
    },
    {
      front: { vi: "Data leakage là gì? Cho một ví dụ.", en: "What is data leakage? Give an example." },
      back: { vi: "Rò rỉ thông tin từ tập test/tương lai vào quá trình train, khiến đánh giá lạc quan giả tạo. Ví dụ: fit StandardScaler trên toàn bộ dữ liệu trước khi split train/test.", en: "Information from the test set/future leaking into training, causing artificially optimistic evaluation. Example: fitting a StandardScaler on the entire dataset before the train/test split." },
    },
    {
      front: { vi: "Bias cao và Variance cao khác nhau thế nào về biểu hiện?", en: "How do high bias and high variance differ in symptoms?" },
      back: { vi: "High bias (underfit): train error cao và test error cao tương đương. High variance (overfit): train error thấp nhưng test error cao hơn nhiều.", en: "High bias (underfit): high train error and similarly high test error. High variance (overfit): low train error but much higher test error." },
    },
    {
      front: { vi: "L1 và L2 regularization khác nhau ở điểm nào?", en: "How do L1 and L2 regularization differ?" },
      back: { vi: "L1 (Lasso) phạt <code>Σ|w|</code>, có thể đưa trọng số về đúng 0 → feature selection tự động. L2 (Ridge) phạt <code>Σw²</code>, giảm đều trọng số nhưng hiếm khi về 0.", en: "L1 (Lasso) penalizes <code>Σ|w|</code>, can push weights to exactly 0 → automatic feature selection. L2 (Ridge) penalizes <code>Σw²</code>, shrinks weights evenly but rarely to 0." },
    },
    {
      front: { vi: "Khi nào nên ưu tiên Recall hơn Precision?", en: "When should you prioritize Recall over Precision?" },
      back: { vi: "Khi chi phí bỏ sót case dương (False Negative) rất cao, vd chẩn đoán bệnh nặng — thà báo động nhầm (FP) còn hơn bỏ sót ca bệnh thật (FN).", en: "When the cost of missing a positive case (False Negative) is very high, e.g. diagnosing a serious illness — a false alarm (FP) is preferable to missing a real case (FN)." },
    },
    {
      front: { vi: "Tại sao accuracy có thể gây hiểu lầm với dữ liệu mất cân bằng?", en: "Why can accuracy be misleading on imbalanced data?" },
      back: { vi: "Với 99% class A / 1% class B, model đoán bừa toàn class A vẫn đạt 99% accuracy nhưng vô dụng thực tế. Nên dùng Precision/Recall/F1/AUC thay vì accuracy.", en: "With 99% class A / 1% class B, a model that always predicts class A scores 99% accuracy yet is practically useless. Use Precision/Recall/F1/AUC instead of accuracy." },
    },
    {
      front: { vi: "Logistic Regression khác Linear Regression ở điểm nào?", en: "How does Logistic Regression differ from Linear Regression?" },
      back: { vi: "Linear Regression dự đoán giá trị liên tục, tối thiểu MSE. Logistic Regression dùng sigmoid để dự đoán xác suất (0-1) cho phân loại, tối thiểu log loss.", en: "Linear Regression predicts a continuous value, minimizing MSE. Logistic Regression uses sigmoid to predict a probability (0-1) for classification, minimizing log loss." },
    },
    {
      front: { vi: "Bagging (Random Forest) và Boosting (Gradient Boosting) khác nhau thế nào?", en: "How do Bagging (Random Forest) and Boosting (Gradient Boosting) differ?" },
      back: { vi: "Bagging huấn luyện nhiều cây <b>độc lập/song song</b> trên bootstrap samples rồi trung bình hóa → giảm variance. Boosting huấn luyện cây <b>tuần tự</b>, mỗi cây sửa lỗi cây trước → giảm bias.", en: "Bagging trains many trees <b>independently/in parallel</b> on bootstrap samples and averages them → reduces variance. Boosting trains trees <b>sequentially</b>, each correcting the previous one's errors → reduces bias." },
    },
    {
      front: { vi: "PCA dùng để làm gì và cần lưu ý gì trước khi áp dụng?", en: "What is PCA used for and what should you do before applying it?" },
      back: { vi: "PCA giảm số chiều dữ liệu bằng cách chiếu lên các trục có variance lớn nhất. Cần <b>scale feature</b> trước vì PCA dựa trên phương sai — feature có thang đo lớn sẽ chi phối kết quả nếu không scale.", en: "PCA reduces dimensionality by projecting data onto axes of maximum variance. You must <b>scale features first</b> since PCA is variance-based — a large-scale feature would dominate the result otherwise." },
    },
    {
      front: { vi: "K-Means hoạt động qua các bước nào?", en: "What steps does K-Means go through?" },
      back: { vi: "1) Khởi tạo K centroid ngẫu nhiên. 2) Gán mỗi điểm vào centroid gần nhất. 3) Cập nhật centroid = trung bình điểm trong cụm. 4) Lặp 2-3 đến khi hội tụ.", en: "1) Initialize K random centroids. 2) Assign each point to nearest centroid. 3) Update centroid = mean of cluster points. 4) Repeat 2-3 until convergence." },
    },
    {
      front: { vi: "Kể 2 cách xử lý class imbalance ngoài việc đổi metric.", en: "Name 2 ways to handle class imbalance besides changing the metric." },
      back: { vi: "1) Resampling (oversampling minority bằng SMOTE, hoặc undersampling majority). 2) Class weights (vd <code>class_weight=\"balanced\"</code>) để phạt nặng hơn khi sai lớp thiểu số.", en: "1) Resampling (oversample minority with SMOTE, or undersample majority). 2) Class weights (e.g. <code>class_weight=\"balanced\"</code>) to penalize minority-class errors more heavily." },
    },
  ],
  quiz: [
    {
      q: { vi: "Reinforcement Learning khác Supervised Learning ở điểm cốt lõi nào?", en: "What's the core difference between Reinforcement Learning and Supervised Learning?" },
      options: [
        { vi: "RL không cần dữ liệu số", en: "RL doesn't need numeric data" },
        { vi: "RL học qua tương tác với môi trường và reward, không có nhãn cố định sẵn", en: "RL learns via interaction with an environment and rewards, without fixed pre-given labels" },
        { vi: "RL chỉ dùng cho bài toán regression", en: "RL only applies to regression problems" },
        { vi: "RL không cần thuật toán tối ưu hóa", en: "RL needs no optimization algorithm" },
      ],
      answer: 1,
      explain: { vi: "RL học chính sách (policy) tối đa hóa reward tích lũy thông qua tương tác thử-sai với môi trường, khác với supervised học từ cặp (input, label) cố định có sẵn.", en: "RL learns a policy maximizing cumulative reward via trial-and-error interaction with an environment, unlike supervised learning which learns from fixed pre-given (input, label) pairs." },
    },
    {
      q: { vi: "Tại sao phải fit StandardScaler chỉ trên tập train, không phải toàn bộ dữ liệu?", en: "Why should StandardScaler be fit only on the train set, not the whole dataset?" },
      options: [
        { vi: "Vì fit trên toàn bộ dữ liệu chậm hơn", en: "Because fitting on the full dataset is slower" },
        { vi: "Để tránh data leakage — thông tin từ test set rò rỉ vào quá trình train", en: "To avoid data leakage — test set information leaking into training" },
        { vi: "Vì StandardScaler chỉ hoạt động với tập nhỏ", en: "Because StandardScaler only works on small sets" },
        { vi: "Không có sự khác biệt nào cả", en: "There is no difference at all" },
      ],
      answer: 1,
      explain: { vi: "Nếu fit trên toàn bộ dữ liệu (bao gồm test) trước khi split, thống kê (mean/std) của test set sẽ ảnh hưởng đến scaler, làm rò rỉ thông tin và đánh giá bị lạc quan giả tạo.", en: "Fitting on the full dataset (including test) before splitting lets test-set statistics (mean/std) influence the scaler, leaking information and making evaluation artificially optimistic." },
    },
    {
      q: { vi: "Model có train error thấp nhưng test error cao hơn nhiều đang gặp vấn đề gì?", en: "A model with low train error but much higher test error is suffering from what?" },
      options: [
        { vi: "Underfitting (high bias)", en: "Underfitting (high bias)" },
        { vi: "Overfitting (high variance)", en: "Overfitting (high variance)" },
        { vi: "Data leakage bắt buộc xảy ra", en: "Data leakage must be occurring" },
        { vi: "Model đang hoạt động lý tưởng", en: "The model is performing ideally" },
      ],
      answer: 1,
      explain: { vi: "Khoảng cách lớn giữa train error (thấp) và test error (cao) là dấu hiệu kinh điển của overfitting — model học cả nhiễu của tập train, không tổng quát hóa tốt.", en: "A large gap between low train error and high test error is the classic signature of overfitting — the model has memorized noise in the train set and doesn't generalize well." },
    },
    {
      q: { vi: "L1 regularization (Lasso) có đặc điểm nào nổi bật so với L2?", en: "What distinguishes L1 regularization (Lasso) from L2?" },
      options: [
        { vi: "L1 luôn cho accuracy cao hơn L2", en: "L1 always yields higher accuracy than L2" },
        { vi: "L1 có thể đưa trọng số về đúng 0, thực hiện feature selection tự động", en: "L1 can push weights to exactly 0, performing automatic feature selection" },
        { vi: "L1 không thể dùng với Linear Regression", en: "L1 cannot be used with Linear Regression" },
        { vi: "L1 chỉ áp dụng cho bài toán phân loại", en: "L1 only applies to classification problems" },
      ],
      answer: 1,
      explain: { vi: "L1 phạt tổng trị tuyệt đối trọng số, có xu hướng đưa một số trọng số về đúng 0, loại bỏ hiệu quả các feature không quan trọng — L2 chỉ giảm đều trọng số về gần 0.", en: "L1 penalizes the sum of absolute weights, tending to zero out some weights entirely, effectively removing unimportant features — L2 only shrinks weights toward (but rarely to) 0." },
    },
    {
      q: { vi: "Trong bài toán phát hiện gian lận thẻ tín dụng (0.1% positive), metric nào KHÔNG phù hợp để đánh giá?", en: "For credit-card fraud detection (0.1% positive), which metric is NOT suitable for evaluation?" },
      options: [
        { vi: "Precision", en: "Precision" },
        { vi: "Recall", en: "Recall" },
        { vi: "Accuracy", en: "Accuracy" },
        { vi: "F1-score", en: "F1-score" },
      ],
      answer: 2,
      explain: { vi: "Với dữ liệu mất cân bằng cực đoan, model đoán bừa \"không gian lận\" cho mọi giao dịch vẫn đạt accuracy 99.9% — accuracy hoàn toàn không phản ánh khả năng phát hiện thật.", en: "With extreme imbalance, a model that always predicts \"not fraud\" still gets 99.9% accuracy — accuracy completely fails to reflect real detection ability." },
    },
    {
      q: { vi: "Trong Logistic Regression, hàm sigmoid dùng để làm gì?", en: "In Logistic Regression, what does the sigmoid function do?" },
      options: [
        { vi: "Chuẩn hóa feature đầu vào", en: "Normalize the input features" },
        { vi: "Nén tổ hợp tuyến tính về khoảng (0,1) để diễn giải như xác suất", en: "Squash the linear combination into (0,1) so it can be interpreted as a probability" },
        { vi: "Loại bỏ outlier trong dữ liệu", en: "Remove outliers from the data" },
        { vi: "Tính đạo hàm cho Gradient Descent", en: "Compute derivatives for Gradient Descent" },
      ],
      answer: 1,
      explain: { vi: "Sigmoid <code>σ(z)=1/(1+e^-z)</code> nén giá trị z (có thể là bất kỳ số thực nào) về khoảng (0,1), cho phép diễn giải output như xác suất thuộc lớp dương.", en: "Sigmoid <code>σ(z)=1/(1+e^-z)</code> squashes any real-valued z into (0,1), allowing the output to be interpreted as the probability of the positive class." },
    },
    {
      q: { vi: "Random Forest giảm overfitting so với 1 Decision Tree đơn lẻ bằng cách nào?", en: "How does Random Forest reduce overfitting compared to a single Decision Tree?" },
      options: [
        { vi: "Dùng cây sâu hơn để học chi tiết hơn", en: "Using a deeper tree to learn more detail" },
        { vi: "Kết hợp nhiều cây độc lập (bagging) và lấy trung bình/vote, giảm variance", en: "Combining many independent trees (bagging) and averaging/voting, reducing variance" },
        { vi: "Loại bỏ hoàn toàn regularization", en: "Completely removing regularization" },
        { vi: "Chỉ dùng một phần rất nhỏ dữ liệu train", en: "Using only a tiny fraction of the train data" },
      ],
      answer: 1,
      explain: { vi: "Mỗi cây trong Random Forest được train trên bootstrap sample + random feature subset khác nhau; kết hợp (trung bình/vote) nhiều cây độc lập giúp giảm variance đáng kể so với 1 cây đơn.", en: "Each tree in a Random Forest trains on a different bootstrap sample + random feature subset; combining (averaging/voting) many independent trees substantially reduces variance versus a single tree." },
    },
    {
      q: { vi: "Gradient Boosting (vd XGBoost) xây dựng các cây theo cách nào?", en: "How does Gradient Boosting (e.g. XGBoost) build its trees?" },
      options: [
        { vi: "Song song, độc lập với nhau như Random Forest", en: "In parallel, independently, like Random Forest" },
        { vi: "Tuần tự, mỗi cây mới sửa lỗi (residual) của các cây trước", en: "Sequentially, each new tree correcting the residual errors of previous trees" },
        { vi: "Chỉ xây đúng 1 cây duy nhất", en: "Building exactly one single tree" },
        { vi: "Ngẫu nhiên không theo quy luật nào", en: "Randomly, with no pattern" },
      ],
      answer: 1,
      explain: { vi: "Boosting xây cây tuần tự — mỗi cây mới học để sửa phần lỗi (residual) mà các cây trước đó chưa giải quyết được, giúp giảm bias qua từng vòng lặp.", en: "Boosting builds trees sequentially — each new tree learns to correct the residual errors the previous trees didn't resolve, reducing bias with each iteration." },
    },
    {
      q: { vi: "Tại sao cần scale feature trước khi chạy K-Means hoặc PCA?", en: "Why scale features before running K-Means or PCA?" },
      options: [
        { vi: "Vì cả hai chỉ chấp nhận giá trị trong khoảng (0,1)", en: "Because both only accept values in the range (0,1)" },
        { vi: "Vì cả hai dựa trên khoảng cách/phương sai, feature có thang đo lớn sẽ chi phối kết quả nếu không scale", en: "Because both rely on distance/variance, so a large-scale feature would dominate the result if not scaled" },
        { vi: "Vì scale giúp tăng tốc độ tính toán duy nhất", en: "Because scaling only helps computation speed" },
        { vi: "K-Means và PCA không cần scale", en: "K-Means and PCA don't need scaling" },
      ],
      answer: 1,
      explain: { vi: "K-Means dùng khoảng cách Euclidean, PCA dựa trên phương sai — cả hai đều nhạy với thang đo. Feature có giá trị lớn (vd thu nhập hàng triệu) sẽ áp đảo feature nhỏ (vd tuổi) nếu không scale về cùng thang đo.", en: "K-Means uses Euclidean distance, PCA is variance-based — both are scale-sensitive. A large-magnitude feature (e.g. income in millions) would dominate a small one (e.g. age) if not scaled to a common range." },
    },
    {
      q: { vi: "SMOTE là kỹ thuật dùng để giải quyết vấn đề gì?", en: "What problem does the SMOTE technique address?" },
      options: [
        { vi: "Giảm chiều dữ liệu", en: "Dimensionality reduction" },
        { vi: "Class imbalance — sinh mẫu tổng hợp cho lớp thiểu số", en: "Class imbalance — synthesizing samples for the minority class" },
        { vi: "Tăng tốc training model", en: "Speeding up model training" },
        { vi: "Chuẩn hóa feature số", en: "Normalizing numeric features" },
      ],
      answer: 1,
      explain: { vi: "SMOTE (Synthetic Minority Oversampling Technique) sinh ra các mẫu tổng hợp mới cho lớp thiểu số bằng cách nội suy giữa các điểm lân cận, giúp cân bằng dữ liệu train mà không chỉ đơn giản lặp lại mẫu cũ.", en: "SMOTE (Synthetic Minority Oversampling Technique) generates new synthetic minority-class samples by interpolating between neighboring points, balancing the training data without simply duplicating existing samples." },
    },
  ],
});
