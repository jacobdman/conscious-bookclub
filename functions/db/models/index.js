require("dotenv");
const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const pg = require("pg");
pg.defaults.parseInt8 = true;
pg.types.setTypeParser(1700, parseFloat);
const Op = Sequelize.Op;
const modelUtils = require("./utils");

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";

const config = require("../../config/database")[env];

const assembleModel = (file) => {
  const model = require(path.join(__dirname, file))(sequelize, Sequelize);
  Object.entries(modelUtils).forEach(
      ([utilName, util]) => (model[utilName] = util(model)),
  );
  if (!model.defaultScope) {
    model.defaultScope = {};
  }
  // const modelCreateClone = model.create.bind(model)

  // model.create = async (values, options) => {
  //   return await modelCreateClone(
  //     values, {fields: model.allowedFields, ...options, returning: true }
  //   );
  // }

  return model;
};

// Initialize Sequelize - support both DATABASE_URL and parsed config
const sequelize = process.env.DATABASE_URL ?
  new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  }) :
  new Sequelize(config.database, config.username, config.password, {
    ...config,
    dialect: "postgres",
  });

const db = (() => {
  const _db = {};

  fs.readdirSync(__dirname)
      .filter((file) => {
        const predicate =
        file.indexOf(".") !== 0 &&
        !file.startsWith(basename) &&
        file !== "utils.js" &&
        file.slice(-3) === ".js";
        return predicate;
      })
      .forEach((file) => {
        const model = assembleModel(file);
        _db[model.name] = model;
      });

  Object.keys(_db).forEach((modelName) => {
    if (_db[modelName].associate) {
      _db[modelName].associate(_db);
    }
  });

  _db.sequelize = sequelize;
  _db.Sequelize = Sequelize;
  _db.Op = Op;

  return _db;
})();

module.exports = db;
