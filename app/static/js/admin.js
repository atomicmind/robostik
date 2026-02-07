/**
 * RoboStik Admin UI
 */

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', function() {
    checkStatus();
    setInterval(checkStatus, 5000);

    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', openProjectDialog);
    }

    const folderInput = document.getElementById('folderPath');
    if (folderInput) {
        folderInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') scanBehaviors();
        });
    }

    // Connect / Disconnect button
    const connectBtn = document.getElementById('connectNaoBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async function() {
            const connected = connectBtn.dataset.connected === '1';
            const naoIp = document.getElementById('naoIp').value.trim();
            const naoPort = parseInt(document.getElementById('naoPort').value, 10) || 9559;

            connectBtn.disabled = true;
            try {
                if (!connected) {
                    const r = await fetch(`${API_BASE}/connect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ip: naoIp, port: naoPort })
                    });
                    const data = await r.json();
                    if (data.success) {
                        addLog('✓ Povezava uspešna', 'success');
                    } else {
                        addLog(`✗ Povezava ni uspela: ${data.message}`, 'error');
                    }
                } else {
                    const r = await fetch(`${API_BASE}/disconnect`, { method: 'POST' });
                    const data = await r.json();
                    if (data.success) {
                        addLog('✓ Prekinjena povezava', 'success');
                    } else {
                        addLog(`✗ Napaka pri prekinitvi: ${data.message}`, 'error');
                    }
                }
            } catch (err) {
                console.error('Napaka pri povezanju/prekinitvi:', err);
                addLog('Napaka pri povezanju/prekinitvi', 'error');
            } finally {
                connectBtn.disabled = false;
                await checkStatus();
            }
        });
    }
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
            // Update connect button to 'Prekini'
            const connectBtn = document.getElementById('connectNaoBtn');
            if (connectBtn) {
                connectBtn.textContent = '✖ Prekini';
                connectBtn.dataset.connected = '1';
            }
        } else {
            statusBox.classList.remove('connected');
            statusBox.classList.add('disconnected');
            statusText.textContent = '✗ ' + data.message;
            const connectBtn = document.getElementById('connectNaoBtn');
            if (connectBtn) {
                connectBtn.textContent = '🔌 Poveži';
                connectBtn.dataset.connected = '0';
            }
        }
    } catch (error) {
        console.error('Napaka pri preverjanju statusa:', error);
    }
}

async function scanBehaviors() {
    const folderInput = document.getElementById('folderPath');
    const folderPath = (folderInput ? folderInput.value : '').trim();
    if (!folderPath) {
        addLog('Vnesite pot do projekta', 'error');
        return;
    }

    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.textContent = '⏳ Skeniram...';
    }

    try {
        const response = await fetch(`${API_BASE}/scan-folder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: folderPath })
        });
        const data = await response.json();

        if (data.success) {
            displayBehaviors(data.behaviors || []);
            addLog(`✓ Naloženih ${data.behaviors.length} behaviourjev`, 'success');
        } else {
            addLog(`✗ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Napaka pri skeniranju:', error);
        addLog('Napaka pri skeniranju behaviourjev', 'error');
    } finally {
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.textContent = '📁 Odpri projekt';
        }
    }
}

async function openProjectDialog() {
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.textContent = '⏳ Odpiram...';
    }

    try {
        const response = await fetch(`${API_BASE}/open-project`);
        const data = await response.json();

        if (data.success) {
            const folderInput = document.getElementById('folderPath');
            if (folderInput) {
                folderInput.value = data.path;
            }

            if (data.behaviors && Array.isArray(data.behaviors)) {
                displayBehaviors(data.behaviors);
                addLog(`✓ Naloženih ${data.behaviors.length} behaviourjev`, 'success');
            } else {
                await scanBehaviors();
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

function displayBehaviors(behaviors) {
    const container = document.getElementById('behaviours-container');
    if (!container) return;
    container.innerHTML = '';

    if (!behaviors || behaviors.length === 0) {
        container.innerHTML = '<p class="loading">Ni najdenih behaviourjev</p>';
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
