# RoboStik - NAO v6 Web Interface

Web aplikacija za upravljanje obnašanj (behaviours) NAO v6 robota preko REST API in web vmesnika.

**Avtor:** Uporabnik  
**Nosilec:** Zavod Qualia  
**Licenca:** MIT

---

## Osnovni opis

RoboStik omogoča spletni nadzor NAO v6 robota:
- **Backend:** Python Flask REST API
- **Frontend:** HTML/CSS/JavaScript UI
- **Comportement:** Upravljanje behaviourjev prek NAOqi SDK
- **Robot:** Virtualni robot (NAOqi 2.9+)

---

## Setup

### 1. Kloniraj projekt
```bash
git clone <github-repo-url>
cd robostik
```

### 2. Nastavi virtualno okolje
```bash
python3 -m venv venv
source venv/bin/activate  # Na Windows: venv\Scripts\activate
```

### 3. Namesti odvisnosti
```bash
pip install -r requirements.txt
```

### 4. Nastavi okoljske spremenljivke
```bash
cp .env.example .env
# Uredi .env glede na potrebe (IP, port robota itd.)
```

### 5. Zaženi aplikacijo
```bash
python run.py
```

Aplikacija bo dostopna na `http://127.0.0.1:5000`

---

## REST API Endpoints

| Metoda | Endpoint | Opis |
|--------|----------|------|
| `GET` | `/api/status` | Stanje robota in povezave |
| `GET` | `/api/behaviours` | Seznam razpoložljivih behaviourjev |
| `POST` | `/api/behaviours/<name>/start` | Zaženi behaviour |
| `POST` | `/api/behaviours/<name>/stop` | Ustavi behaviour |

---

## Struktura projekta

```
robostik/
├── app/
│   ├── __init__.py          # Flask app inicijalizacija
│   ├── routes.py            # API endpoint-i
│   ├── nao_controller.py    # Logika za upravljanje NAO-ja
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── app.js
│   └── templates/
│       └── index.html
├── run.py                   # Zagon aplikacije
├── requirements.txt         # Python odvisnosti
├── .env.example             # Predloga za okoljske spremenljivke
├── .gitignore
├── LICENSE
└── README.md
```

---

## Razvoj

### Virtualni robot (Choregraphe)
1. Odpri Choregraphe: `/home/atomicmind/APPS/nao/bin/choregraphe`
2. Zaženi Virtual Robot (NAOqi broker na `127.0.0.1:9559`)
3. Učitaj behaviour file in preizkušaj

### API testiranje
```bash
curl http://127.0.0.1:5000/api/status
curl -X POST http://127.0.0.1:5000/api/behaviours/MyBehaviour/start
```

---

## Prispevanje

Prostni je, da prispevkeš bugfix-e in nove featurje. Ustvari pull request ali poroči o bugih.

---

## Kontakt

**Zavod Qualia**  
Več informacij: https://qualia.si/ (primerno po potrebi)
