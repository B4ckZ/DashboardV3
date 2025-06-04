// widgets/wifistats/wifistats.js - Widget WiFi Stats V3
// =====================================================

window.wifistats = (function() {
    let widgetElement;
    let elements = {};
    let currentClients = new Map();
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/wifistats/wifistats.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                elements.clientCount = widgetElement.querySelector('.client-count');
                elements.clientList = widgetElement.querySelector('.client-list');
                elements.status = widgetElement.querySelector('.wifi-status');
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('wifistats', {
                        update: updateData
                    }, [
                        'network.wifi.clients',
                        'network.wifi.status'
                    ]);
                }
            });
    }
    
    function updateData(topic, data) {
        if (topic === 'network.wifi.clients') {
            updateClients(data.clients || []);
        }
        else if (topic === 'network.wifi.status') {
            updateStatus(data);
        }
    }
    
    function updateClients(clients) {
        // Mettre à jour le compteur
        if (elements.clientCount) {
            elements.clientCount.textContent = clients.length;
        }
        
        // Mettre à jour la liste avec diff pour animations
        if (elements.clientList) {
            const newClientsMap = new Map();
            
            clients.forEach(client => {
                newClientsMap.set(client.mac, client);
            });
            
            // Supprimer les clients déconnectés
            currentClients.forEach((client, mac) => {
                if (!newClientsMap.has(mac)) {
                    const element = widgetElement.querySelector(`[data-mac="${mac}"]`);
                    if (element) {
                        element.classList.add('removing');
                        setTimeout(() => element.remove(), 300);
                    }
                }
            });
            
            // Ajouter ou mettre à jour les clients
            clients.forEach(client => {
                const existingElement = widgetElement.querySelector(`[data-mac="${client.mac}"]`);
                
                if (existingElement) {
                    // Mettre à jour
                    updateClientElement(existingElement, client);
                } else {
                    // Créer nouveau
                    const newElement = createClientElement(client);
                    elements.clientList.appendChild(newElement);
                }
            });
            
            currentClients = newClientsMap;
        }
    }
    
    function createClientElement(client) {
        const div = document.createElement('div');
        div.className = 'client-item';
        div.dataset.mac = client.mac;
        
        div.innerHTML = `
            <div class="client-info">
                <div class="client-name">${client.hostname || 'Unknown Device'}</div>
                <div class="client-mac">${client.mac}</div>
            </div>
            <div class="client-stats">
                <span class="client-signal">${client.signal || 'N/A'} dBm</span>
                <span class="client-uptime">${formatUptime(client.connected_time || 0)}</span>
            </div>
        `;
        
        return div;
    }
    
    function updateClientElement(element, client) {
        const nameEl = element.querySelector('.client-name');
        const signalEl = element.querySelector('.client-signal');
        const uptimeEl = element.querySelector('.client-uptime');
        
        if (nameEl) nameEl.textContent = client.hostname || 'Unknown Device';
        if (signalEl) signalEl.textContent = `${client.signal || 'N/A'} dBm`;
        if (uptimeEl) uptimeEl.textContent = formatUptime(client.connected_time || 0);
    }
    
    function formatUptime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }
    
    function updateStatus(status) {
        if (elements.status) {
            elements.status.textContent = status.connected ? 'Connecté' : 'Déconnecté';
            elements.status.className = `wifi-status ${status.connected ? 'connected' : 'disconnected'}`;
        }
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('wifistats');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();