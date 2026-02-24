// public/js/cos.js - VARIANTA MULTIPLA (cu locuri disponibile)

// 1. Verificam userul
const currentUserString = localStorage.getItem('user');
if (!currentUserString) window.location.href = 'login.html';
const currentUser = JSON.parse(currentUserString);

// 2. Citim LISTA de ID-uri
let listaCos = JSON.parse(sessionStorage.getItem('cos_virtual') || '[]');

if (listaCos.length === 0) {
  alert("Coșul este gol. Alege un spectacol!");
  window.location.href = 'spectacole.html';
}

// Preturi + disponibilitate
let preturiSpectacole = {};
let disponibilitate = {}; // { idRep: { total, liber } }

async function getLocuriDisponibile(idRep) {
  try {
    const res = await fetch(`http://localhost:5000/api/locuri_disponibile/${idRep}`);
    const data = await res.json();
    if (!data.succes) return null;

    return {
      total: Number(data.totalLocuri),
      liber: Number(data.locuriDisponibile)
    };
  } catch (e) {
    return null;
  }
}

async function incarcaCos() {
  const container = document.getElementById('lista-produse');
  container.innerHTML = '';

  for (let i = 0; i < listaCos.length; i++) {
    const idRep = listaCos[i];

    try {
      const res = await fetch(`http://localhost:5000/api/detalii_reprezentatie/${idRep}`);
      const data = await res.json();

      if (data.length > 0) {
        const info = data[0];
        preturiSpectacole[idRep] = info.Pret_Standard;

        // luam disponibilitatea
        const disp = await getLocuriDisponibile(idRep);
        if (disp) disponibilitate[idRep] = disp;

        const div = document.createElement('div');
        div.className = 'produs-cos';
        div.style.borderBottom = "1px solid #ddd";
        div.style.padding = "20px 0";

        const textLocuri = disp ? `${disp.liber} / ${disp.total}` : "?";
        const maxQty = disp ? Math.max(0, Math.min(10, disp.liber)) : 10;
        const disabledQty = disp && disp.liber <= 0 ? "disabled" : "";

        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h3 style="margin:0; color:#2c3e50;">${info.Titlu}</h3>
              <p style="margin:5px 0; color:#7f8c8d;">
                <i class="fa fa-calendar"></i> ${new Date(info.Data_ora).toLocaleString('ro-RO')} |
                <i class="fa fa-map-marker"></i> ${info.Nume_Sala}
              </p>
              <p style="margin:5px 0; color:#7f8c8d;">
                <i class="fa fa-chair"></i> Locuri disponibile: <strong id="disp-${idRep}">${textLocuri}</strong>
              </p>
            </div>
            <button onclick="stergeProdus(${i})" class="btn-sterge-mic" title="Elimină">
              <i class="fa fa-times"></i>
            </button>
          </div>

          <div class="info-row" style="margin-top:15px; align-items:center;">
            <span>Preț: <strong>${info.Pret_Standard} RON</strong> x </span>
            <input type="number" id="qty-${idRep}" value="${(disp && disp.liber > 0) ? 1 : 0}"
                   min="0" max="${maxQty}"
                   style="width:50px; padding:5px; text-align:center;"
                   onchange="recalculeazaTotal()"
                   ${disabledQty}>
            <span> bilete</span>
          </div>

          ${(disp && disp.liber <= 0) ? `<p style="color:#c0392b; margin-top:10px;">Nu mai sunt locuri pentru această reprezentație.</p>` : ``}
        `;

        container.appendChild(div);
      }
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('continut-cos').classList.remove('hidden');
  recalculeazaTotal();
}

function stergeProdus(indexDinLista) {
  if (confirm("Elimini acest spectacol?")) {
    listaCos.splice(indexDinLista, 1);
    sessionStorage.setItem('cos_virtual', JSON.stringify(listaCos));

    if (listaCos.length === 0) {
      window.location.href = 'spectacole.html';
    } else {
      incarcaCos();
    }
  }
}

function recalculeazaTotal() {
  let total = 0;

  listaCos.forEach(id => {
    const inputQty = document.getElementById(`qty-${id}`);
    if (inputQty) {
      const qty = parseInt(inputQty.value || "0", 10);
      const pret = preturiSpectacole[id] || 0;
      total += (qty * pret);
    }
  });

  document.getElementById('total-general').innerText = total.toFixed(2);
}

async function finalizareMultipla() {
  const mesaj = document.getElementById('mesaj-eroare');
  mesaj.innerText = "Se procesează...";

  for (const idRep of listaCos) {
    const qty = parseInt(document.getElementById(`qty-${idRep}`).value || "0", 10);

    if (qty <= 0) continue; // daca user a pus 0, sarim peste

    // verificare finala, live
    const disp = await getLocuriDisponibile(idRep);
    if (disp && qty > disp.liber) {
      alert(`Nu sunt suficiente locuri pentru reprezentația ${idRep}. Disponibile acum: ${disp.liber}.`);
      mesaj.innerText = "";
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/rezerva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utilizatorId: currentUser.Utilizator_ID,
          reprezentatieId: idRep,
          nrBilete: qty
        })
      });

      const rasp = await res.json();

      if (!rasp.succes) {
        alert(`Eroare la spectacolul ID ${idRep}: ${rasp.mesaj}`);
        mesaj.innerText = "";
        return;
      }
    } catch (err) {
      alert("Eroare conexiune server.");
      mesaj.innerText = "";
      return;
    }
  }

  alert("Toate rezervările au fost efectuate cu succes!");
  sessionStorage.removeItem('cos_virtual');
  window.location.href = 'spectacole.html';
}

incarcaCos();
