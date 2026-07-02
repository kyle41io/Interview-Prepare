/* Roles, levels & learning tracks (Phase A) */
PREP.roles = [
  { id: "swe", icon: "fa-solid fa-code", title: { vi: "Software Engineer", en: "Software Engineer" }, levels: ["fresher", "junior", "senior"] },
  { id: "devops", icon: "fa-solid fa-server", title: { vi: "DevOps", en: "DevOps" }, levels: [] },
  { id: "ai-engineer", icon: "fa-solid fa-robot", title: { vi: "AI Engineer", en: "AI Engineer" }, levels: [] },
];
PREP.levels = {
  fresher: { vi: "Fresher", en: "Fresher" },
  junior: { vi: "Junior", en: "Junior" },
  senior: { vi: "Senior", en: "Senior" },
};
[
  { id: "swe-fresher", role: "swe", level: "fresher",
    title: { vi: "SWE · Fresher", en: "SWE · Fresher" },
    blurb: { vi: "Nền tảng cốt lõi cho vòng phỏng vấn đầu tiên.", en: "Core fundamentals for your first interviews." },
    items: ["dsa", "oop", "databases", "rest-grpc", "design-patterns", "os", "networking", "behavioral"] },
  { id: "swe-junior", role: "swe", level: "junior",
    title: { vi: "SWE · Junior", en: "SWE · Junior" },
    blurb: { vi: "Mở rộng sang framework và thiết kế hệ thống cơ bản.", en: "Add frameworks and intro system design." },
    items: ["dsa", "oop", "databases", "rest-grpc", "design-patterns", "react", "redux", "typescript", "nodejs", "os", "networking", "fe-security", "system-design", "behavioral"] },
  { id: "swe-senior", role: "swe", level: "senior",
    title: { vi: "SWE · Senior", en: "SWE · Senior" },
    blurb: { vi: "Tập trung kiến trúc, hệ thống lớn và dự án thực tế.", en: "Architecture-heavy, large systems and real projects." },
    items: ["system-design", "microservices", "design-patterns", "databases", "db-internals", "nodejs", "os", "networking", "logging", "docker-k8s", "aws", "owork", "behavioral"] },
  { id: "devops", role: "devops", level: "",
    title: { vi: "DevOps", en: "DevOps" },
    blurb: { vi: "Container, CI/CD, cloud và vận hành hệ thống.", en: "Containers, CI/CD, cloud and operations." },
    items: ["docker-k8s", "cicd", "aws", "networking", "logging", "system-design", "databases", "behavioral"] },
  { id: "ai-engineer", role: "ai-engineer", level: "",
    title: { vi: "AI Engineer", en: "AI Engineer" },
    blurb: { vi: "Nền tảng AI thực chiến: Python, ML và Deep Learning/NLP — sẽ mở rộng thêm.", en: "Practical AI foundations: Python, ML and Deep Learning/NLP — more coming." },
    items: ["python-ai", "ml-foundations", "dl-nlp", "system-design", "behavioral"] },
].forEach((trk) => PREP.registerTrack(trk));
