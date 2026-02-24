//conexiunea
// db.js
const sql = require('mssql');

const dbConfig = {
    user: 'sa',
    password: 'parola',        // Parola ta
    server: 'localhost',
    database: 'TeatruBazeDeDate',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Aceasta este funcția pe care o vom folosi in alte fisiere
// ca sa primim conexiunea gata facuta
async function getDbConnection() {
    try {
        let pool = await sql.connect(dbConfig);
        return pool;
    } catch (err) {
        console.error("Eroare la conectarea DB:", err);
        throw err;
    }
}

// Exportam sql (ca sa folosim tipurile de date) si functia de conectare
module.exports = {
    sql,
    getDbConnection
};