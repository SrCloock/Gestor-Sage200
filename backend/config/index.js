// backend/config/index.js
const sage200Pool = require('./sage200db');
const localPool = require('./localDb');

module.exports = {
  sage200Pool,
  localPool
};