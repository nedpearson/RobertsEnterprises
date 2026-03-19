const { Client } = require('pg');

async function createDB() {
    const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });
    try {
        await client.connect();
        await client.query('CREATE DATABASE vowos;');
        console.log("SUCCESS: Database 'vowos' created.");
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log("Database 'vowos' already exists. Safe to proceed.");
        } else {
            console.error("FAILURE:", err.message);
        }
    } finally {
        await client.end();
    }
}

createDB();
