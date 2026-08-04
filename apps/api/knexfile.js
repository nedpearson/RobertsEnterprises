require('dotenv').config();

module.exports = {
  test: {
    client: 'sqlite3',
    connection: { filename: process.env.TEST_DB || ':memory:' },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    },
    migrations: { directory: './migrations' }
  },
  development: {
    client: 'sqlite3',
    connection: { filename: './vowos_dev.sqlite3' },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    },
    migrations: {
      directory: './migrations'
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' },
  },
};
