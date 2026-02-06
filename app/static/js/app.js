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
    document.getElementById('folderPath').value = '/home/atomicmind/tehno/nao/arni/test/';
    
    // Gumb za skeniranje
    document.getElementById('scanBtn').addEventListener('click', scanBehaviors);
    
    // Enter v input polju
    document.getElementById('folderPath').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            scanBehaviors();
        }
    });
    
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
        statusBox.classList.add('disconnected');
        statusBox.getElementById('status-text').textContent = '✗ Napaka pri povezavi s strežnikom';
    }
}

/**
 * Skeniraj behaviors iz izbrane mape
 */
async function scanBehaviors() {
    const folderPath = document.getElementById('folderPath').value.trim();
    
    if (!folderPath) {
        addLog('Vnesite pot do projekta', 'error');
        return;
    }
    
    const scanBtn = document.getElementById('scanBtn');
    scanBtn.disabled = true;
    scanBtn.textContent = '⏳ Skeniram...';
    
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
            displayBehaviors(data.behaviors);
            addLog(`✓ Naloženih ${data.behaviors.length} behaviourjev`, 'success');
        } else {
            addLog(`✗ Napaka: ${data.message}`, 'error');
            document.getElementById('behaviours-container').innerHTML = 
                `<p class="loading">❌ ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Napaka pri skeniranju:', error);
        addLog('Napaka pri skeniranju behaviourjev', 'error');
        document.getElementById('behaviours-container').innerHTML = 
            '<p class="loading">❌ Napaka pri povezavi s strežnikom</p>';
    } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = '🔍 Skeniraj behaviourje';
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
        const card = createBehaviourCard(behavior);
        container.appendChild(card);
    });
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
    startBtn.textContent = '▶ Zaženi';
    startBtn.onclick = () => startBehaviour(behaviour, startBtn);
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn-stop';
    stopBtn.textContent = '⏹ Ustavi';
    stopBtn.onclick = () => stopBehaviour(behaviour, stopBtn);
    
    card.appendChild(title);
    card.appendChild(startBtn);
    card.appendChild(stopBtn);
    
    return card;
}

/**
 * Zaženi behaviour
 */
async function startBehaviour(name, button) {
    button.disabled = true;
    button.classList.add('btn-disabled');
    button.textContent = 'Zaganjam...';
    
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
        button.textContent = '▶ Zaženi';
    }
}

/**
 * Ustavi behaviour
 */
async function stopBehaviour(name, button) {
    button.disabled = true;
    button.classList.add('btn-disabled');
    button.textContent = 'Ustavljam...';
    
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
        button.textContent = '⏹ Ustavi';
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
