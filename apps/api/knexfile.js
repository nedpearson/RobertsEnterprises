require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './vowos_dev.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    }
  }
};
