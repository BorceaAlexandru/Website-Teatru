// public/js/login.js

function arataRegister() {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-register').classList.remove('hidden');
    document.getElementById('mesaj').innerText = ""; // Curatam erorile vechi
}

function arataLogin() {
    document.getElementById('form-register').classList.add('hidden');
    document.getElementById('form-login').classList.remove('hidden');
    document.getElementById('mesaj').innerText = "";
}

// --- LOGICA LOGIN ---
async function faLogin() {
    const email = document.getElementById('login-email').value;
    const parola = document.getElementById('login-parola').value;
    const mesaj = document.getElementById('mesaj');
    
    // Curatam mesajul anterior
    mesaj.innerText = "";
    mesaj.style.color = "red";

    try {
        const res = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, parola })
        });

        const data = await res.json();

        if (data.succes) {
            // SUCCES: Salvam userul si redirectionam INSTANT la Home (index.html)
            localStorage.setItem('user', JSON.stringify(data.utilizator)); 
            window.location.href = 'index.html'; 
        } else {
            // EROARE: Afisam text rosu jos (fara popup)
            mesaj.innerText = "Email sau parolă greșită!";
        }

    } catch (err) {
        console.error(err);
        mesaj.innerText = "Eroare de conexiune server.";
    }
}

// --- LOGICA REGISTER ---
async function faRegister() {
    const nume = document.getElementById('reg-nume').value;
    const prenume = document.getElementById('reg-prenume').value;
    const email = document.getElementById('reg-email').value;
    const parola = document.getElementById('reg-parola').value;
    const mesaj = document.getElementById('mesaj');

    mesaj.innerText = "";
    mesaj.style.color = "red";

    try {
        const res = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nume, prenume, email, parola })
        });

        const data = await res.json();

        if (data.succes) {
            // SUCCES: Nu dam popup, te ducem direct la formularul de login
            // Optional: poti pune un mesaj mic cu verde ca s-a creat
            mesaj.style.color = "green";
            mesaj.innerText = "Cont creat! Te poți loga.";
            
            // Intarziem putin comutarea sau o facem instant (aici instant arata login-ul)
            setTimeout(() => {
                arataLogin();
                // Curatam mesajul verde dupa ce apare loginul ca sa nu incurce
                document.getElementById('mesaj').innerText = "";
            }, 1000);
            
        } else {
            // EROARE
            mesaj.innerText = data.mesaj || "Eroare la înregistrare.";
        }

    } catch (err) {
        console.error(err);
        mesaj.innerText = "Eroare la înregistrare.";
    }
}