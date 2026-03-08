const db = require("../../../../db/models/index");

// GET /v1/feed/read-status - Get last read timestamp for current user and club
const getReadStatus = async (req, res, next) => {
  try {
    const {userId, clubId} = req.query;

    if (!userId || !clubId) {
      const error = new Error("userId and clubId are required");
      error.status = 400;
      throw error;
    }

    const readStatus = await db.FeedReadStatus.findOne({
      where: {
        userId,
        clubId: parseInt(clubId),
      },
    });

    if (!readStatus) {
      return res.json({lastReadAt: null});
    }

    res.json({lastReadAt: readStatus.lastReadAt});
  } catch (e) {
    next(e);
  }
};

// POST /v1/feed/mark-read - Update last read timestamp
const markAsRead = async (req, res, next) => {
  try {
    const {userId, clubId} = req.query;
    const {lastReadAt} = req.body;

    if (!userId || !clubId) {
      const error = new Error("userId and clubId are required");
      error.status = 400;
      throw error;
    }

    const timestamp = lastReadAt ? new Date(lastReadAt) : new Date();

    // Upsert: create or update
    const [readStatus] = await db.FeedReadStatus.upsert(
        {
          userId,
          clubId: parseInt(clubId),
          lastReadAt: timestamp,
        },
        {
          returning: true,
        },
    );

    res.json({lastReadAt: readStatus.lastReadAt});
  } catch (e) {
    next(e);
  }
};

// Browser-like User-Agent so sites (e.g. Amazon) serve full HTML with og/twitter meta
const LINK_PREVIEW_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Extract content from meta tag: property="og:title" content="..." or content="..." property="og:title"
function extractMetaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
      "<meta[^>]*(?:property=[\"']" + escaped + "[\"'][^>]*content=[\"']([^\"']*)[\"']|" +
      "content=[\"']([^\"']*)[\"'][^>]*property=[\"']" + escaped + "[\"'])",
      "i",
  );
  const m = html.match(re);
  if (m) return (m[1] || m[2] || "").trim();
  const nameRe = new RegExp(
      "<meta[^>]*(?:name=[\"']" + escaped + "[\"'][^>]*content=[\"']([^\"']*)[\"']|" +
      "content=[\"']([^\"']*)[\"'][^>]*name=[\"']" + escaped + "[\"'])",
      "i",
  );
  const m2 = html.match(nameRe);
  return m2 ? (m2[1] || m2[2] || "").trim() : null;
}

// GET /v1/feed/link-preview - Fetch og:title and og:image for a URL (for feed link bubbles)
const getLinkPreview = async (req, res, next) => {
  try {
    const {url} = req.query;
    if (!url || typeof url !== "string") {
      const error = new Error("url query parameter is required");
      error.status = 400;
      throw error;
    }
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      const error = new Error("url must be http or https");
      error.status = 400;
      throw error;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(trimmed, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": LINK_PREVIEW_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(200).json({title: null, image: null});
    }
    const html = await response.text();

    let title = extractMetaContent(html, "og:title");
    if (!title) title = extractMetaContent(html, "twitter:title");
    if (!title) {
      const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleTag) title = titleTag[1].trim().replace(/\s+/g, " ");
    }

    let image = extractMetaContent(html, "og:image");
    if (!image) image = extractMetaContent(html, "og:image:secure_url");
    if (!image) image = extractMetaContent(html, "twitter:image");
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        const baseUrl = response.url || trimmed;
        image = new URL(image, baseUrl).href;
      } catch {
        image = null;
      }
    }

    res.json({title: title || null, image: image || null});
  } catch (e) {
    return res.status(200).json({title: null, image: null});
  }
};

// GET /v1/feed/image-proxy?url=... - Proxy image to avoid hotlink/Referer blocking
const getImageProxy = async (req, res, next) => {
  try {
    const {url} = req.query;
    if (!url || typeof url !== "string") {
      const error = new Error("url query parameter is required");
      error.status = 400;
      throw error;
    }
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      const error = new Error("url must be http or https");
      error.status = 400;
      throw error;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(trimmed, {
      signal: controller.signal,
      headers: {"User-Agent": LINK_PREVIEW_UA},
    });
    clearTimeout(timeoutId);
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
      return res.status(404).end();
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    res.set("Cache-Control", "public, max-age=86400"); // 24h
    res.set("Content-Type", contentType);
    res.send(buffer);
  } catch (e) {
    if (e.name === "AbortError") {
      return res.status(504).end();
    }
    return res.status(502).end();
  }
};

module.exports = {
  getReadStatus,
  markAsRead,
  getLinkPreview,
  getImageProxy,
};

