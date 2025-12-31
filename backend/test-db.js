const { Client } = require('pg');
const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'riya8454',
    database: 'chat_app',
});
client.connect()
    .then(() => {
        console.log('Connected to Postgres');
        client.end();
    })
    .catch(err => {
        console.error('Connection error', err.stack);
        process.exit(1);
    });
