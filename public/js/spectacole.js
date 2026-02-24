// public/js/spectacole.js

async function incarcaLocuriDisponibile(reprezentatieId) {
  try {
    const res = await fetch(`http://localhost:5000/api/locuri_disponibile/${reprezentatieId}`);
    const data = await res.json();

    const span = document.getElementById(`locuri-${reprezentatieId}`);
    const btn = document.getElementById(`btn-rezerva-${reprezentatieId}`);

    if (!span) return;

    if (!data.succes) {
      span.innerText = "?";
      return;
    }

    span.innerText = `${data.locuriDisponibile} / ${data.totalLocuri}`;

    // daca nu mai sunt locuri, dezactiveaza butonul
    if (btn && Number(data.locuriDisponibile) <= 0) {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.style.cursor = "not-allowed";
      btn.innerText = "Sold out";
    }
  } catch (e) {
    const span = document.getElementById(`locuri-${reprezentatieId}`);
    if (span) span.innerText = "?";
  }
}

// Functia principala de incarcare
async function incarcaSpectacole(filtruTitlu = '', filtruData = '') {
  const container = document.getElementById('grid-spectacole');
  container.innerHTML = '<p style="text-align:center">Se caută...</p>';

  try {
    let url = `http://localhost:5000/api/spectacole?t=1`;

    if (filtruTitlu) url += `&titlu=${encodeURIComponent(filtruTitlu)}`;
    if (filtruData) url += `&data=${encodeURIComponent(filtruData)}`;

    const raspuns = await fetch(url);
    const spectacole = await raspuns.json();

    container.innerHTML = '';

    if (spectacole.length === 0) {
      container.innerHTML = '<p style="text-align:center; width:100%;">Nu am găsit niciun spectacol conform criteriilor.</p>';
      return;
    }

    spectacole.forEach(s => {
      const dataData = new Date(s.Data_ora).toLocaleDateString('ro-RO');
      const dataOra = new Date(s.Data_ora).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
      const imgUrl = s.Imagine_URL ? s.Imagine_URL : 'https://via.placeholder.com/300x200?text=Teatru';

      const card = document.createElement('div');
      card.className = 'card-spectacol';
      card.innerHTML = `
        <img src="${imgUrl}" alt="${s.Titlu}">
        <div class="card-content">
          <h3>${s.Titlu}</h3>
          <p class="gen">${s.Gen} | ${s.Durata_min} min</p>
          <p class="sala"><i class="fa fa-map-marker"></i> ${s.Nume_Sala}</p>
          <p class="data"><i class="fa fa-calendar"></i> ${dataData} - Ora ${dataOra}</p>

          <p class="sala" style="margin-top:6px;">
            <i class="fa fa-chair"></i> Locuri: <span id="locuri-${s.Reprezentatie_ID}">Se calculează...</span>
          </p>

          <div class="pret-row">
            <span class="pret">${s.Pret_Standard} RON</span>
            <button id="btn-rezerva-${s.Reprezentatie_ID}" class="btn-rezerva" onclick="adaugaInCos(${s.Reprezentatie_ID})">
              Rezervă
            </button>
          </div>
        </div>
      `;
      container.appendChild(card);

      // incarcam locurile dupa ce am pus cardul in DOM
      incarcaLocuriDisponibile(s.Reprezentatie_ID);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Eroare la conexiune.</p>';
  }
}

function aplicaFiltre() {
  const titlu = document.getElementById('cauta-titlu').value;
  const data = document.getElementById('cauta-data').value;
  incarcaSpectacole(titlu, data);
}

function resetFiltre() {
  document.getElementById('cauta-titlu').value = '';
  document.getElementById('cauta-data').value = '';
  incarcaSpectacole();
}

async function adaugaInCos(reprezentatieId) {
  const userString = localStorage.getItem('user');

  if (!userString) {
    alert("Trebuie să te loghezi pentru a rezerva bilete!");
    window.location.href = 'login.html';
    return;
  }

  // verificare rapida: daca nu sunt locuri, nu-l lasa sa intre in cos
  try {
    const res = await fetch(`http://localhost:5000/api/locuri_disponibile/${reprezentatieId}`);
    const d = await res.json();
    if (d.succes && Number(d.locuriDisponibile) <= 0) {
      alert("Nu mai sunt locuri disponibile la această reprezentație.");
      return;
    }
  } catch (_) {
    // daca pica verificarea, lasam serverul sa valideze la rezervare
  }

  let cosCumparaturi = JSON.parse(sessionStorage.getItem('cos_virtual') || '[]');

  if (cosCumparaturi.includes(reprezentatieId)) {
    alert("Acest spectacol este deja în coșul tău!");
    window.location.href = 'cos.html';
    return;
  }

  cosCumparaturi.push(reprezentatieId);
  sessionStorage.setItem('cos_virtual', JSON.stringify(cosCumparaturi));
  window.location.href = 'cos.html';
}

incarcaSpectacole();
