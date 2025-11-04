require("dotenv").config();

// Parse DATABASE_URL to extract connection details
// Handles URLs with query parameters like: postgresql://user:pass@host:port/db?sslmode=require
const parseDatabaseUrl = (url) => {
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Replace postgresql:// with http:// temporarily for URL parsing
  // This allows us to use the URL constructor which handles query params properly
  const tempUrl = url.replace(/^postgresql:\/\//, "http://");

  try {
    const urlObj = new URL(tempUrl);

    // Extract database name (remove leading slash and query string)
    const database = urlObj.pathname.replace(/^\//, "").split("?")[0];

    // Extract SSL mode from query parameters
    const sslMode = urlObj.searchParams.get("sslmode");

    const config = {
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      host: urlObj.hostname,
      port: parseInt(urlObj.port, 10) || 5432,
      database: database,
    };

    // Add SSL configuration if sslmode is require
    if (sslMode === "require") {
      config.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      };
    }

    return config;
  } catch (error) {
    // Fallback to regex parsing if URL constructor fails
    // Updated regex to handle query parameters
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
    const match = url.match(regex);

    if (!match) {
      throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
    }

    return {
      username: decodeURIComponent(match[1]),
      password: decodeURIComponent(match[2]),
      host: match[3],
      port: parseInt(match[4], 10),
      database: match[5],
      // Check if URL has sslmode=require
      dialectOptions: url.includes("sslmode=require") ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      } : undefined,
    };
  }
};

const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);

module.exports = {
  development: {
    ...dbConfig,
    dialect: "postgres",
    logging: false,
  },
  production: {
    ...dbConfig,
    dialect: "postgres",
    logging: false,
  },
};
