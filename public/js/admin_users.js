// public/js/admin_users.js

// 1. Verificam securitatea (Daca e Admin)
const adminUserString = localStorage.getItem('user');
if (!adminUserString) {
  window.location.href = 'login.html';
}

const adminUser = JSON.parse(adminUserString);

if (adminUser.Rol !== 'admin') {
  alert("Nu ai acces aici!");
  window.location.href = 'index.html';
  throw new Error("Acces interzis");
}

// 2. Incarcam lista de utilizatori
async function incarcaUtilizatori() {
  try {
    const res = await fetch('http://localhost:5000/api/users');
    const users = await res.json();

    const tbody = document.getElementById('lista-users');
    tbody.innerHTML = '';

    users.forEach(u => {
      const tr = document.createElement('tr');

      let culoareRol = u.Rol === 'admin' ? 'red' : (u.Rol === 'operator' ? 'orange' : 'green');

      let butoaneActiune = '';

      // Daca sunt EU (cel logat), nu afisez butoane
      if (u.Utilizator_ID === adminUser.Utilizator_ID) {
        butoaneActiune = '<span style="color:#95a5a6; font-style:italic;">Contul curent</span>';
      } else {
        // Butoane rol
        if (u.Rol === 'client') {
          butoaneActiune += `<button onclick="schimbaRol(${u.Utilizator_ID}, 'admin')" class="btn-mic btn-rosu">Fa Admin</button>`;
          butoaneActiune += `<button onclick="schimbaRol(${u.Utilizator_ID}, 'operator')" class="btn-mic btn-galben">Fa Operator</button>`;
        } else if (u.Rol === 'operator') {
          butoaneActiune += `<button onclick="schimbaRol(${u.Utilizator_ID}, 'admin')" class="btn-mic btn-rosu">Fa Admin</button>`;
          butoaneActiune += `<button onclick="schimbaRol(${u.Utilizator_ID}, 'client')" class="btn-mic btn-albastru">Fa Client</button>`;
        } else if (u.Rol === 'admin') {
          butoaneActiune += `<button onclick="schimbaRol(${u.Utilizator_ID}, 'operator')" class="btn-mic btn-galben">Fa Operator</button>`;
          butoaneActiune += `<button onclick="schimbaRol(${u.Utilizator_ID}, 'client')" class="btn-mic btn-albastru">Fa Client</button>`;
        }

        // Stergere normala (doar daca NU are rezervari active)
        butoaneActiune += `
          <button onclick="stergeUtilizator(${u.Utilizator_ID})"
                  class="btn-mic" style="background:#7f8c8d;">
            Sterge
          </button>
        `;

        // Force delete (sterge tot ce tine de el)
        butoaneActiune += `
          <button onclick="forceStergeUtilizator(${u.Utilizator_ID})"
                  class="btn-mic" style="background:#c0392b;">
            Force Delete
          </button>
        `;
      }

      tr.innerHTML = `
        <td>${u.Nume} ${u.Prenume}</td>
        <td>${u.Email}</td>
        <td style="color:${culoareRol}; font-weight:bold;">${u.Rol.toUpperCase()}</td>
        <td>${butoaneActiune}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    alert("Eroare la incarcarea utilizatorilor.");
  }
}

// 3. Functia de schimbare rol
async function schimbaRol(id, rolNou) {
  if (!confirm(`Sigur schimbi rolul in ${rolNou}?`)) return;

  try {
    const resp = await fetch(`http://localhost:5000/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noulRol: rolNou })
    });

    const data = await resp.json().catch(() => ({}));
    if (data && data.succes === false) {
      alert(data.mesaj || "Eroare la schimbare rol.");
    }

    incarcaUtilizatori();
  } catch (err) {
    console.error(err);
    alert("Eroare la actualizare.");
  }
}

// 4. Stergere normala
async function stergeUtilizator(userId) {
  if (!confirm("Ștergi utilizatorul? Dacă are rezervări active, va eșua.")) return;

  try {
    const resp = await fetch(`http://localhost:5000/api/users/${userId}`, { method: "DELETE" });
    const data = await resp.json();

    if (data.succes) {
      alert(data.mesaj || "Utilizator șters.");
      incarcaUtilizatori();
    } else {
      alert(data.mesaj || "Nu s-a putut șterge utilizatorul.");
    }
  } catch (e) {
    console.error(e);
    alert("Eroare la ștergere.");
  }
}

// 5. Force delete
async function forceStergeUtilizator(userId) {
  if (!confirm("FORCE DELETE: se vor șterge rezervările, biletele și facturile utilizatorului. Continui?")) return;

  try {
    const resp = await fetch(`http://localhost:5000/api/users/${userId}/force`, { method: "DELETE" });
    const data = await resp.json();

    if (data.succes) {
      alert(data.mesaj || "Utilizator șters complet (force).");
      incarcaUtilizatori();
    } else {
      alert(data.mesaj || "Nu s-a putut face force delete.");
    }
  } catch (e) {
    console.error(e);
    alert("Eroare la force delete.");
  }
}

// --- FUNCTIE NOUA: CAUTARE REZERVARI DUPA EMAIL ---
async function cautaRezervari() {
    const email = document.getElementById('input-email-cautare').value.trim();
    const zona = document.getElementById('zona-rezultate');
    const tbody = document.getElementById('tabel-rezultate-cautare');
    const mesaj = document.getElementById('mesaj-cautare');

    if (!email) {
        alert("Te rog introdu un email!");
        return;
    }

    // Afisam zona si resetam
    zona.classList.remove('hidden');
    tbody.innerHTML = '';
    mesaj.innerText = "Se caută...";

    try {
        // Apelam ruta noua
        // encodeURIComponent se asigura ca caracterele speciale din email (@, .) nu strica URL-ul
        const res = await fetch(`http://localhost:5000/api/admin/cauta_rezervari?email=${encodeURIComponent(email)}`);
        const rezervari = await res.json();

        if (rezervari.length === 0) {
            mesaj.innerText = "Nu s-au găsit rezervări pentru acest email.";
            return;
        }

        mesaj.innerText = ""; // Stergem mesajul de incarcare

        rezervari.forEach(r => {
            const dataSpec = new Date(r.Data_ora).toLocaleString('ro-RO');
            
            // Culoare in functie de status
            let culoare = r.Status === 'Confirmata' ? 'green' : (r.Status === 'Anulata' ? 'red' : 'gray');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:bold;">${r.Titlu}</td>
                <td>${dataSpec}</td>
                <td style="color:${culoare}; font-weight:bold;">${r.Status}</td>
                <td>${r.Total} RON</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        mesaj.innerText = "Eroare la server.";
    }
}

// --- FUNCTIE NOUA: INCARCA CEI MAI NOI CLIENTI ---
async function incarcaUtilizatoriNoi() {
    const tbody = document.getElementById('lista-utilizatori-noi');
    
    try {
        const res = await fetch('http://localhost:5000/api/admin/utilizatori_noi');
        const useri = await res.json();

        tbody.innerHTML = '';

        if (useri.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">Niciun utilizator nou.</td></tr>';
            return;
        }

        useri.forEach(u => {
            // Daca Data_creare e null in baza, punem "-"
            const dataInscriere = u.Data_creare 
                ? new Date(u.Data_creare).toLocaleDateString('ro-RO') 
                : "-";

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.Nume} ${u.Prenume}</strong></td>
                <td>${u.Email}</td>
                <td>${dataInscriere}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="3" style="color:red;">Eroare server.</td></tr>';
    }
}

// Pornim incarcarea
incarcaUtilizatori();
incarcaUtilizatoriNoi();