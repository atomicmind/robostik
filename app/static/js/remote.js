/**
 * RoboStik Remote UI
 */

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    checkStatus();
    setInterval(checkStatus, 5000);

    const refreshBtn = document.getElementById('refreshRemoteBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadCurrentBehaviours);
    }

    loadCurrentBehaviours();
});

async function checkStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        const statusBox = document.getElementById('status-box');
        const statusText = document.getElementById('status-text');
        if (!statusBox || !statusText) return;

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
    }
}

async function loadCurrentBehaviours() {
    const refreshBtn = document.getElementById('refreshRemoteBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳ Osvežujem...';
    }

    try {
        const response = await fetch(`${API_BASE}/current-behaviours`);
        const data = await response.json();
        displayBehaviors(data.behaviours || []);
    } catch (error) {
        console.error('Napaka pri nalaganju behaviourjev:', error);
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 Osveži';
        }
    }
}

function displayBehaviors(behaviors) {
    const container = document.getElementById('behaviours-container');
    if (!container) return;
    container.innerHTML = '';

    if (!behaviors || behaviors.length === 0) {
        container.innerHTML = '<p class="loading">Ni naloženih obnašanj (admin še ni skeniral projekta)</p>';
        return;
    }

    behaviors.forEach(behavior => {
        const name = typeof behavior === 'string' ? behavior : behavior.name;
        const card = createBehaviourCard(name);
        container.appendChild(card);
    });
}

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

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.appendChild(startBtn);
    buttonsWrapper.appendChild(stopBtn);

    card.appendChild(title);
    card.appendChild(buttonsWrapper);

    return card;
}

async function startBehaviour(name, button) {
    button.disabled = true;
    button.classList.add('btn-disabled');
    button.textContent = '⏳';

    try {
        const response = await fetch(`${API_BASE}/behaviours/${name}/start`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
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

async function stopBehaviour(name, button) {
    button.disabled = true;
    button.classList.add('btn-disabled');
    button.textContent = '⏳';

    try {
        const response = await fetch(`${API_BASE}/behaviours/${name}/stop`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
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

function addLog(message, type = 'info') {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) return;
    const entry = document.createElement('p');
    const timestamp = new Date().toLocaleTimeString('sl-SI');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${timestamp}] ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}
