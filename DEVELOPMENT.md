# RoboStik - Development Guide

## Hitri start

### 1. Kloniraj in nastavi
```bash
# Kloniraj repo
git clone <github-repo>
cd robostik

# Nastavi virtualno okolje
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Namesti odvisnosti
pip install -r requirements.txt
```

### 2. Nastavi okoljske spremenljivke
```bash
cp .env.example .env
# Uredi .env po potrebi (NAO_IP, NAO_PORT, itd.)
```

### 3. Zaženi aplikacijo
```bash
python run.py
```

Aplikacija bo dostopna na: **http://127.0.0.1:5000**

---

## Struktura projekta

```
robostik/
├── app/                    # Flask aplikacija
│   ├── __init__.py         # Inicijalizacija
│   ├── routes.py           # REST API endpoint-i
│   ├── nao_controller.py   # NAO SDK wrapper
│   ├── static/             # Frontend assets
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── app.js
│   └── templates/
│       └── index.html      # HTML vmesnik
├── run.py                  # Entry point
├── requirements.txt        # Python odvisnosti
├── .env.example            # Predloga za .env
├── .gitignore
├── LICENSE (MIT)
└── README.md
```

---

## REST API Dokumentacija

### Stanje robota
```
GET /api/status
```

Vrne: `{ connected: boolean, nao_ip, nao_port, sdk_available, message }`

### Seznam behaviourjev
```
GET /api/behaviours
```

Vrne: `{ behaviours: [], count: int }`

### Zaženi behaviour
```
POST /api/behaviours/<name>/start
```

Vrne: `{ success: boolean, message, behaviour }`

### Ustavi behaviour
```
POST /api/behaviours/<name>/stop
```

Vrne: `{ success: boolean, message, behaviour }`

---

## Razvoj

### Virtualni robot
1. Odpri Choregraphe: `/home/atomicmind/APPS/nao/bin/choregraphe`
2. Zaženi Virtual Robot na `127.0.0.1:9559`
3. Učitaj behaviour file in testiraj

### Testiranje API-ja
```bash
# Preveri status
curl http://127.0.0.1:5000/api/status

# Pridobi behaviourje
curl http://127.0.0.1:5000/api/behaviours

# Zaženi behaviour
curl -X POST http://127.0.0.1:5000/api/behaviours/MyBehaviour/start

# Ustavi behaviour
curl -X POST http://127.0.0.1:5000/api/behaviours/MyBehaviour/stop
```

---

## GitHub Setup

### Inicijalizacija repozitorija
```bash
git init
git add .
git commit -m "Initial commit: RoboStik Flask aplikacija"

# Dodaj remote (zamenjaj <username> in <repo-name>)
git remote add origin https://github.com/<username>/<repo-name>.git
git branch -M main
git push -u origin main
```

### Priporočena .gitignore pravila
(Že vključeno v .gitignore)

---

## Nadaljnji koraki

- [ ] Presikanji na čakanih behaviourjih (stop listener)
- [ ] Dodaj avtentifikacijo (token-based)
- [ ] Implementiraj WebSocket za real-time statusne update-e
- [ ] Dodaj možnost upload behaviourjev
- [ ] Dodaj logging na strežnik
- [ ] Docker setup za lažnejše deployment

---

## Kontakt in Prispevanje

**Zavod Qualia**  
Licenca: MIT

Čustviti si ogledej [CONTRIBUTING.md](CONTRIBUTING.md) (pri potrebi ustvari).
