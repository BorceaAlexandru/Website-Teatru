// server.js (Versiunea actualizata)
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const path = require('path'); // <--- 1. Importam 'path' (vine cu Node, nu trebuie instalat)

const app = express();

app.use(cors());
app.use(express.json());

// --- 2. LINIA MAGICA: Ii spunem serverului sa ofere fisierele din folderul 'public' ---
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRoutes);

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Serverul rulează la adresa http://localhost:${PORT}`);
});