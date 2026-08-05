const knexConfig = require('./knexfile')['development'];
const knex = require('knex')(knexConfig);
const { seedDemoData } = require('./utils/demoSeeder');

seedDemoData(knex)
  .then((owner) => {
    console.log('Seeded successfully. Demo Owner:', owner);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
