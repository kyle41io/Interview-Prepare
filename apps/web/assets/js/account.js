/* IP.account — account deletion
 * Dual-export: browser global (IP.account) + CommonJS (module.exports) for tests.
 * Depends on: IP.auth.client(), IP.auth.signOut(), IP.store.clearAll()
 */
(function (root, factory) {
  const api = factory(root);
  root.IP = root.IP || {};
  root.IP.account = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {

  async function deleteAccount() {
    const a = root.IP && root.IP.auth;
    const c = a && a.client();
    if (!c) return;
    try {
      const { error } = await c.functions.invoke("delete-account", { method: "POST" });
      if (error) {
        alert("Delete failed: " + error.message);
        return;
      }
      if (root.IP.store) root.IP.store.clearAll();
      await a.signOut();
      location.reload();
    } catch (e) {
      alert("Delete failed: " + (e && e.message ? e.message : String(e)));
    }
  }

  return { deleteAccount };
});
