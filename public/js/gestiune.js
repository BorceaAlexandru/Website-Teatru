    // 1. Verificare acces (Operator sau Admin)
const userString = localStorage.getItem('user');
if (!userString) window.location.href = 'login.html';
const user = JSON.parse(userString);
if (user.rol === 'client') {
    alert("Nu ai acces aici!");
    window.location.href = 'index.html';
}

// 2. Incarcarea listei de spectacole
async function incarcaLista() {
    try {
        // Folosim ruta GET /spectacole pe care o aveam deja (cea simpla, sau facem una noua doar cu SELECT *)
        // Aici folosim ruta existenta care facea JOIN, dar e ok si asa.
        const res = await fetch('http://localhost:5000/api/spectacole'); 
        // NOTA: Ruta /api/spectacole returneaza reprezentatii.
        // Pentru gestiune, avem nevoie de TOATE spectacolele (si cele neprogramate).
        // Hai sa folosim o ruta noua in routes.js? 
        // Sau, mai simplu, modificam putin logica. 
        // MOMENTAN: Voi presupune ca faci o ruta noua GET /api/toate_spectacolele in pasul urmator.
        // SAU: Folosim un truc. Incarcam tot tabelul SPECTACOL.
        
        // PENTRU SIMPLITATE: Hai sa adaugam rapid o ruta GET simpla in routes.js
        const res2 = await fetch('http://localhost:5000/api/catalog_spectacole'); 
        const spectacole = await res2.json();

        const tbody = document.getElementById('lista-spectacole');
        tbody.innerHTML = '';

        spectacole.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${s.Titlu}</strong></td>
        <td>${s.Gen}</td>
        <td>${s.Regia}</td>
        
        <td style="font-weight: bold; color: #555;">${s.Durata_min} min</td>
        
        <td>
            <button onclick='editeaza(${JSON.stringify(s)})' class="btn-action btn-blue"><i class="fa fa-edit"></i></button>
            <button onclick="sterge(${s.Spectacol_ID})" class="btn-action btn-red"><i class="fa fa-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
});

    } catch (err) { console.error(err); }
}

// 3. Salvare (Insert sau Update)
async function salveazaSpectacol(e) {
    e.preventDefault();

    const id = document.getElementById('spec-id').value;
    const dateFormular = {
        titlu: document.getElementById('titlu').value,
        regia: document.getElementById('regia').value,
        gen: document.getElementById('gen').value,
        durata: document.getElementById('durata').value,
        descriere: document.getElementById('descriere').value,
        imagine: document.getElementById('imagine').value
    };

    let url = 'http://localhost:5000/api/spectacole';
    let method = 'POST';

    // Daca avem ID, inseamna ca facem UPDATE (PUT)
    if (id) {
        url += '/' + id;
        method = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dateFormular)
        });
        const data = await res.json();
        
        if (data.succes) {
            alert(data.mesaj);
            resetForm();
            incarcaLista();
        } else {
            alert("Eroare: " + data.mesaj);
        }
    } catch (err) { console.error(err); }
}

// 4. Pregatirea formularului pentru Editare
function editeaza(spectacol) {
    // Completam campurile cu datele din tabel
    document.getElementById('spec-id').value = spectacol.Spectacol_ID;
    document.getElementById('titlu').value = spectacol.Titlu;
    document.getElementById('regia').value = spectacol.Regia;
    document.getElementById('gen').value = spectacol.Gen;
    document.getElementById('durata').value = spectacol.Durata_min;
    document.getElementById('descriere').value = spectacol.Descriere || ''; // Daca e null, punem gol
    document.getElementById('imagine').value = spectacol.Imagine_URL || '';

    // Schimbam titlul si aratam butonul de anulare
    document.getElementById('form-title').innerText = "Modifică Spectacol";
    document.getElementById('btn-cancel').classList.remove('hidden');
    
    // Scroll sus la formular
    window.scrollTo(0,0);
}

// 5. Stergere
async function sterge(id) {
    if (!confirm("Sigur ștergi acest spectacol?")) return;
    try {
        const res = await fetch(`http://localhost:5000/api/spectacole/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.succes) {
            incarcaLista();
        } else {
            alert(data.mesaj);
        }
    } catch (err) { console.error(err); }
}

// 6. Resetare formular
function resetForm() {
    document.getElementById('form-spectacol').reset();
    document.getElementById('spec-id').value = '';
    document.getElementById('form-title').innerText = "Adaugă Spectacol Nou";
    document.getElementById('btn-cancel').classList.add('hidden');
}

// Pornire
incarcaLista();