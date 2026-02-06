/**
 * RoboStik Frontend Application
 * API komunikacija in UI upravljanje
 */

const API_BASE = '/api';
let behaviourRunning = {};
let currentFolderPath = '';

/**
 * Inicijalizacija aplikacije
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('RoboStik aplikacija zagnana');
    
    // Nastavi default folder path
    const folderInput = document.getElementById('folderPath');
    if (folderInput) {
        folderInput.value = '/home/atomicmind/tehno/nao/arni/test/';
    }
    
    // Gumb za odpiranje projekta (native folder dialog)
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', openProjectDialog);
    }

    // Naloži seznam dovoljenih poti (cross-platform)
    const applyAllowedBtn = document.getElementById('applyAllowedBtn');
    if (applyAllowedBtn) {
        applyAllowedBtn.addEventListener('click', applyAllowedPath);
    }
    loadAllowedPaths();

    // Knjižnica projektov na strežniku
    const setLibraryRootBtn = document.getElementById('setLibraryRootBtn');
    if (setLibraryRootBtn) {
        setLibraryRootBtn.addEventListener('click', selectLibraryRoot);
    }
    const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
    if (refreshLibraryBtn) {
        refreshLibraryBtn.addEventListener('click', loadLibraryProjects);
    }
    const applyLibraryProjectBtn = document.getElementById('applyLibraryProjectBtn');
    if (applyLibraryProjectBtn) {
        applyLibraryProjectBtn.addEventListener('click', applyLibraryProject);
    }
    loadLibraryProjects();
    
    // Enter v input polju
    if (folderInput) {
        folderInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                scanBehaviors();
            }
        });
    }
    
    // Preveri stanje robota
    checkStatus();
    
    // Osveži vsakih 5 sekund
    setInterval(checkStatus, 5000);
});

/**
 * Preveri stanje povezave z robotom
 */
async function checkStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        const statusBox = document.getElementById('status-box');
        const statusText = document.getElementById('status-text');
        
        if (!statusBox || !statusText) {
            console.error('Status elementi niso najdeni');
            return;
        }
        
        if (data.connected) {
            statusBox.classList.remove('disconnected');
            statusBox.classList.add('connected');
            statusText.textContent = '✓ ' + data.message;
        } else {
            statusBox.classList.remove('connected');
            statusBox.classList.add('disconnected');
            statusText.textContent = '✗ ' + data.message;
        }
    } catch (error) {
        console.error('Napaka pri preverjanju statusa:', error);
        const statusBox = document.getElementById('status-box');
        const statusText = document.getElementById('status-text');
        if (statusBox && statusText) {
            statusBox.classList.add('disconnected');
            statusText.textContent = '✗ Napaka pri povezavi s strežnikom';
        }
    }
}

/**
 * Skeniraj behaviors iz izbrane mape
 * Sprejme opcijski parameter folderPathParam, da lahko kličemo funkcijo programatično
 */
async function scanBehaviors(folderPathParam = null) {
    const folderInputElem = document.getElementById('folderPath');
    const folderPath = (folderPathParam || (folderInputElem ? folderInputElem.value : '')).trim();
    
    if (!folderPath) {
        addLog('Vnesite pot do projekta', 'error');
        return;
    }
    
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.textContent = '⏳ Skeniram...'; // used when invoked programmatically while scanning behaviours
    }
    
    try {
        const response = await fetch(`${API_BASE}/scan-folder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: folderPath })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentFolderPath = data.path;
            // update input if called programmatically
            if (folderInputElem) folderInputElem.value = data.path;
            displayBehaviors(data.behaviors);
            addLog(`✓ Naloženih ${data.behaviors.length} behaviourjev`, 'success');
        } else {
            addLog(`✗ Napaka: ${data.message}`, 'error');
            const container = document.getElementById('behaviours-container');
            if (container) container.innerHTML = `<p class="loading">❌ ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Napaka pri skeniranju:', error);
        addLog('Napaka pri skeniranju behaviourjev', 'error');
        const container = document.getElementById('behaviours-container');
        if (container) container.innerHTML = '<p class="loading">❌ Napaka pri povezavi s strežnikom</p>';
    } finally {
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.textContent = '📁 Odpri projekt';
        }
    }
}

/**
 * Prikaži behaviors kot kartice
 */
function displayBehaviors(behaviors) {
    const container = document.getElementById('behaviours-container');
    container.innerHTML = '';
    
    if (behaviors.length === 0) {
        container.innerHTML = '<p class="loading">Ni najdenih behaviourjev</p>';
        return;
    }
    
    behaviors.forEach(behavior => {
        // Behavior je lahko string ali object
        const name = typeof behavior === 'string' ? behavior : behavior.name;
        const card = createBehaviourCard(name);
        container.appendChild(card);
    });
}

/**
 * Odpre nativni file dialog na strežniku in nastavi pot
 */
async function openProjectDialog() {
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.textContent = '⏳ Odpravljam...';
    }

    try {
        const response = await fetch(`${API_BASE}/open-project`);
        const data = await response.json();

        if (data.success) {
            const folderInput = document.getElementById('folderPath');
            if (folderInput) {
                folderInput.value = data.path;
            }
            addLog(`✓ Izbrana mapa: ${data.path}`, 'success');

            // Če backend že vrača behaviourje, jih prikažemo takoj; sicer sprožimo skeniranje
            if (data.behaviors && Array.isArray(data.behaviors)) {
                currentFolderPath = data.path;
                displayBehaviors(data.behaviors);
                addLog(`✓ Naloženih ${data.behaviors.length} behaviourjev (server-side)`, 'success');
            } else {
                await scanBehaviors(data.path);
            }
        } else {
            addLog(`✗ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Napaka pri odpiranju dialoga:', error);
        addLog('Napaka pri odpiranju dialoga', 'error');
    } finally {
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.textContent = '📁 Odpri projekt';
        }
    }
}

async function loadAllowedPaths() {
    const select = document.getElementById('allowedPathSelect');
    if (!select) return;

    try {
        const response = await fetch(`${API_BASE}/allowed-paths`);
        const data = await response.json();

        select.innerHTML = '';
        if (!data.paths || data.paths.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Ni nastavljenih poti';
            select.appendChild(opt);
            return;
        }

        data.paths.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Napaka pri nalaganju poti:', error);
    }
}

function applyAllowedPath() {
    const select = document.getElementById('allowedPathSelect');
    const folderInput = document.getElementById('folderPath');
    if (!select || !folderInput || !select.value) {
        addLog('Ni izbrane poti', 'error');
        return;
    }
    folderInput.value = select.value;
    scanBehaviors(select.value);
}

async function selectLibraryRoot() {
    const btn = document.getElementById('setLibraryRootBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Izbiram...';
    }

    try {
        const response = await fetch(`${API_BASE}/library-root/select`);
        const data = await response.json();

        if (data.success) {
            addLog(`✓ Knjižnica nastavljena: ${data.path}`, 'success');
            await loadLibraryProjects();
        } else {
            addLog(`✗ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Napaka pri izbiri knjižnice:', error);
        addLog('Napaka pri izbiri knjižnice', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '📚 Izberi knjižnico (na strežniku)';
        }
    }
}

async function loadLibraryProjects() {
    const select = document.getElementById('libraryProjectSelect');
    if (!select) return;

    try {
        const response = await fetch(`${API_BASE}/library-projects`);
        const data = await response.json();

        select.innerHTML = '';
        if (!data.projects || data.projects.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = data.message || 'Ni projektov';
            select.appendChild(opt);
            return;
        }

        data.projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.path;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Napaka pri nalaganju projektov:', error);
    }
}

function applyLibraryProject() {
    const select = document.getElementById('libraryProjectSelect');
    const folderInput = document.getElementById('folderPath');
    if (!select || !folderInput || !select.value) {
        addLog('Ni izbranega projekta iz knjižnice', 'error');
        return;
    }
    folderInput.value = select.value;
    scanBehaviors(select.value);
}

/**
 * Ustvari kartice za behaviourje
 */
function createBehaviourCard(behaviour) {
    const card = document.createElement('div');
    card.className = 'behaviour-card';
    
    const title = document.createElement('h3');
    title.textContent = behaviour;
    
    const startBtn = document.createElement('button');
    startBtn.className = 'btn-start';
    startBtn.textContent = '▶';
    startBtn.title = 'Zaženi';
    startBtn.onclick = () => startBehaviour(behaviour, startBtn);
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn-stop';
    stopBtn.textContent = '⏹';
    stopBtn.title = 'Ustavi';
    stopBtn.onclick = () => stopBehaviour(behaviour, stopBtn);
    
    // Omotaj buttone u div za side-by-side layout
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.appendChild(startBtn);
    buttonsWrapper.appendChild(stopBtn);
    
    card.appendChild(title);
    card.appendChild(buttonsWrapper);
    
    return card;
}

/**
 * Zaženi behaviour
 */
async function startBehaviour(name, button) {
    button.disabled = true;
    button.classList.add('btn-disabled');
    button.textContent = '⏳';
    
    try {
        const response = await fetch(`${API_BASE}/behaviours/${name}/start`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            behaviourRunning[name] = true;
            addLog(`Behaviour '${name}' zažet`, 'success');
        } else {
            addLog(`Napaka: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Napaka pri zagonu behaviourja:', error);
        addLog(`Napaka pri zagonu '${name}'`, 'error');
    } finally {
        button.disabled = false;
        button.classList.remove('btn-disabled');
        button.textContent = '▶';
    }
}

/**
 * Ustavi behaviour
 */
async function stopBehaviour(name, button) {
    button.disabled = true;
    button.classList.add('btn-disabled');
    button.textContent = '⏳';
    
    try {
        const response = await fetch(`${API_BASE}/behaviours/${name}/stop`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            behaviourRunning[name] = false;
            addLog(`Behaviour '${name}' ustavljen`, 'success');
        } else {
            addLog(`Napaka: ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Napaka pri ustavljanju behaviourja:', error);
        addLog(`Napaka pri ustavljanju '${name}'`, 'error');
    } finally {
        button.disabled = false;
        button.classList.remove('btn-disabled');
        button.textContent = '⏹';
    }
}

/**
 * Dodaj vnos v dnevnik
 */
function addLog(message, type = 'info') {
    const logContainer = document.getElementById('log-container');
    const entry = document.createElement('p');
    
    const timestamp = new Date().toLocaleTimeString('sl-SI');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Ohrani samo zadnjih 100 vnosov
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}
