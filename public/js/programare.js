// public/js/programare.js

// ===============================
// 1) Securitate: doar admin/operator
// ===============================
const userStr = localStorage.getItem("user");
if (!userStr) window.location.href = "login.html";

const user = JSON.parse(userStr);
if (!user || (user.Rol !== "admin" && user.Rol !== "operator")) {
  alert("Nu ai acces aici!");
  window.location.href = "index.html";
}

// ===============================
// 2) Elemente UI
// ===============================
const selectSpectacol = document.getElementById("select-spectacol");
const selectSala = document.getElementById("select-sala");
const inputDataOra = document.getElementById("data-ora");
const inputPret = document.getElementById("pret");
const tbodyProgramari = document.getElementById("lista-programari");

// ===============================
// 3) Helper: formatare dată
// ===============================
function formatDataOra(roDate) {
  try {
    return new Date(roDate).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return roDate;
  }
}

// ===============================
// 4) Încărcare dropdown Spectacole
// ===============================
async function incarcaSpectacoleDropdown() {
  selectSpectacol.innerHTML = `<option value="">-- Alege Spectacolul --</option>`;

  const res = await fetch("http://localhost:5000/api/catalog_spectacole");
  const data = await res.json();

  data.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.Spectacol_ID;
    opt.textContent = s.Titlu;
    selectSpectacol.appendChild(opt);
  });
}

// ===============================
// 5) Încărcare dropdown Săli
// ===============================
async function incarcaSaliDropdown() {
  selectSala.innerHTML = `<option value="">-- Alege Sala --</option>`;

  const res = await fetch("http://localhost:5000/api/sali");
  const data = await res.json();

  data.forEach((sl) => {
    const opt = document.createElement("option");
    opt.value = sl.Sala_ID;
    opt.textContent = sl.Nume;
    selectSala.appendChild(opt);
  });
}

// ===============================
// 6) Încărcare tabel programări (Calendar Activ)
//    - ascunde Anulata
//    - tratează Status NULL ca "Programata"
// ===============================
async function incarcaProgramari() {
  tbodyProgramari.innerHTML = "";

  try {
    const res = await fetch("http://localhost:5000/api/programari_admin");
    const programari = await res.json();

    // filtrăm: nu afișăm Anulata
    const active = programari.filter((p) => {
      const st = (p.Status || "Programata").toLowerCase();
      return st !== "anulata";
    });

    if (active.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" style="text-align:center; color:#7f8c8d; padding:14px;">
        Nu există reprezentații active în calendar.
      </td>`;
      tbodyProgramari.appendChild(tr);
      return;
    }

    active.forEach((p) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${formatDataOra(p.Data_ora)}</td>
        <td style="font-weight:bold;">${p.Titlu}</td>
        <td>${p.Nume_Sala}</td>
        <td>${Number(p.Pret_Standard).toFixed(2)} RON</td>
        <td>
          <button
            onclick="arataGuestList(${p.Reprezentatie_ID})"
            class="btn-mic"
            style="background:#3498db; color:white; border:none; border-radius:6px; padding:7px 14px; cursor:pointer; margin-right:5px;"
            title="Vezi cine a cumpărat">
            <i class="fa fa-list"></i> Listă
          </button>

          <button
            onclick="stergeProgramare(${p.Reprezentatie_ID})"
            class="btn-mic"
            style="background:#e74c3c; color:white; border:none; border-radius:6px; padding:7px 14px; cursor:pointer;">
            <i class="fa fa-times"></i>
          </button>
        </td>
      `;

      tbodyProgramari.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" style="text-align:center; color:#c0392b; padding:14px;">
      Eroare la încărcarea programărilor.
    </td>`;
    tbodyProgramari.appendChild(tr);
  }
}

// ===============================
// 7) POST: Salvează programare
// ===============================
window.salveazaProgramare = async function (event) {
  event.preventDefault();

  const spectacolId = parseInt(selectSpectacol.value, 10);
  const salaId = parseInt(selectSala.value, 10);
  const dataOra = inputDataOra.value; // "YYYY-MM-DDTHH:mm"
  const pret = parseFloat(inputPret.value);

  if (!spectacolId || !salaId || !dataOra || isNaN(pret)) {
    alert("Completează toate câmpurile corect.");
    return;
  }

  try {
    const resp = await fetch("http://localhost:5000/api/programari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spectacolId, salaId, dataOra, pret }),
    });

    const data = await resp.json();

    if (!resp.ok || data.succes === false) {
      alert(data.mesaj || "Nu s-a putut publica programarea.");
      return;
    }

    alert(data.mesaj || "Reprezentație publicată în calendar!");

    // reset form
    selectSpectacol.value = "";
    selectSala.value = "";
    inputDataOra.value = "";
    inputPret.value = "";

    // reload tabel
    incarcaProgramari();
  } catch (e) {
    console.error(e);
    alert("Eroare la server la publicare.");
  }
};

// ===============================
// 8) DELETE: Anulează/șterge programare (în backend faci soft delete)
// ===============================
window.stergeProgramare = async function (reprezentatieId) {
  if (!confirm("Sigur vrei să anulezi această reprezentație?")) return;

  try {
    const resp = await fetch(
      `http://localhost:5000/api/programari/${reprezentatieId}`,
      { method: "DELETE" }
    );

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || data.succes === false) {
      alert(data.mesaj || "Nu s-a putut anula reprezentația.");
      return;
    }

    alert(data.mesaj || "Reprezentație anulată!");
    incarcaProgramari();
  } catch (e) {
    console.error(e);
    alert("Eroare la anulare.");
  }
};

// ===============================
// 9) Init
// ===============================
(async function init() {
  try {
    await incarcaSpectacoleDropdown();
    await incarcaSaliDropdown();
    await incarcaProgramari();
  } catch (e) {
    console.error(e);
    alert("Eroare la inițializare (dropdown/tabel).");
  }
})();

// ===============================
// 10) LOGICA GUEST LIST (MODAL)
// ===============================

window.arataGuestList = async function(idRep) {
    const modal = document.getElementById('modal-guest');
    const tbody = document.getElementById('tabel-guest-body');
    const msg = document.getElementById('guest-msg');
    
    // Curatam datele vechi
    tbody.innerHTML = '';
    msg.innerText = 'Se încarcă lista...';
    
    // Afisam fereastra
    modal.classList.remove('hidden');

    try {
        // Apelam ruta simpla din backend
        const res = await fetch(`http://localhost:5000/api/guestlist/${idRep}`);
        const data = await res.json();

        // Verificam daca avem rezultate
        if (!Array.isArray(data) || data.length === 0) {
            msg.innerText = 'Niciun spectator găsit pentru această reprezentație.';
            return;
        }

        msg.innerText = ''; // Stergem mesajul de incarcare

        // Construim tabelul simplu (Nume, Email, Status)
        data.forEach(client => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${client.Nume} ${client.Prenume}</strong></td>
                <td>${client.Email}</td>
                <td>
                    <span class="badge ${client.Status === 'Confirmata' ? 'client' : 'operator'}" 
                          style="background-color: ${client.Status === 'Confirmata' ? '#27ae60' : '#95a5a6'};">
                        ${client.Status}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        msg.innerText = "Eroare la încărcarea listei.";
    }
};

window.inchideModal = function() {
    document.getElementById('modal-guest').classList.add('hidden');
};

// Inchide modalul daca dai click pe fundalul negru
const modalOverlay = document.getElementById('modal-guest');
if(modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            inchideModal();
        }
    });
}

// --- FUNCTIE NOUA: PROGRAMUL DE AZI ---
window.arataProgramAzi = async function() {
    const tbody = document.getElementById('lista-programari');
    
    // Resetam dropdown-ul de sali ca sa nu fie confuzie
    document.getElementById('filtru-sala').value = "";

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Se încarcă programul de azi...</td></tr>';

    try {
        const res = await fetch("http://localhost:5000/api/admin/azi");
        const programari = await res.json();

        tbody.innerHTML = '';

        if (programari.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #7f8c8d;">Nu sunt spectacole programate astăzi.</td></tr>';
            return;
        }

        programari.forEach(p => {
            const tr = document.createElement("tr");
            
            // Refolosim structura standard a tabelului
            tr.innerHTML = `
                <td>${formatDataOra(p.Data_ora)}</td>
                <td style="font-weight:bold;">${p.Titlu}</td>
                <td>${p.Nume_Sala}</td>
                <td>${Number(p.Pret_Standard).toFixed(2)} RON</td>
                <td>
                    <button onclick="arataGuestList(${p.Reprezentatie_ID})" 
                            class="btn-mic" style="background:#3498db; color:white; border:none; padding:7px 14px; margin-right:5px;">
                        <i class="fa fa-list"></i>
                    </button>
                    <button onclick="stergeProgramare(${p.Reprezentatie_ID})"
                            class="btn-mic" style="background:#e74c3c; color:white; border:none; padding:7px 14px;">
                        <i class="fa fa-times"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Eroare server.</td></tr>';
    }
};