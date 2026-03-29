const OL_ORIGIN = "https://openlibrary.org";
const OL_USER_AGENT = "ConsciousBookClub (jacobtdayton@gmail.com)";

const olFetchHeaders = {
  "User-Agent": OL_USER_AGENT,
};

/**
 * SSRF guard: only Open Library work and author keys.
 * @param {string} key Path such as /works/OL1W or /authors/OL1A
 * @return {boolean}
 */
const isValidOlKey = (key) =>
  typeof key === "string" &&
  !key.includes("..") &&
  /^(?:\/works\/OL[0-9]+W|\/authors\/OL[0-9]+A)$/i.test(key.trim());

/**
 * SSRF guard: only Open Library edition keys.
 * @param {string} key Path such as /books/OL24663544M
 * @return {boolean}
 */
const isValidOlEditionKey = (key) =>
  typeof key === "string" &&
  !key.includes("..") &&
  /^\/books\/OL[0-9]+M$/i.test(key.trim());

// GET /v1/open-library/search?title=&author=&limit=
const proxySearch = async (req, res, next) => {
  try {
    const {title = "", author = "", limit = "25"} = req.query;
    const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
    const params = new URLSearchParams();
    params.set("limit", String(lim));
    if (title) params.set("title", String(title));
    if (author) params.set("author", String(author));

    const url = `${OL_ORIGIN}/search.json?${params.toString()}`;
    const r = await fetch(url, {headers: olFetchHeaders});

    if (!r.ok) {
      const error = new Error(`Open Library error: ${r.status}`);
      error.status = 502;
      throw error;
    }

    res.json(await r.json());
  } catch (e) {
    next(e);
  }
};

// GET /v1/open-library/work?key=/works/OL1W
const proxyWork = async (req, res, next) => {
  try {
    const key = (req.query.key || "").trim();
    if (!isValidOlKey(key) || !key.toLowerCase().startsWith("/works/")) {
      const error = new Error("Invalid or missing work key");
      error.status = 400;
      throw error;
    }

    const url = `${OL_ORIGIN}${key}.json`;
    const r = await fetch(url, {headers: olFetchHeaders});

    if (!r.ok) {
      const error = new Error(`Open Library error: ${r.status}`);
      error.status = 502;
      throw error;
    }

    res.json(await r.json());
  } catch (e) {
    next(e);
  }
};

// GET /v1/open-library/author?key=/authors/OL1A
const proxyAuthor = async (req, res, next) => {
  try {
    const key = (req.query.key || "").trim();
    if (!isValidOlKey(key) || !key.toLowerCase().startsWith("/authors/")) {
      const error = new Error("Invalid or missing author key");
      error.status = 400;
      throw error;
    }

    const url = `${OL_ORIGIN}${key}.json`;
    const r = await fetch(url, {headers: olFetchHeaders});

    if (!r.ok) {
      const error = new Error(`Open Library error: ${r.status}`);
      error.status = 502;
      throw error;
    }

    res.json(await r.json());
  } catch (e) {
    next(e);
  }
};

// GET /v1/open-library/work-editions?key=/works/OL1W&limit=50
const proxyWorkEditions = async (req, res, next) => {
  try {
    const key = (req.query.key || "").trim();
    if (!isValidOlKey(key) || !key.toLowerCase().startsWith("/works/")) {
      const error = new Error("Invalid or missing work key");
      error.status = 400;
      throw error;
    }

    const lim = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50));
    const url = `${OL_ORIGIN}${key}/editions.json?limit=${lim}`;
    const r = await fetch(url, {headers: olFetchHeaders});

    if (!r.ok) {
      const error = new Error(`Open Library error: ${r.status}`);
      error.status = 502;
      throw error;
    }

    res.json(await r.json());
  } catch (e) {
    next(e);
  }
};

// GET /v1/open-library/edition?key=/books/OL123M
const proxyEdition = async (req, res, next) => {
  try {
    const key = (req.query.key || "").trim();
    if (!isValidOlEditionKey(key)) {
      const error = new Error("Invalid or missing edition key");
      error.status = 400;
      throw error;
    }

    const url = `${OL_ORIGIN}${key}.json`;
    const r = await fetch(url, {headers: olFetchHeaders});

    if (!r.ok) {
      const error = new Error(`Open Library error: ${r.status}`);
      error.status = 502;
      throw error;
    }

    res.json(await r.json());
  } catch (e) {
    next(e);
  }
};

module.exports = {
  proxySearch,
  proxyWork,
  proxyAuthor,
  proxyWorkEditions,
  proxyEdition,
};
