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
  }
};
