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
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(trimmed, {
      signal: controller.signal,
      headers: {"User-Agent": "ConsciousBookClub/1.0 (link preview)"},
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(200).json({title: null, image: null});
    }
    const html = await response.text();

    // Extract og:title and og:image (attribute order may vary)
    const ogTitleRe = /<meta[^>]*(?:property=["']og:title["'][^>]*content=["']([^"']*)["']|content=["']([^"']*)["'][^>]*property=["']og:title["'])/i;
    const ogImageRe = /<meta[^>]*(?:property=["']og:image["'][^>]*content=["']([^"']*)["']|content=["']([^"']*)["'][^>]*property=["']og:image["'])/i;
    const titleMatch = html.match(ogTitleRe);
    const imageMatch = html.match(ogImageRe);
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : null;
    let image = imageMatch ? (imageMatch[1] || imageMatch[2] || "").trim() : null;
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, trimmed).href;
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
      headers: {"User-Agent": "ConsciousBookClub/1.0 (link preview)"},
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

