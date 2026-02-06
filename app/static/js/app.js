/**
 * RoboStik Frontend Application
 * API komunikacija in UI upravljanje
 */

const API_BASE = '/api';
let behaviourRunning = {};
let currentFolderPath = '';
let projectModal = null;

/**
 * Inicijalizacija aplikacije
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('RoboStik aplikacija zagnana');
    
    // Modal inicijalizacija
    projectModal = document.getElementById('projectModal');
    const pickProjectBtn = document.getElementById('pickProjectBtn');
    const closeModal = document.getElementById('closeModal');
    const confirmProjectBtn = document.getElementById('confirmProjectBtn');
    const projectPathInput = document.getElementById('projectPath');
    
    // Modal event listeners
    if (pickProjectBtn) {
        pickProjectBtn.addEventListener('click', openProjectModal);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeProjectModal);
    }
    
    if (confirmProjectBtn) {
        confirmProjectBtn.addEventListener('click', confirmProject);
    }
    
    if (projectPathInput) {
        projectPathInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmProject();
            }
        });
    }
    
    // Zapri modal s klikom na ozadje
    if (projectModal) {
        projectModal.addEventListener('click', function(e) {
            if (e.target === projectModal) {
                closeProjectModal();
            }
        });
    }
    
    // Preveri stanje robota
    checkStatus();
    
    // Osveži vsakih 5 sekund
    setInterval(checkStatus, 5000);
});

/**
 * Odpri modal za izbor projekta
 */
function openProjectModal() {
    if (projectModal) {
        projectModal.classList.add('show');
        const input = document.getElementById('projectPath');
        if (input) {
            input.value = currentFolderPath || '/home/atomicmind/tehno/nao/arni/test/';
            input.focus();
        }
        loadRecentProjects();
    }
}

/**
 * Zapri modal
 */
function closeProjectModal() {
    if (projectModal) {
        projectModal.classList.remove('show');
    }
}

/**
 * Naloži recent projekte
 */
function loadRecentProjects() {
    const recentProjects = [
        '/home/atomicmind/tehno/nao/arni/test/',
        '/home/atomicmind/APPS/nao/choregraphe/behaviors/',
        '/home/atomicmind/nao/project/'
    ];
    
    const projectList = document.getElementById('projectList');
    if (projectList) {
        projectList.innerHTML = '';
        recentProjects.forEach(proj => {
            const div = document.createElement('div');
            div.className = 'project-item';
            div.textContent = proj;
            div.addEventListener('click', function() {
                const input = document.getElementById('projectPath');
                if (input) {
                    input.value = proj;
                    input.focus();
                }
            });
            projectList.appendChild(div);
        });
    }
}

/**
 * Potrdi izbrani projekt in naloži behaviourje
 */
function confirmProject() {
    const input = document.getElementById('projectPath');
    if (!input || !input.value.trim()) {
        alert('Prosimo, vnesite pot do projekta');
        return;
    }
    
    currentFolderPath = input.value.trim();
    const folderInput = document.getElementById('folderPath');
    if (folderInput) {
        folderInput.value = currentFolderPath;
    }
    
    closeProjectModal();
    scanBehaviors();
}

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
 */
async function scanBehaviors() {
    const folderPath = document.getElementById('folderPath').value.trim();
    
    if (!folderPath) {
        addLog('Vnesite pot do projekta', 'error');
        return;
    }
    
    const pickBtn = document.getElementById('pickProjectBtn');
    if (pickBtn) {
        pickBtn.disabled = true;
        pickBtn.textContent = '⏳ Skeniram...';
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
        if (pickBtn) {
            pickBtn.disabled = false;
            pickBtn.textContent = '📂 Izberi projekt';
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
