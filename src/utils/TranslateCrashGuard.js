try {
  // translate-crash-guard.js
  (() => {
    // Server-safe: do nothing during SSR / if the DOM isn't available.
    if(typeof window === "undefined" || typeof Node !== "function" || !Node.prototype) {
      return;
    }

    // Install exactly once, even across hot reloads / double invocation.
    if(window.__translateCrashGuardInstalled) return;
    window.__translateCrashGuardInstalled = true;

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child) {
      if(child.parentNode !== this) {
        // A translator already moved this node out from under `this`.
        // React's intent was to delete it, so remove it from wherever it
        // actually lives now — but never throw.
        if(child.parentNode) child.parentNode.removeChild(child);
        return child;
      }
      return originalRemoveChild.call(this, child);
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(newNode, referenceNode) {
      if(referenceNode && referenceNode.parentNode !== this) {
        // The reference node was re-parented by a translator. Appending keeps
        // the new node visible in the right container instead of throwing.
        return originalInsertBefore.call(this, newNode, null);
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    };
  })();
} catch(error) {
  console.error("Failed to install translate crash guard:");
  console.error(error);
}