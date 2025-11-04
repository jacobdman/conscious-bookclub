// Database service abstraction layer with feature toggle
const usePostgres = process.env.USE_POSTGRES === "true";

if (usePostgres) {
  module.exports = require("./postgresService");
} else {
  module.exports = require("./firestoreService");
}
