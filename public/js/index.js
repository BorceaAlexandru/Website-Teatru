// public/js/index.js - CORECTAT PENTRU NOILE DATE

// 1. Verificam daca userul e logat
const userNavString = localStorage.getItem('user');
const navbar = document.getElementById('navbar');

if (userNavString) {
    const user = JSON.parse(userNavString);
    
    // ATENTIE: Folosim litera mare (Rol, Prenume) cum vin din SQL
    const numeAfisat = user.Prenume || user.Nume || "Utilizator"; 
    const rol = user.Rol || "client"; // Default client daca nu are rol

    let meniuAdmin = '';

    // Daca e ADMIN
    if (rol === 'admin') {
        meniuAdmin = `
            <a href="gestiune_spectacole.html" class="nav-item btn-galben"><i class="fa fa-edit"></i> Gestiune</a>
            <a href="programare.html" class="nav-item btn-galben"><i class="fa fa-calendar-plus"></i> Programare</a>
            <a href="admin_users.html" class="nav-item btn-rosu"><i class="fa fa-users"></i> Admin</a>
        `;
    }
    // Daca e OPERATOR
    else if (rol === 'operator') {
        meniuAdmin = `
            <a href="gestiune_spectacole.html" class="nav-item btn-galben"><i class="fa fa-edit"></i> Gestiune</a>
            <a href="programare.html" class="nav-item btn-galben"><i class="fa fa-calendar-plus"></i> Programare</a>
        `;
    }

    // HTML-ul pentru utilizator logat
    navbar.innerHTML = `
        <div class="nav-left">
            <a href="index.html" class="logo"><i class="fa fa-masks-theater"></i> Teatru Online</a>
        </div>
        <div class="nav-right">
            <a href="spectacole.html" class="nav-item"><i class="fa fa-ticket"></i> Spectacole</a>
            <a href="contact.html" class="nav-item"><i class="fa fa-envelope"></i> Contact</a>
            <a href="cos.html" class="nav-item"><i class="fa fa-shopping-cart"></i> Coș</a>
            
            ${meniuAdmin} <a href="cont.html" class="nav-item user-pill">
                <i class="fa fa-user-circle"></i> ${numeAfisat}
            </a>
            <a href="#" onclick="logout()" class="nav-item logout-btn">
                <i class="fa fa-sign-out-alt"></i> Ieșire
            </a>
        </div>
    `;

} else {
    // HTML-ul pentru vizitator (Nelogat)
    navbar.innerHTML = `
        <div class="nav-left">
            <a href="index.html" class="logo"><i class="fa fa-masks-theater"></i> Teatru Online</a>
        </div>
        <div class="nav-right">
            <a href="spectacole.html" class="nav-item"><i class="fa fa-ticket"></i> Spectacole</a>
            <a href="contact.html" class="nav-item"><i class="fa fa-envelope"></i> Contact</a>
            <a href="login.html" class="nav-item"><i class="fa fa-sign-in-alt"></i> Autentificare</a>
        </div>
    `;
}

// Functia de Logout
function logout() {
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.href = 'login.html';
}

async function incarcaTopSpectacole() {
  const tbody = document.getElementById("top-spectacole-body");
  if (!tbody) return; // daca nu suntem pe home, iesim

  try {
    const res = await fetch("http://localhost:5000/api/stats/top_spectacole?top=5");
    const data = await res.json();

    tbody.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3">Nu există vânzări încă.</td></tr>`;
      return;
    }

    data.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:bold;">${idx + 1}</td>
        <td>${row.Titlu}</td>
        <td style="text-align:center;">${row.BileteVandute}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="3">Eroare la încărcare.</td></tr>`;
  }
}

// --- FUNCTIE NOUA: TOP CLIENTI VIP ---
async function incarcaTopClienti() {
    const tbody = document.getElementById("top-clienti-body");
    if (!tbody) return; // Daca nu suntem pe homepage, iesim

    try {
        const res = await fetch("http://localhost:5000/api/stats/top_clienti");
        const data = await res.json();

        tbody.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nu există date.</td></tr>`;
            return;
        }

        data.forEach((row, idx) => {
            const tr = document.createElement("tr");
            
            // Adaugam o iconita de coroana pentru locul 1
            const icon = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : idx + 1));

            tr.innerHTML = `
                <td style="font-weight:bold; text-align:center;">${icon}</td>
                <td>${row.Nume} ${row.Prenume}</td>
                <td style="text-align:center; font-weight:bold; color:#27ae60;">
                    ${row.TotalCheltuit.toFixed(2)} RON
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Eroare.</td></tr>`;
    }
}

// apelează după ce pagina s-a încărcat
incarcaTopSpectacole();
incarcaTopClienti();