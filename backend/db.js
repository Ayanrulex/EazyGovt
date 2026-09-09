const { Pool } = require("pg");
require("dotenv").config();

const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED;

let pool;

if (databaseUrl) {
    // Hosted database (Neon / Vercel)
    pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false,
        },
    });
} else {
    // Local PostgreSQL
    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
    });
}

module.exports = pool;