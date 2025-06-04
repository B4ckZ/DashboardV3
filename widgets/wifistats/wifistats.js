// widgets/wifistats/wifistats.js - Widget WiFi Stats V3
// =====================================================

window.wifistats = (function() {
    let widgetElement;
    let elements = {};
    let currentClients = new Map();
    let deviceDatabase = {};
    
    function init(element) {
        widgetElement = element;
        
        // Charger la base de données des devices
        loadDeviceDatabase();
    }
    
    function loadDeviceDatabase() {
        // Charger le fichier devices.json
        fetch('widgets/wifistats/devices.json')
            .then(response => response.json())
            .then(data => {
                deviceDatabase = data;
                console.log('Device database loaded:', deviceDatabase);
                
                // Maintenant charger le HTML
                return fetch('widgets/wifistats/wifistats.html');
            })
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer les éléments correctement
                elements.clientsContainer = widgetElement.querySelector('#wifi-clients-container');
                elements.statusIndicator = widgetElement.querySelector('#wifi-status-indicator');
                elements.ssidValue = widgetElement.querySelector('.network-value');
                
                console.log('WiFi Stats elements:', elements);
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('wifistats', {
                        update: updateData
                    }, [
                        'network.wifi.clients',
                        'network.wifi.status'
                    ]);
                }
            })
            .catch(error => {
                console.error('Error loading WiFi Stats widget:', error);
            });
    }
    
    function updateData(topic, data) {
        console.log('WiFi Stats update:', topic, data);
        
        if (topic === 'network.wifi.clients') {
            updateClients(data.clients || []);
        }
        else if (topic === 'network.wifi.status') {
            updateStatus(data);
        }
    }
    
    function updateClients(clients) {
        if (!elements.clientsContainer) {
            console.error('Clients container not found');
            return;
        }
        
        // Si aucun client
        if (clients.length === 0) {
            elements.clientsContainer.innerHTML = `
                <div class="wifi-placeholder">
                    <p>Aucun client connecté</p>
                </div>
            `;
            updateStatusIndicator(false);
            return;
        }
        
        // Mettre à jour le status indicator
        updateStatusIndicator(true);
        
        // Créer une nouvelle Map pour les clients actuels
        const newClientsMap = new Map();
        
        clients.forEach(client => {
            newClientsMap.set(client.mac, client);
        });
        
        // Supprimer les clients déconnectés avec animation
        currentClients.forEach((client, mac) => {
            if (!newClientsMap.has(mac)) {
                const element = widgetElement.querySelector(`[data-mac="${mac}"]`);
                if (element) {
                    element.style.opacity = '0';
                    element.style.transform = 'translateX(-20px)';
                    setTimeout(() => element.remove(), 300);
                }
            }
        });
        
        // Ajouter ou mettre à jour les clients
        clients.forEach((client, index) => {
            const existingElement = widgetElement.querySelector(`[data-mac="${client.mac}"]`);
            
            if (existingElement) {
                // Mettre à jour l'existant
                updateClientElement(existingElement, client);
            } else {
                // Créer nouveau avec délai pour animation
                setTimeout(() => {
                    const newElement = createClientElement(client);
                    elements.clientsContainer.appendChild(newElement);
                    // Forcer le reflow pour l'animation
                    newElement.offsetHeight;
                    newElement.style.opacity = '1';
                    newElement.style.transform = 'translateX(0)';
                }, index * 100);
            }
        });
        
        currentClients = newClientsMap;
    }
    
    function createClientElement(client) {
        const div = document.createElement('div');
        div.className = 'wifi-client';
        div.dataset.mac = client.mac;
        div.style.opacity = '0';
        div.style.transform = 'translateX(20px)';
        div.style.transition = 'all 0.3s ease';
        
        // Récupérer les infos depuis la base de données si disponibles
        const deviceInfo = getDeviceInfo(client);
        
        div.innerHTML = `
            <div class="client-icon">
                <img src="${deviceInfo.icon}" alt="Device icon" width="24" height="24" onerror="this.src='assets/icons/wifi.svg'">
            </div>
            <div class="client-info">
                <div class="client-name">${deviceInfo.name}</div>
                <div class="client-details">
                    <span class="client-mac">${client.mac}</span>
                    <span class="client-separator">•</span>
                    <span class="client-uptime">${client.uptime || '00j 00h 00m 00s'}</span>
                </div>
            </div>
        `;
        
        return div;
    }
    
    function updateClientElement(element, client) {
        const deviceInfo = getDeviceInfo(client);
        
        const nameEl = element.querySelector('.client-name');
        const uptimeEl = element.querySelector('.client-uptime');
        const iconEl = element.querySelector('.client-icon img');
        
        if (nameEl) nameEl.textContent = deviceInfo.name;
        if (uptimeEl) uptimeEl.textContent = client.uptime || '00j 00h 00m 00s';
        if (iconEl) {
            iconEl.src = deviceInfo.icon;
            // Ajouter un fallback en cas d'erreur
            iconEl.onerror = function() {
                this.src = 'assets/icons/wifi.svg';
            };
        }
    }
    
    function getDeviceInfo(client) {
        const mac = client.mac.toLowerCase();
        
        // Si dans la base de données, utiliser les infos personnalisées
        if (deviceDatabase[mac]) {
            return {
                name: deviceDatabase[mac].name,
                icon: deviceDatabase[mac].icon
            };
        }
        
        // Sinon, nom générique et icône par défaut
        // Utiliser un chemin relatif depuis la racine du dashboard
        return {
            name: `Device ${mac.slice(-5).toUpperCase()}`,
            icon: 'assets/icons/help-circle.svg'  // Chemin depuis la racine
        };
    }
    
    function updateStatus(status) {
        console.log('Updating WiFi status:', status);
        
        // Mettre à jour le SSID si disponible
        if (elements.ssidValue && status.ssid) {
            elements.ssidValue.textContent = status.ssid;
        }
        
        // Mettre à jour l'indicateur de statut
        if (elements.statusIndicator) {
            const isConnected = status.mode === 'AP' && status.clients_count > 0;
            updateStatusIndicator(isConnected);
        }
    }
    
    function updateStatusIndicator(hasClients) {
        if (elements.statusIndicator) {
            elements.statusIndicator.classList.remove('status-ok', 'status-error');
            elements.statusIndicator.classList.add(hasClients ? 'status-ok' : 'status-error');
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