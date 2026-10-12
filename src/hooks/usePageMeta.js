import { useEffect } from "react";

export function usePageMeta({ title, description, canonicalPath }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const ensureMeta = (selector, attrs) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
        document.head.appendChild(el);
      }
      return el;
    };

    const desc = ensureMeta('meta[name="description"]', { name: "description" });
    desc.setAttribute("content", description);

    const ogTitle = ensureMeta('meta[property="og:title"]', { property: "og:title" });
    ogTitle.setAttribute("content", title);

    const ogDesc = ensureMeta('meta[property="og:description"]', { property: "og:description" });
    ogDesc.setAttribute("content", description);

    const ogType = ensureMeta('meta[property="og:type"]', { property: "og:type" });
    ogType.setAttribute("content", "article");

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const origin = window.location.origin;
    canonical.setAttribute("href", `${origin}${canonicalPath}`);

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, canonicalPath]);
}
