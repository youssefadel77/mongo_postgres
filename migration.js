require('dotenv').config();
const { MongoClient } = require('mongodb');
const { Client } = require('pg');

const mongoUri = process.env.MONGO_URI;
const pgUri = process.env.PG_URI;


(async () => {
    const mongoClient = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const pgClient = new Client({ connectionString: pgUri });

    try {
        // Connect to MongoDB
        await mongoClient.connect();
        console.log('Connected to MongoDB');

        // Connect to PostgreSQL
        await pgClient.connect();
        console.log('Connected to PostgreSQL');

        // Fetch all collections from MongoDB
        const db = mongoClient.db();
        const collections = await db.collections();

        for (const collection of collections) {
            const collectionName = collection.collectionName;
            console.log(`Migrating collection: ${collectionName}`);

            // Fetch all documents from MongoDB collection
            const docs = await collection.find({}).toArray();

            if (docs.length > 0) {
                // Create a table in PostgreSQL with the same name as the MongoDB collection
                const fields = Object.keys(docs[0]).map(key => `${key} TEXT`);
                const createTableQuery = `CREATE TABLE IF NOT EXISTS ${collectionName} (${fields.join(', ')})`;
                await pgClient.query(createTableQuery);

                // Insert documents into PostgreSQL
                for (const doc of docs) {
                    const keys = Object.keys(doc);
                    const values = Object.values(doc).map(val => `'${val}'`);
                    const insertQuery = `INSERT INTO ${collectionName} (${keys.join(', ')}) VALUES (${values.join(', ')})`;
                    await pgClient.query(insertQuery);
                }
                console.log(`Migrated ${docs.length} records from ${collectionName}`);
            } else {
                console.log(`No data found in collection: ${collectionName}`);
            }
        }
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await mongoClient.close();
        await pgClient.end();
    }
})();
