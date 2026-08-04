/* IP.gating — pure Pro-topic tier checks & pool filtering.
   A topic is Pro iff its registered data has tier === "pro". Non-Pro users
   never see Pro topics in study pools. Dual-export: root.IP.gating + module.exports. */
(function (root, factory) {
  "use strict";
  var api = factory();
  root.IP = root.IP || {};
  root.IP.gating = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /* Pure: is topic `id` a Pro topic in the given topics map? */
  function isProTopic(topics, id) {
    return !!(topics && topics[id] && topics[id].tier === "pro");
  }

  /* Pure: topic-id pool visible to this user. Pro users see all; non-Pro users
     get Pro topics removed. Order preserved. */
  function visibleTopicPool(order, topics, isPro) {
    var ids = order || [];
    if (isPro) return ids.slice();
    return ids.filter(function (id) { return !isProTopic(topics, id); });
  }

  return { isProTopic: isProTopic, visibleTopicPool: visibleTopicPool };
});
