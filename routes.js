// routes.js
const express = require('express');
const router = express.Router();
// Importam conexiunea din fisierul creat la Pasul 1
const { sql, getDbConnection } = require('./db');

// routes.js - Varianta cu FILTRARE (Parametri Variabili)

//RUTA Spectacole
router.get('/spectacole', async (req, res) => {
    try {
        // Citim parametrii din URL (ex: ?titlu=Hamlet&data=2024-12-25)
        const { titlu, data } = req.query;

        let pool = await getDbConnection();
        let request = pool.request();

        let query = `
            SELECT 
                R.Reprezentatie_ID,
                S.Titlu,
                S.Gen,
                S.Durata_min,
                S.Imagine_URL,
                SL.Nume AS Nume_Sala,
                R.Data_ora,
                R.Pret_Standard
            FROM REPREZENTATIE R
            INNER JOIN SPECTACOL S ON R.Spectacol_ID = S.Spectacol_ID
            INNER JOIN SALA SL ON R.Sala_ID = SL.Sala_ID
            WHERE LOWER(LTRIM(RTRIM(ISNULL(R.Status,'')))) = 'programata'
        `;

        // Daca am primit un TITLU de cautat, il adaug in SQL
        if (titlu) {
            request.input('titluCautat', sql.NVarChar, `%${titlu}%`); // % pentru cautare partiala
            query += " AND S.Titlu LIKE @titluCautat";
        }

        // Daca am primit o DATA, o adaug in SQL
        if (data) {
            request.input('dataCautata', sql.Date, data);
            query += " AND CAST(R.Data_ora AS DATE) = @dataCautata";
        }

        query += " ORDER BY R.Data_ora ASC";
        
        let result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la server");
    }
});

// routes.js - RUTA LOGIN (Verifica sa fie identica!)
router.post('/login', async (req, res) => {
    const { email, parola } = req.body;
    try {
        let pool = await getDbConnection();
        let result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('parola', sql.NVarChar, parola)
            .query("SELECT * FROM UTILIZATOR WHERE Email = @email AND Parola = @parola");

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            
            // AICI ESTE CHEIA: Trimitem obiectul complet!
            res.json({ 
                succes: true, 
                mesaj: "Autentificare reușită!", 
                utilizator: { 
                    Utilizator_ID: user.Utilizator_ID, // OBLIGATORIU
                    Nume: user.Nume,                   // OBLIGATORIU pt profil
                    Prenume: user.Prenume,             // OBLIGATORIU pt profil
                    Email: user.Email,
                    Rol: user.Rol 
                } 
            });
        } else {
            res.status(401).json({ succes: false, mesaj: "Email sau parolă greșită!" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la server");
    }
});

// --- RUTA INREGISTRARE (REGISTER) ---
router.post('/register', async (req, res) => {
    // Primim datele din formular
    const { nume, prenume, email, parola } = req.body;

    try {
        let pool = await getDbConnection();

        // Verificam intai daca emailul exista deja
        let userCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT * FROM UTILIZATOR WHERE Email = @email");

        if (userCheck.recordset.length > 0) {
            return res.status(400).json({ succes: false, mesaj: "Acest email este deja folosit!" });
        }

        // Daca nu exista, il inseram.
        await pool.request()
            .input('nume', sql.NVarChar, nume)
            .input('prenume', sql.NVarChar, prenume)
            .input('email', sql.NVarChar, email)
            .input('parola', sql.NVarChar, parola) 
            .query(`
                INSERT INTO UTILIZATOR (Nume, Prenume, Email, Parola, Rol)
                VALUES (@nume, @prenume, @email, @parola, 'client')
            `);

        res.json({ succes: true, mesaj: "Cont creat cu succes! Acum te poți loga." });

    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la crearea contului.");
    }
});


// --- ZONA ADMINISTRARE UTILIZATORI ---

// 1. GET - Luam toti utilizatorii (fara parole, pentru securitate)
router.get('/users', async (req, res) => {
    try {
        let pool = await getDbConnection();
        let result = await pool.request().query("SELECT Utilizator_ID, Nume, Prenume, Email, Rol FROM UTILIZATOR");
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la server");
    }
});

// 2. PUT - Modific rolul unui utilizator (UPDATE)
router.put('/users/:id', async (req, res) => {
    const userId = req.params.id;
    const { noulRol } = req.body; //noul rol din frontend

    try {
        let pool = await getDbConnection();
        await pool.request()
            .input('id', sql.Int, userId)
            .input('rol', sql.NVarChar, noulRol)
            .query("UPDATE UTILIZATOR SET Rol = @rol WHERE Utilizator_ID = @id");

        res.json({ succes: true, mesaj: "Rol actualizat cu succes!" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la actualizare");
    }
});

// DELETE user (normal) - merge doar daca userul NU are rezervari ACTIVE
router.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  try {
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ succes: false, mesaj: "ID invalid." });
    }

    const pool = await getDbConnection();

    // verificam doar rezervari active (NU anulate)
    const check = await pool.request()
      .input('id', sql.Int, userId)
      .query(`
  SELECT TOP 1 1 AS are
  FROM REZERVARE
  WHERE Utilizator_ID = @id
    AND LOWER(LTRIM(RTRIM(ISNULL(Status,'')))) NOT IN ('anulata', 'anulată')
`);

    if (check.recordset.length > 0) {
      return res.status(400).json({
        succes: false,
        mesaj: "Nu poți șterge utilizatorul: are rezervări active!"
      });
    }

    const del = await pool.request()
      .input('id', sql.Int, userId)
      .query(`DELETE FROM UTILIZATOR WHERE Utilizator_ID = @id`);

    if (del.rowsAffected[0] === 0) {
      return res.json({ succes: false, mesaj: "Utilizatorul nu a fost găsit." });
    }

    return res.json({ succes: true, mesaj: "Utilizator șters cu succes!" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ succes: false, mesaj: "Eroare la ștergerea utilizatorului." });
  }
});



// --- ZONA GESTIUNE SPECTACOLE (CRUD) ---

//ceva extra
// Ruta simpla care aduce TOATE spectacolele (pentru lista de gestiune)
router.get('/catalog_spectacole', async (req, res) => {
    try {
        let pool = await getDbConnection();
        let result = await pool.request().query("SELECT * FROM SPECTACOL ORDER BY Titlu ASC");
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});




// 1. POST - Adauga un spectacol nou (INSERT)
router.post('/spectacole', async (req, res) => {
    const { titlu, regia, gen, durata, descriere, imagine } = req.body;
    try {
        let pool = await getDbConnection();
        await pool.request()
            .input('titlu', sql.NVarChar, titlu)
            .input('regia', sql.NVarChar, regia)
            .input('gen', sql.NVarChar, gen)
            .input('durata', sql.Int, durata)
            .input('descriere', sql.NVarChar, descriere)
            .input('imagine', sql.NVarChar, imagine)
            .query(`
                INSERT INTO SPECTACOL (Titlu, Regia, Gen, Durata_min, Descriere, Imagine_URL)
                VALUES (@titlu, @regia, @gen, @durata, @descriere, @imagine)
            `);
        res.json({ succes: true, mesaj: "Spectacol adăugat!" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la adăugare.");
    }
});

// 2. PUT - Actualizeaza un spectacol existent (UPDATE)
router.put('/spectacole/:id', async (req, res) => {
    const id = req.params.id;
    const { titlu, regia, gen, durata, descriere, imagine } = req.body;
    try {
        let pool = await getDbConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('titlu', sql.NVarChar, titlu)
            .input('regia', sql.NVarChar, regia)
            .input('gen', sql.NVarChar, gen)
            .input('durata', sql.Int, durata)
            .input('descriere', sql.NVarChar, descriere)
            .input('imagine', sql.NVarChar, imagine)
            .query(`
                UPDATE SPECTACOL 
                SET Titlu=@titlu, Regia=@regia, Gen=@gen, Durata_min=@durata, Descriere=@descriere, Imagine_URL=@imagine
                WHERE Spectacol_ID = @id
            `);
        res.json({ succes: true, mesaj: "Spectacol actualizat!" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la actualizare.");
    }
});

// 3. DELETE - Sterge un spectacol
router.delete('/spectacole/:id', async (req, res) => {
  const spectacolId = parseInt(req.params.id, 10);
  let transaction;

  try {
    const pool = await getDbConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1) Verific dacă există vreo reprezentație PROGRAMATĂ (sau status NULL tratat ca programată)
    const checkProgramate = await transaction.request()
      .input('sid', sql.Int, spectacolId)
      .query(`
        SELECT TOP 1 1 AS are
        FROM REPREZENTATIE
        WHERE Spectacol_ID = @sid
          AND LOWER(LTRIM(RTRIM(ISNULL(Status,'programata')))) = 'programata'
      `);

    if (checkProgramate.recordset.length > 0) {
      await transaction.rollback();
      return res.json({
        succes: false,
        mesaj: "Nu poți șterge: există reprezentații programate pentru acest spectacol."
      });
    }

    // 2) Verific dacă există rezervări ACTIVE (confirmate etc.) pe reprezentațiile acestui spectacol
    const checkRezervariActive = await transaction.request()
      .input('sid', sql.Int, spectacolId)
      .query(`
        SELECT TOP 1 1 AS are
        FROM REZERVARE RZ
        JOIN REPREZENTATIE RP ON RP.Reprezentatie_ID = RZ.Reprezentatie_ID
        WHERE RP.Spectacol_ID = @sid
          AND LOWER(LTRIM(RTRIM(ISNULL(RZ.Status,'')))) NOT IN ('anulata','anulată')
      `);

    if (checkRezervariActive.recordset.length > 0) {
      await transaction.rollback();
      return res.json({
        succes: false,
        mesaj: "Nu poți șterge: există rezervări active pentru acest spectacol."
      });
    }

    // 3) Șterg facturile (dacă există) pentru rezervările acestui spectacol
    await transaction.request()
      .input('sid', sql.Int, spectacolId)
      .query(`
        DELETE F
        FROM FACTURA F
        JOIN REZERVARE RZ ON RZ.Rezervare_ID = F.Rezervare_ID
        JOIN REPREZENTATIE RP ON RP.Reprezentatie_ID = RZ.Reprezentatie_ID
        WHERE RP.Spectacol_ID = @sid
      `);

    // 4) Șterg rezervare_loc pentru rezervările acestui spectacol
    await transaction.request()
      .input('sid', sql.Int, spectacolId)
      .query(`
        DELETE RL
        FROM REZERVARE_LOC RL
        JOIN REZERVARE RZ ON RZ.Rezervare_ID = RL.Rezervare_ID
        JOIN REPREZENTATIE RP ON RP.Reprezentatie_ID = RZ.Reprezentatie_ID
        WHERE RP.Spectacol_ID = @sid
      `);

    // 5) Șterg rezervările (anulate) ale acestui spectacol
    await transaction.request()
      .input('sid', sql.Int, spectacolId)
      .query(`
        DELETE RZ
        FROM REZERVARE RZ
        JOIN REPREZENTATIE RP ON RP.Reprezentatie_ID = RZ.Reprezentatie_ID
        WHERE RP.Spectacol_ID = @sid
      `);

    // 6) Șterg reprezentațiile (anulate) ale acestui spectacol
    await transaction.request()
      .input('sid', sql.Int, spectacolId)
      .query(`
        DELETE FROM REPREZENTATIE
        WHERE Spectacol_ID = @sid
      `);

    // 7) Șterg spectacolul
    await transaction.request()
      .input('sid', sql.Int, spectacolId)
      .query(`
        DELETE FROM SPECTACOL
        WHERE Spectacol_ID = @sid
      `);

    await transaction.commit();
    return res.json({
      succes: true,
      mesaj: "Spectacolul a fost șters (împreună cu istoricul anulat)."
    });

  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (_) {}
    }
    console.error("Eroare stergere spectacol:", err);
    return res.status(500).json({ succes: false, mesaj: "Eroare la ștergere spectacol." });
  }
});

// --- ZONA PROGRAMARE (REPREZENTATII) ---

// 1. GET - Lista Săli (pentru dropdown)
router.get('/sali', async (req, res) => {
    try {
        let pool = await getDbConnection();
        let result = await pool.request().query("SELECT * FROM SALA");
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

// 2. GET - Lista Programari (pentru tabelul din dreapta)
// Afișăm implicit DOAR programările ACTIVE (Programata / NULL)
// Dacă vrei să vezi și anulate, poți apela: /api/programari_admin?includeAnulate=1
router.get('/programari_admin', async (req, res) => {
  try {
    const pool = await getDbConnection();

    const result = await pool.request().query(`
      SELECT 
        R.Reprezentatie_ID,
        S.Titlu,
        SL.Nume AS Nume_Sala,
        R.Data_ora,
        R.Pret_Standard,
        ISNULL(R.Status, 'Programata') AS Status
      FROM REPREZENTATIE R
      JOIN SPECTACOL S ON R.Spectacol_ID = S.Spectacol_ID
      JOIN SALA SL ON R.Sala_ID = SL.Sala_ID
      WHERE LOWER(LTRIM(RTRIM(ISNULL(R.Status,'Programata')))) <> 'anulata'
      ORDER BY R.Data_ora ASC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Eroare /programari_admin:", err);
    res.status(500).send("Eroare la server");
  }
});



// 3. POST - Adauga o reprezentatie noua
// routes.js - Varianta actualizata (cu verificare de conflict)

router.post('/programari', async (req, res) => {
    const { spectacolId, salaId, dataOra, pret } = req.body;
    try {
        let pool = await getDbConnection();

        // PASUL 1: Aflam durata spectacolului pe care vrei sa il programezi acum
        // Avem nevoie de durata ca sa stim cand se termina (Start + Durata = End)
        let specResult = await pool.request()
            .input('sid', sql.Int, spectacolId)
            .query("SELECT Durata_min FROM SPECTACOL WHERE Spectacol_ID = @sid");
            
        if (specResult.recordset.length === 0) {
            return res.status(404).json({ succes: false, mesaj: "Spectacolul nu a fost găsit!" });
        }
        
        let durataNoua = specResult.recordset[0].Durata_min;

        // PASUL 2: Verificam daca exista DEJA ceva in sala aia care se suprapune
        // Logica matematica de suprapunere este: (StartA < EndB) SI (StartB < EndA)
        // Folosim DATEADD in SQL pentru a calcula ora de final a spectacolelor existente
        
        let conflictCheck = await pool.request()
            .input('sala', sql.Int, salaId)
            .input('startNou', sql.DateTime, dataOra)
            .input('durataNoua', sql.Int, durataNoua)
            .query(`
                SELECT R.Reprezentatie_ID, S.Titlu, R.Data_ora
                FROM REPREZENTATIE R
                JOIN SPECTACOL S ON R.Spectacol_ID = S.Spectacol_ID
                WHERE R.Sala_ID = @sala
                AND R.Status = 'Programata' -- Ignoram cele anulate
                AND (
                    -- Verificam daca intervalul nou se intersecteaza cu unul existent
                    @startNou < DATEADD(minute, S.Durata_min, R.Data_ora) 
                    AND 
                    DATEADD(minute, @durataNoua, @startNou) > R.Data_ora
                )
            `);

        // Daca interogarea de mai sus a gasit ceva, inseamna ca sala e ocupata!
        if (conflictCheck.recordset.length > 0) {
            let conflict = conflictCheck.recordset[0];
            // Formatez ora frumos pentru mesajul de eroare
            let oraConflict = new Date(conflict.Data_ora).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'});
            
            return res.status(400).json({ 
                succes: false, 
                mesaj: `Conflict! Sala este ocupată de "${conflict.Titlu}" la ora ${oraConflict}.` 
            });
        }

        // PASUL 3: Daca nu e conflict, inseram linistit
        await pool.request()
            .input('sid', sql.Int, spectacolId)
            .input('sala', sql.Int, salaId)
            .input('data', sql.DateTime, dataOra)
            .input('pret', sql.Decimal(10,2), pret)
            .query(`
                INSERT INTO REPREZENTATIE (Spectacol_ID, Sala_ID, Data_ora, Pret_Standard, Status)
                VALUES (@sid, @sala, @data, @pret, 'Programata')
            `);

        res.json({ succes: true, mesaj: "Spectacol programat cu succes!" });

    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la programare");
    }
});

// 4. DELETE - Sterge/Anuleaza o programare
router.delete('/programari/:id', async (req, res) => {
  const repId = parseInt(req.params.id, 10);
  let transaction;

  try {
    if (!Number.isInteger(repId)) {
      return res.status(400).json({ succes: false, mesaj: "ID invalid." });
    }

    const pool = await getDbConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Verificam daca exista rezervari pentru aceasta reprezentatie
    const check = await transaction.request()
      .input('rid', sql.Int, repId)
      .query(`SELECT TOP 1 Rezervare_ID FROM REZERVARE WHERE Reprezentatie_ID = @rid`);

    if (check.recordset.length === 0) {
      // Nu exista rezervari -> putem sterge reprezentatia
      await transaction.request()
        .input('rid', sql.Int, repId)
        .query(`DELETE FROM REPREZENTATIE WHERE Reprezentatie_ID = @rid`);

      await transaction.commit();
      return res.json({ succes: true, mesaj: "Reprezentația a fost ștearsă (nu avea rezervări)." });
    }

    // Exista rezervari -> ANULAM TOT (reprezentatie + rezervari + eliberare locuri + factura optional)
    await transaction.request()
      .input('rid', sql.Int, repId)
      .query(`UPDATE REPREZENTATIE SET Status='Anulata' WHERE Reprezentatie_ID = @rid`);

    // Anulam rezervarile asociate
    await transaction.request()
      .input('rid', sql.Int, repId)
      .query(`UPDATE REZERVARE SET Status='Anulata' WHERE Reprezentatie_ID = @rid`);

    // Eliberam locurile (sterge asignarile locurilor pentru rezervarile acestei reprezentatii)
    await transaction.request()
      .input('rid', sql.Int, repId)
      .query(`
        DELETE RL
        FROM REZERVARE_LOC RL
        JOIN REZERVARE RZ ON RZ.Rezervare_ID = RL.Rezervare_ID
        WHERE RZ.Reprezentatie_ID = @rid
      `);

    // Optional: stergem facturile aferente rezervarilor anulate (daca vrei sa dispara)
    await transaction.request()
      .input('rid', sql.Int, repId)
      .query(`
        DELETE F
        FROM FACTURA F
        JOIN REZERVARE RZ ON RZ.Rezervare_ID = F.Rezervare_ID
        WHERE RZ.Reprezentatie_ID = @rid
      `);

    await transaction.commit();
    return res.json({ succes: true, mesaj: "Reprezentația avea rezervări. A fost anulată și s-au anulat rezervările + eliberat locurile." });

  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (_) {}
    }
    console.error(err);
    return res.status(500).json({ succes: false, mesaj: "Eroare la anulare/ștergere reprezentație." });
  }
});


// --- ZONA DE VANZARI (COS) ---

// 1. GET - Detalii despre o reprezentatie specifica (pentru afisare in cos)
router.get('/detalii_reprezentatie/:id', async (req, res) => {
    const id = req.params.id;
    try {
        let pool = await getDbConnection();
        let query = `
            SELECT R.Reprezentatie_ID, S.Titlu, SL.Nume AS Nume_Sala, R.Data_ora, R.Pret_Standard
            FROM REPREZENTATIE R
            JOIN SPECTACOL S ON R.Spectacol_ID = S.Spectacol_ID
            JOIN SALA SL ON R.Sala_ID = SL.Sala_ID
            WHERE R.Reprezentatie_ID = @id
        `;
        let result = await pool.request().input('id', sql.Int, id).query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare");
    }
});

// POST /api/rezerva - rezerva bilete + aloca locuri in ordine + genereaza factura 
router.post('/rezerva', async (req, res) => {
  const { utilizatorId, reprezentatieId, nrBilete } = req.body;
  let transaction;

  try {
    // Validari
    const uid = parseInt(utilizatorId, 10);
    const rid = parseInt(reprezentatieId, 10);
    const nr = parseInt(nrBilete, 10);

    if (!Number.isInteger(uid) || !Number.isInteger(rid) || !Number.isInteger(nr) || nr <= 0) {
      return res.json({ succes: false, mesaj: "Date invalide pentru rezervare." });
    }

    const pool = await getDbConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // 1) Reprezentatie: Sala_ID + Pret_Standard (+ optional Status)
    const repRes = await transaction.request()
      .input('rid', sql.Int, rid)
      .query(`
        SELECT Reprezentatie_ID, Sala_ID, Pret_Standard, Status
        FROM REPREZENTATIE WITH (UPDLOCK, HOLDLOCK)
        WHERE Reprezentatie_ID = @rid
      `);

    if (repRes.recordset.length === 0) {
      throw new Error("Reprezentatia nu exista.");
    }

    const salaId = repRes.recordset[0].Sala_ID;
    const pretStandard = Number(repRes.recordset[0].Pret_Standard);
    const statusRep = (repRes.recordset[0].Status || '').toString().toLowerCase();

    if (!salaId || !pretStandard) {
      throw new Error("Reprezentatia nu are sala/pret valid.");
    }

    if (statusRep === 'anulata' || statusRep === 'inactiva') {
      throw new Error("Nu se pot face rezervari la aceasta reprezentatie.");
    }

    // 2) Aleg TOP(@nr) locuri LIBERE din sala, in ordine Rand, Numar
    // Ocupate = locuri din rezervari la aceeasi reprezentatie care NU sunt Anulata
    const locuriRes = await transaction.request()
      .input('salaId', sql.Int, salaId)
      .input('rid', sql.Int, rid)
      .input('nr', sql.Int, nr)
      .query(`
        SELECT TOP (@nr) L.Loc_ID
        FROM LOC L WITH (UPDLOCK, HOLDLOCK)
        WHERE L.Sala_ID = @salaId
          AND NOT EXISTS (
            SELECT 1
            FROM REZERVARE_LOC RL
            JOIN REZERVARE RZ ON RZ.Rezervare_ID = RL.Rezervare_ID
            WHERE RZ.Reprezentatie_ID = @rid
              AND ISNULL(RZ.Status,'') <> 'Anulata'
              AND RL.Loc_ID = L.Loc_ID
          )
        ORDER BY L.Rand, L.Numar
      `);

    if (locuriRes.recordset.length < nr) {
      throw new Error("Nu sunt suficiente locuri disponibile!");
    }

    const locuriAlese = locuriRes.recordset.map(x => x.Loc_ID);

    // 3) Inseram rezervarea (cu Total)
    const total = pretStandard * nr;

    const insertRez = await transaction.request()
      .input('uid', sql.Int, uid)
      .input('rid', sql.Int, rid)
      .input('total', sql.Decimal(10, 2), total)
      .query(`
        INSERT INTO REZERVARE (Utilizator_ID, Reprezentatie_ID, Status, Total, Data_Creare)
        OUTPUT INSERTED.Rezervare_ID
        VALUES (@uid, @rid, 'Confirmata', @total, GETDATE())
      `);

    const rezervareIdNou = insertRez.recordset[0].Rezervare_ID;

    // 4) Inseram locurile in REZERVARE_LOC (fara reduceri)
    for (const locId of locuriAlese) {
      await transaction.request()
        .input('rezId', sql.Int, rezervareIdNou)
        .input('locId', sql.Int, locId)
        .query(`
          INSERT INTO REZERVARE_LOC (Rezervare_ID, Loc_ID)
          VALUES (@rezId, @locId)
        `);
    }

    // 5) Generam factura pe schema ta actuala (Data_Factura, Total, Nume_Client, Adresa_Email)
    const facturaRes = await transaction.request()
      .input('rezId', sql.Int, rezervareIdNou)
      .input('uid', sql.Int, uid)
      .input('total', sql.Decimal(10, 2), total)
      .query(`
        INSERT INTO FACTURA (Rezervare_ID, Data_Factura, Total, Nume_Client, Adresa_Email)
        OUTPUT INSERTED.Factura_ID
        SELECT
          @rezId,
          GETDATE(),
          @total,
          (U.Nume + ' ' + U.Prenume),
          U.Email
        FROM UTILIZATOR U
        WHERE U.Utilizator_ID = @uid;
      `);

    const facturaId = facturaRes.recordset[0].Factura_ID;

    await transaction.commit();

    return res.json({
      succes: true,
      mesaj: "Rezervare si factura generate!",
      rezervareId: rezervareIdNou,
      facturaId,
      total,
      locuri: locuriAlese
    });

  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (_) {}
    }
    console.error("Eroare rezervare:", err);
    return res.json({ succes: false, mesaj: err.message || "Eroare la rezervare" });
  }
});




// --- RUTA CONTACT ---
router.post('/contact', (req, res) => {
    // Aici doar simulam trimiterea (in realitate ai trimite un email)
    const { nume, email, mesaj } = req.body;
    console.log(`MESAJ NOU DE LA ${nume} (${email}): ${mesaj}`);
    
    res.json({ succes: true, mesaj: "Mesajul a fost trimis! Te vom contacta curând." });
});

// --- RUTA CONT UTILIZATOR (ISTORIC) ---
router.get('/istoric_rezervari/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        let pool = await getDbConnection();
        
        let query = `
            SELECT 
                R.Rezervare_ID,
                R.Data_Creare,
                R.Status,
                S.Titlu,
                SL.Nume AS Nume_Sala,
                RP.Data_ora AS Data_Spectacol,
                (SELECT COUNT(*) FROM REZERVARE_LOC WHERE Rezervare_ID = R.Rezervare_ID) AS Nr_Bilete
            FROM REZERVARE R
            JOIN REPREZENTATIE RP ON R.Reprezentatie_ID = RP.Reprezentatie_ID
            JOIN SPECTACOL S ON RP.Spectacol_ID = S.Spectacol_ID
            JOIN SALA SL ON RP.Sala_ID = SL.Sala_ID
            WHERE R.Utilizator_ID = @uid
            ORDER BY R.Data_Creare DESC
        `;

        let result = await pool.request()
            .input('uid', sql.Int, userId)
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare la istoric");
    }
});


//FACTURA
router.get('/factura/:rezervareId', async (req, res) => {
  try {
    const pool = await getDbConnection();

    const result = await pool.request()
      .input('rezId', sql.Int, parseInt(req.params.rezervareId, 10))
      .query(`
        SELECT 
          F.Factura_ID,
          F.Rezervare_ID,
          F.Data_Factura,
          CAST(F.Total AS float) AS Total,
          F.Nume_Client,
          F.Adresa_Email,

          S.Titlu AS Nume_Spectacol,
          SL.Nume AS Sala,
          RP.Data_ora AS Data_Reprezentatie,

          (SELECT COUNT(*) 
           FROM REZERVARE_LOC RL
           WHERE RL.Rezervare_ID = F.Rezervare_ID) AS Cantitate
        FROM FACTURA F
        JOIN REZERVARE RZ ON F.Rezervare_ID = RZ.Rezervare_ID
        JOIN REPREZENTATIE RP ON RZ.Reprezentatie_ID = RP.Reprezentatie_ID
        JOIN SPECTACOL S ON RP.Spectacol_ID = S.Spectacol_ID
        JOIN SALA SL ON RP.Sala_ID = SL.Sala_ID
        WHERE F.Rezervare_ID = @rezId
      `);

    if (result.recordset.length === 0) {
      return res.json({ succes: false, mesaj: "Factura nu există." });
    }

    return res.json({ succes: true, factura: result.recordset[0] });

  } catch (err) {
    console.error("Eroare /api/factura:", err);
    return res.status(500).json({ succes: false, mesaj: "Eroare server la factură." });
  }
});



//RUTA anulare rezervare

router.post('/anuleaza_rezervare', async (req, res) => {
  const { rezervareId, utilizatorId } = req.body;
  let transaction;

  try {
    const rezId = parseInt(rezervareId, 10);
    const uid = parseInt(utilizatorId, 10);

    if (!Number.isInteger(rezId) || !Number.isInteger(uid)) {
      return res.json({ succes: false, mesaj: "Date invalide." });
    }

    const pool = await getDbConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1) Verificam ca rezervarea exista si apartine userului (sau faci bypass pentru admin)
    const rez = await transaction.request()
      .input('rezId', sql.Int, rezId)
      .query(`
        SELECT Rezervare_ID, Utilizator_ID, Status
        FROM REZERVARE
        WHERE Rezervare_ID = @rezId
      `);

    if (rez.recordset.length === 0) throw new Error("Rezervarea nu exista.");

    const ownerId = rez.recordset[0].Utilizator_ID;
    const status = rez.recordset[0].Status || "";

    if (ownerId !== uid) {
      throw new Error("Nu ai dreptul sa anulezi aceasta rezervare.");
    }

    if (status === "Anulata") {
      await transaction.commit();
      return res.json({ succes: true, mesaj: "Rezervarea era deja anulata." });
    }

    // 2) Marcam rezervarea ca anulata
    await transaction.request()
      .input('rezId', sql.Int, rezId)
      .query(`UPDATE REZERVARE SET Status='Anulata' WHERE Rezervare_ID=@rezId`);

    // 3) Eliberam locurile (le stergem din legatura)
    await transaction.request()
      .input('rezId', sql.Int, rezId)
      .query(`DELETE FROM REZERVARE_LOC WHERE Rezervare_ID=@rezId`);

    // 4) Optional: stergem factura asociata (ca sa nu mai poata fi “vazuta”)
    await transaction.request()
      .input('rezId', sql.Int, rezId)
      .query(`DELETE FROM FACTURA WHERE Rezervare_ID=@rezId`);

    await transaction.commit();
    return res.json({ succes: true, mesaj: "Rezervarea a fost anulata, locurile au fost eliberate." });

  } catch (err) {
    if (transaction) await transaction.rollback();
    console.error("Eroare anulare:", err);
    return res.json({ succes: false, mesaj: err.message || "Eroare la anulare" });
  }
});


//HARD DELETE ADMIN

// DELETE user (force) - sterge tot ce tine de el: FACTURA, REZERVARE_LOC, REZERVARE, apoi UTILIZATOR
router.delete('/users/:id/force', async (req, res) => {
  const uid = parseInt(req.params.id, 10);
  let transaction;

  try {
    if (!Number.isInteger(uid)) {
      return res.status(400).json({ succes: false, mesaj: "ID invalid." });
    }

    const pool = await getDbConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // 1) Stergem facturile pentru rezervarile userului
    await transaction.request()
      .input('uid', sql.Int, uid)
      .query(`
        DELETE F
        FROM FACTURA F
        JOIN REZERVARE R ON R.Rezervare_ID = F.Rezervare_ID
        WHERE R.Utilizator_ID = @uid;
      `);

    // 2) Stergem legaturile locurilor pentru rezervarile userului
    await transaction.request()
      .input('uid', sql.Int, uid)
      .query(`
        DELETE RL
        FROM REZERVARE_LOC RL
        JOIN REZERVARE R ON R.Rezervare_ID = RL.Rezervare_ID
        WHERE R.Utilizator_ID = @uid;
      `);

    // 3) Stergem rezervarile userului
    await transaction.request()
      .input('uid', sql.Int, uid)
      .query(`DELETE FROM REZERVARE WHERE Utilizator_ID = @uid;`);

    // 4) Stergem userul
    const delUser = await transaction.request()
      .input('uid', sql.Int, uid)
      .query(`DELETE FROM UTILIZATOR WHERE Utilizator_ID = @uid;`);

    await transaction.commit();

    if (delUser.rowsAffected[0] === 0) {
      return res.json({ succes: false, mesaj: "Utilizatorul nu a fost găsit." });
    }

    return res.json({ succes: true, mesaj: "Utilizator șters complet (force)!" });

  } catch (err) {
    if (transaction) {
      try { await transaction.rollback(); } catch (_) {}
    }
    console.error("Eroare force delete:", err);
    return res.status(500).json({ succes: false, mesaj: err.message || "Eroare la force delete." });
  }
});

//LOCURI DISPONIBILE
router.get('/locuri_disponibile/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const pool = await getDbConnection();

    const q = `
      SELECT
        SL.Numar_Locuri AS TotalLocuri,
        (SL.Numar_Locuri - COUNT(RL.Loc_ID)) AS LocuriDisponibile
      FROM REPREZENTATIE RP
      JOIN SALA SL ON RP.Sala_ID = SL.Sala_ID

      LEFT JOIN REZERVARE RZ
        ON RZ.Reprezentatie_ID = RP.Reprezentatie_ID
        AND ISNULL(RZ.Status,'') <> 'Anulata'

      LEFT JOIN REZERVARE_LOC RL
        ON RL.Rezervare_ID = RZ.Rezervare_ID
        AND RL.Loc_ID IS NOT NULL

      WHERE RP.Reprezentatie_ID = @rid
      GROUP BY SL.Numar_Locuri
    `;

    const r = await pool.request()
      .input('rid', sql.Int, id)
      .query(q);

    if (r.recordset.length === 0) {
      return res.json({ succes: false, mesaj: "Reprezentatia nu exista." });
    }

    return res.json({
      succes: true,
      totalLocuri: r.recordset[0].TotalLocuri,
      locuriDisponibile: r.recordset[0].LocuriDisponibile
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ succes: false, mesaj: "Eroare la calcul locuri." });
  }
});


// STATISTICA: Top spectacole vandute (bilete)
router.get('/stats/top_spectacole', async (req, res) => {
  try {
    const top = parseInt(req.query.top || "5", 10);

    const pool = await getDbConnection();
    const result = await pool.request()
      .input('top', sql.Int, top)
      .query(`
        SELECT TOP (@top)
          S.Spectacol_ID,
          S.Titlu,
          COUNT(RL.Loc_ID) AS BileteVandute
        FROM SPECTACOL S
        JOIN REPREZENTATIE RP ON RP.Spectacol_ID = S.Spectacol_ID
        JOIN REZERVARE RZ ON RZ.Reprezentatie_ID = RP.Reprezentatie_ID
        JOIN REZERVARE_LOC RL ON RL.Rezervare_ID = RZ.Rezervare_ID
        WHERE LOWER(LTRIM(RTRIM(ISNULL(RZ.Status,'')))) NOT IN ('anulata','anulată')
          AND RL.Loc_ID IS NOT NULL
        GROUP BY S.Spectacol_ID, S.Titlu
        ORDER BY BileteVandute DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Eroare top_spectacole:", err);
    res.status(500).json({ succes: false, mesaj: "Eroare server." });
  }
});

// RUTA GUEST LIST
router.get('/guestlist/:id', async (req, res) => {
    try {
        const idRep = req.params.id;
        let pool = await getDbConnection();
        
        // Interogare: Vad Numele, Email-ul si Statusul rezervarii
        let query = `
            SELECT 
                U.Nume, 
                U.Prenume, 
                U.Email, 
                RZ.Status
            FROM REZERVARE RZ
            INNER JOIN UTILIZATOR U ON RZ.Utilizator_ID = U.Utilizator_ID
            WHERE RZ.Reprezentatie_ID = @idRep
        `;

        let result = await pool.request()
            .input('idRep', sql.Int, idRep)
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

//lista facturi
router.get('/facturile_mele/:uid', async (req, res) => {
    try {
        const uid = req.params.uid;
        let pool = await getDbConnection();

        let query = `
            SELECT 
                F.Factura_ID, 
                F.Data_Factura, 
                F.Total, 
                F.Nume_Client,
                RZ.Rezervare_ID  -- AM ADAUGAT ASTA PENTRU LINK
            FROM FACTURA F
            INNER JOIN REZERVARE RZ ON F.Rezervare_ID = RZ.Rezervare_ID
            WHERE RZ.Utilizator_ID = @uid
            ORDER BY F.Data_Factura DESC
        `;

        let result = await pool.request()
            .input('uid', sql.Int, uid)
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

//cautare rezervari pt client in funtie de email
router.get('/admin/cauta_rezervari', async (req, res) => {
    try {
        const email = req.query.email;
        let pool = await getDbConnection();

        let query = `
            SELECT 
                R.Rezervare_ID,
                S.Titlu,
                RP.Data_ora,
                R.Status,
                R.Total
            FROM REZERVARE R
            INNER JOIN UTILIZATOR U ON R.Utilizator_ID = U.Utilizator_ID
            INNER JOIN REPREZENTATIE RP ON R.Reprezentatie_ID = RP.Reprezentatie_ID
            INNER JOIN SPECTACOL S ON RP.Spectacol_ID = S.Spectacol_ID
            WHERE U.Email = @email
            ORDER BY RP.Data_ora DESC
        `;

        let result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

//pentru admin, ce avem azi
router.get('/admin/azi', async (req, res) => {
    try {
        let pool = await getDbConnection();

        // 1. Calcul interval in JS 
        const azi = new Date();
        azi.setHours(0, 0, 0, 0); // Azi la 00:00:00

        const maine = new Date(azi);
        maine.setDate(maine.getDate() + 1); // Maine la 00:00:00

        let query = `
            SELECT 
                R.Reprezentatie_ID,
                S.Titlu,
                SL.Nume AS Nume_Sala,
                R.Data_ora,
                R.Pret_Standard,
                R.Status
            FROM REPREZENTATIE R
            INNER JOIN SPECTACOL S ON R.Spectacol_ID = S.Spectacol_ID
            INNER JOIN SALA SL ON R.Sala_ID = SL.Sala_ID
            WHERE R.Data_ora >= @start AND R.Data_ora < @end
            ORDER BY R.Data_ora ASC
        `;

        let result = await pool.request()
            .input('start', sql.DateTime, azi)
            .input('end', sql.DateTime, maine)
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

//5 cei mai noi clienti inregistrati
// routes.js

router.get('/admin/utilizatori_noi', async (req, res) => {
    try {
        let pool = await getDbConnection();

        let query = `
            SELECT TOP 5
                Nume,
                Prenume,
                Email,
                Data_creare
            FROM UTILIZATOR
            WHERE Rol = 'client'
            ORDER BY Data_creare DESC
        `;

        let result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

//top clienti vip
router.get('/stats/top_clienti', async (req, res) => {
    try {
        let pool = await getDbConnection();

        let query = `
            SELECT TOP 5
                U.Nume,
                U.Prenume,
                SUM(R.Total) as TotalCheltuit
            FROM REZERVARE R
            INNER JOIN UTILIZATOR U ON R.Utilizator_ID = U.Utilizator_ID
            WHERE LOWER(R.Status) <> 'anulata'
            GROUP BY U.Utilizator_ID, U.Nume, U.Prenume
            ORDER BY TotalCheltuit DESC
        `;

        let result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Eroare server");
    }
});

module.exports = router; // <--- OBLIGATORIU LA FINAL