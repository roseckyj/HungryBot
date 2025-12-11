import sqlite3 from 'sqlite3';

export const db = new sqlite3.Database('./data/database.sqlite3', (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to database');

        // Create table favorites if it doesn't exist
        db.run(
            `CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            regex TEXT NOT NULL
        )`,
            (err) => {
                if (err) {
                    console.error('Could not create favorites table', err);
                }
            },
        );

        // Create table joins if it doesn't exist
        db.run(
            `CREATE TABLE IF NOT EXISTS joins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            server_id TEXT NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
            (err) => {
                if (err) {
                    console.error('Could not create joins table', err);
                }
            },
        );
    }
});
