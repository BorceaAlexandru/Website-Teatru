# 🎭 Platformă de Teatru Online (Ticketing & Management)

<div align="center">
  <img src="logo_AB.jpg" alt="Logo Proiect" width="150" height="150" style="border-radius:50%">
  <br>
  <em>O soluție completă pentru gestionarea unui teatru digital: de la rezervarea biletelor și generarea facturilor, până la administrarea spectacolelor și a utilizatorilor.</em>
</div>

---

## 📖 Descriere Proiect

Acest proiect este o aplicație web full-stack robustă, dezvoltată pentru a digitaliza activitatea unui teatru. Sistemul servește două tipuri de utilizatori: **Clienții**, care pot explora repertoriul și cumpăra bilete, și **Personalul Administrativ**, care gestionează baza de date, programările și vânzările.

Punctul forte al aplicației este logica de backend complexă, care gestionează **concurența la rezervare** (prin tranzacții SQL), detectarea conflictelor de orar în săli și generarea automată a documentelor fiscale.

## 🚀 Funcționalități Cheie

### 👤 Pentru Clienți (Frontend)
* **Catalog Interactiv:** Vizualizare spectacole cu filtre după titlu și dată.
* **Sistem de Rezervare:** * Verificare în timp real a locurilor disponibile.
    * Algoritm inteligent de alocare a locurilor (selectează automat cele mai bune locuri disponibile).
* **Coș de Cumpărături:** Posibilitatea de a rezerva bilete pentru multiple spectacole simultan.
* **Cont Utilizator:**
    * Istoric complet al rezervărilor.
    * **Facturare:** Generare și vizualizare PDF pentru facturile fiscale aferente biletelor.
    * Posibilitatea de a anula rezervări (cu eliberarea automată a locurilor).

### 🛡️ Pentru Admin & Operatori (Backend & Dashboard)
* **Role-Based Access Control (RBAC):** Sistem de securitate pe 3 niveluri (Client, Operator, Admin).
* **Management Repertoriu (CRUD):** Adăugare/Editare/Ștergere spectacole.
* **Calendar & Programări:**
    * **Conflict Detection:** Sistemul previne suprapunerea spectacolelor în aceeași sală, calculând automat durata și intervalele orare.
* **Administrare Utilizatori:**
    * Promovare/Retrogradare roluri.
    * **Force Delete:** Ștergerea utilizatorilor și a tuturor datelor asociate (GDPR compliant logic).
* **Rapoarte & Statistici:**
    * Top spectacole vândute.
    * Top clienți VIP (în funcție de suma cheltuită).
    * Listă Guestbook pentru fiecare reprezentație.

## 🛠️ Tehnologii Folosite

* **Frontend:** HTML5, CSS3 (Custom Responsive Design), JavaScript (Vanilla ES6+).
* **Backend:** Node.js, Express.js.
* **Bază de Date:** Microsoft SQL Server (MSSQL).
* **Concepte:** REST API, SQL Transactions, ACID compliance, JWT (simulated via SessionStorage).

## ⚙️ Instalare și Configurare

### 1. Cerințe Preliminare
* [Node.js](https://nodejs.org/) instalat.
* Microsoft SQL Server (Local sau Express).

### 2. Configurare Bază de Date
Rulează scriptul SQL de mai jos în SSMS (SQL Server Management Studio) pentru a crea structura necesară și a popula datele inițiale (săli, locuri).

<details>
<summary>👉 <strong>Click aici pentru Scriptul SQL (Create Tables)</strong></summary>

```sql
CREATE DATABASE TeatruBazeDeDate;
GO
USE TeatruBazeDeDate;
GO

-- 1. TABELE PRINCIPALE
CREATE TABLE UTILIZATOR (
    Utilizator_ID INT PRIMARY KEY IDENTITY(1,1),
    Nume NVARCHAR(100),
    Prenume NVARCHAR(100),
    Email NVARCHAR(150) UNIQUE NOT NULL,
    Parola NVARCHAR(100) NOT NULL,
    Rol NVARCHAR(20) DEFAULT 'client', -- 'admin', 'operator', 'client'
    Data_creare DATETIME DEFAULT GETDATE()
);

CREATE TABLE SALA (
    Sala_ID INT PRIMARY KEY IDENTITY(1,1),
    Nume NVARCHAR(100),
    Numar_Locuri INT
);

CREATE TABLE SPECTACOL (
    Spectacol_ID INT PRIMARY KEY IDENTITY(1,1),
    Titlu NVARCHAR(200) NOT NULL,
    Regia NVARCHAR(100),
    Gen NVARCHAR(50),
    Durata_min INT,
    Descriere NVARCHAR(MAX),
    Imagine_URL NVARCHAR(500)
);

CREATE TABLE REPREZENTATIE (
    Reprezentatie_ID INT PRIMARY KEY IDENTITY(1,1),
    Spectacol_ID INT FOREIGN KEY REFERENCES SPECTACOL(Spectacol_ID),
    Sala_ID INT FOREIGN KEY REFERENCES SALA(Sala_ID),
    Data_ora DATETIME NOT NULL,
    Pret_Standard DECIMAL(10,2),
    Status NVARCHAR(50) DEFAULT 'Programata' -- 'Programata', 'Anulata'
);

-- 2. TABELE PENTRU REZERVARI SI LOCURI
CREATE TABLE LOC (
    Loc_ID INT PRIMARY KEY IDENTITY(1,1),
    Sala_ID INT FOREIGN KEY REFERENCES SALA(Sala_ID),
    Rand INT,
    Numar INT
);

CREATE TABLE REZERVARE (
    Rezervare_ID INT PRIMARY KEY IDENTITY(1,1),
    Utilizator_ID INT FOREIGN KEY REFERENCES UTILIZATOR(Utilizator_ID),
    Reprezentatie_ID INT FOREIGN KEY REFERENCES REPREZENTATIE(Reprezentatie_ID),
    Status NVARCHAR(50) DEFAULT 'Confirmata', -- 'Confirmata', 'Anulata'
    Total DECIMAL(10,2),
    Data_Creare DATETIME DEFAULT GETDATE()
);

CREATE TABLE REZERVARE_LOC (
    Rezervare_ID INT FOREIGN KEY REFERENCES REZERVARE(Rezervare_ID),
    Loc_ID INT FOREIGN KEY REFERENCES LOC(Loc_ID),
    PRIMARY KEY (Rezervare_ID, Loc_ID)
);

CREATE TABLE FACTURA (
    Factura_ID INT PRIMARY KEY IDENTITY(1,1),
    Rezervare_ID INT FOREIGN KEY REFERENCES REZERVARE(Rezervare_ID),
    Data_Factura DATETIME DEFAULT GETDATE(),
    Total DECIMAL(10,2),
    Nume_Client NVARCHAR(200),
    Adresa_Email NVARCHAR(150)
);

-- 3. SEED DATA (Date Inițiale Obligatorii)
-- Inserăm o Sală și generăm 50 de locuri automat
INSERT INTO SALA (Nume, Numar_Locuri) VALUES ('Sala Mare', 50);

DECLARE @i INT = 1;
WHILE @i <= 50
BEGIN
    INSERT INTO LOC (Sala_ID, Rand, Numar) VALUES (1, 1, @i);
    SET @i = @i + 1;
END

-- Inserăm un Admin default
INSERT INTO UTILIZATOR (Nume, Prenume, Email, Parola, Rol) 
VALUES ('Admin', 'Sistem', 'admin@teatru.ro', 'admin123', 'admin');
