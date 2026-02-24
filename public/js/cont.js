// public/js/cont.js

// 1. Verificare Login
const currentUserProfileString = localStorage.getItem('user');
if (!currentUserProfileString) window.location.href = 'login.html';
const currentUserProfile = JSON.parse(currentUserProfileString);

// 2. Completare date personale sus
document.getElementById('nume-user').innerText = `${currentUserProfile.Nume} ${currentUserProfile.Prenume}`;
document.getElementById('email-user').innerText = currentUserProfile.Email;
document.getElementById('rol-user').innerText = (currentUserProfile.Rol || "").toUpperCase();

// 3. Deschide factura
function deschideFactura(rezervareId) {
  window.open(`factura_view.html?id=${rezervareId}`, '_blank', 'width=800,height=600');
}

// 4. Anuleaza rezervare
async function anuleazaRezervare(rezervareId) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert("Trebuie să fii logat.");
    window.location.href = "login.html";
    return;
  }

  if (!confirm("Sigur vrei să anulezi această rezervare?")) return;

  try {
    const resp = await fetch("http://localhost:5000/api/anuleaza_rezervare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rezervareId: rezervareId,
        utilizatorId: user.Utilizator_ID
      })
    });

    const data = await resp.json();

    if (data.succes) {
      alert(data.mesaj || "Rezervarea a fost anulată.");
      // IMPORTANT: la tine funcția corectă e incarcaIstoric()
      await incarcaIstoric();
    } else {
      alert(data.mesaj || "Nu s-a putut anula rezervarea.");
    }
  } catch (e) {
    console.error(e);
    alert("Eroare la anulare.");
  }
}

// 5. Incarcare Istoric
async function incarcaIstoric() {
  try {
    const res = await fetch(`http://localhost:5000/api/istoric_rezervari/${currentUserProfile.Utilizator_ID}`);
    const rezervari = await res.json();

    const tbody = document.getElementById('lista-istoric');
    const mesajGol = document.getElementById('fara-rezervari');

    // curatam tabelul ca sa nu dubleze randurile la refresh
    tbody.innerHTML = "";

    if (!Array.isArray(rezervari) || rezervari.length === 0) {
      mesajGol.classList.remove('hidden');
      return;
    } else {
      mesajGol.classList.add('hidden');
    }

    rezervari.forEach(r => {
      const dataSpec = new Date(r.Data_Spectacol).toLocaleString('ro-RO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const dataComanda = new Date(r.Data_Creare).toLocaleDateString('ro-RO');

      const esteAnulata = ((r.Status || "").toLowerCase() === "anulata");

      const tr = document.createElement('tr');

      // Buton factura
      const butonFactura = `
        <button onclick="deschideFactura(${r.Rezervare_ID})"
                style="background:#e67e22; color:white; border:none; border-radius:4px; padding:2px 8px; cursor:pointer; margin-left:10px;"
                title="Vezi Factura">
          <i class="fa fa-file-invoice"></i>
        </button>
      `;

      // Buton anulare
      const butonAnulare = `
        <button onclick="anuleazaRezervare(${r.Rezervare_ID})"
                ${esteAnulata ? "disabled" : ""}
                style="background:${esteAnulata ? "#7f8c8d" : "#c0392b"}; color:white; border:none; border-radius:4px; padding:2px 8px; cursor:${esteAnulata ? "not-allowed" : "pointer"}; margin-left:10px;"
                title="${esteAnulata ? "Rezervare deja anulată" : "Anulează rezervarea"}">
          <i class="fa fa-times"></i>
        </button>
      `;

      tr.innerHTML = `
        <td style="font-weight:bold; color:#2c3e50;">${r.Titlu}</td>
        <td>${r.Nume_Sala}</td>
        <td>${dataSpec}</td>
        <td style="text-align:center;">
          <span style="background:#3498db; color:white; padding:2px 8px; border-radius:10px;">
            ${r.Nr_Bilete}
          </span>
        </td>
        <td>${dataComanda}</td>
        <td>
          <span style="color:${esteAnulata ? "#c0392b" : "green"}; font-weight:bold;">
            ${r.Status}
          </span>
          ${butonFactura}
          ${butonAnulare}
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
  }
}

// Functie NOUA pentru incarcarea facturilor
async function incarcaFacturi() {
    try {
        const userId = currentUserProfile.Utilizator_ID; // Luam ID-ul din variabila globala existenta
        const res = await fetch(`http://localhost:5000/api/facturile_mele/${userId}`);
        const facturi = await res.json();

        const tbody = document.getElementById('lista-facturi');
        const msgGol = document.getElementById('fara-facturi');

        tbody.innerHTML = '';

        if (!Array.isArray(facturi) || facturi.length === 0) {
            msgGol.classList.remove('hidden');
            return;
        } else {
            msgGol.classList.add('hidden');
        }

        facturi.forEach(f => {
            const tr = document.createElement('tr');
            
            // Formatam data
            const dataF = new Date(f.Data_Factura).toLocaleDateString('ro-RO');

            // Formatam numarul facturii (ex: 000025)
            const nrFactura = String(f.Factura_ID).padStart(6, '0');

            tr.innerHTML = `
                <td style="font-weight:bold;">TO-${nrFactura}</td>
                <td>${dataF}</td>
                <td>${f.Nume_Client}</td>
                <td style="font-weight:bold; color:#2c3e50;">${f.Total.toFixed(2)}</td>
                <td>
                    <button onclick="deschideFactura(${f.Rezervare_ID})" 
                            class="btn-mic" 
                            style="background:#e67e22; color:white; border:none; border-radius:4px; padding:6px 12px; cursor:pointer;">
                        <i class="fa fa-eye"></i> Vezi PDF
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Eroare incarcare facturi:", err);
    }
}

// 6. Initial load
incarcaIstoric();
incarcaFacturi();
