/* Roles, levels & learning tracks (Phase A) */
(function () {
  "use strict";

  var roles = [
    { id: "swe", icon: "fa-solid fa-code", title: { vi: "Software Engineer", en: "Software Engineer" }, levels: ["fresher", "junior", "senior"] },
    { id: "devops", icon: "fa-solid fa-server", title: { vi: "DevOps", en: "DevOps" }, levels: [] },
    { id: "ai-engineer", icon: "fa-solid fa-robot", title: { vi: "AI Engineer", en: "AI Engineer" }, levels: [] },
    { id: "frontend", icon: "fa-solid fa-window-maximize", title: { vi: "Frontend Engineer", en: "Frontend Engineer" }, levels: [] },
    { id: "backend", icon: "fa-solid fa-layer-group", title: { vi: "Backend Engineer", en: "Backend Engineer" }, levels: [] },
  ];

  var levels = {
    fresher: { vi: "Fresher", en: "Fresher" },
    junior: { vi: "Junior", en: "Junior" },
    senior: { vi: "Senior", en: "Senior" },
  };

  var tracks = [
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
      items: ["python-ai", "ml-foundations", "dl-nlp", "llms", "system-design", "behavioral"] },
    { id: "frontend", role: "frontend", level: "",
      title: { vi: "Frontend Engineer", en: "Frontend Engineer" },
      blurb: { vi: "Giao diện hiện đại: framework, TypeScript, bảo mật FE và UX.", en: "Modern UI: frameworks, TypeScript, FE security and UX." },
      items: ["dsa", "react", "redux", "vue", "typescript", "fe-security", "skeleton-loading", "rest-grpc", "system-design", "behavioral"] },
    { id: "backend", role: "backend", level: "",
      title: { vi: "Backend Engineer", en: "Backend Engineer" },
      blurb: { vi: "Dịch vụ phía server: framework, dữ liệu, tìm kiếm và hệ thống.", en: "Server-side services: frameworks, data, search and systems." },
      items: ["dsa", "oop", "databases", "rest-grpc", "nodejs", "dotnet", "django", "ecommerce", "elasticsearch", "db-internals", "system-design", "behavioral"] },
  ];

  // Browser: register into the global PREP registry (unchanged behavior).
  if (typeof PREP !== "undefined" && PREP && typeof PREP.registerTrack === "function") {
    PREP.roles = roles;
    PREP.levels = levels;
    tracks.forEach(function (trk) { PREP.registerTrack(trk); });
  }

  // Node (tests): expose the raw data + a validIds convenience list.
  if (typeof module !== "undefined" && module.exports) {
    var validIds = [];
    tracks.forEach(function (trk) {
      (trk.items || []).forEach(function (id) { if (validIds.indexOf(id) === -1) validIds.push(id); });
    });
    module.exports = { roles: roles, levels: levels, tracks: tracks, validIds: validIds };
  }
})();
