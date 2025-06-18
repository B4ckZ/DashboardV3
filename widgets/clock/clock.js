// ===============================================================================
// CLOCK WIDGET V4 - DESIGN DE BASE + SYNCHRONISATION TEMPS
// widgets/clock/clock.js
// ===============================================================================

window.clock = (function() {
    let widgetElement;
    let elements = {};
    let clockInterval;
    let timeCheckInterval;
    
    // Configuration
    let config = {
        maxDriftSeconds: 180,  // 3 minutes
        checkIntervalMs: 30000 // Vérification toutes les 30 secondes
    };
    
    // État de synchronisation
    let syncState = {
        serverTime: null,
        connectedTimeSources: [],
        needsSync: false,
        lastSyncCheck: null
    };
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/clock/clock.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer les éléments
                elements.time = widgetElement.querySelector('.clock-time');
                elements.date = widgetElement.querySelector('.clock-date');
                elements.status = widgetElement.querySelector('.connection-status');
                elements.syncButton = widgetElement.querySelector('.sync-button');
                elements.syncIndicator = widgetElement.querySelector('.sync-indicator');
                elements.title = widgetElement.querySelector('.widget-title span');
                
                // Ajouter les classes de stabilité existantes
                if (elements.time) {
                    elements.time.classList.add('clock-time-stable');
                }
                
                // Event listener pour le bouton de synchronisation
                if (elements.syncButton) {
                    elements.syncButton.addEventListener('click', performManualSync);
                }
                
                // Démarrer l'horloge
                updateClock();
                clockInterval = setInterval(updateClock, 1000);
                
                // Démarrer la vérification de synchronisation
                startTimeCheck();
                
                // Enregistrer pour recevoir les données via l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('clock', {
                        update: handleUpdate
                    }, [
                        'system.time',           // Heure du serveur
                        'network.wifi.clients',  // Clients WiFi connectés
                        'system.time.sync.result' // Résultat de synchronisation
                    ]);
                }
                
                console.log('Clock widget avec synchronisation initialisé');
            })
            .catch(error => {
                console.error('Erreur chargement Clock widget:', error);
            });
    }
    
    function updateClock() {
        // Afficher l'heure du serveur si disponible, sinon heure locale
        const displayTime = syncState.serverTime || new Date();
        
        if (elements.time) {
            elements.time.textContent = displayTime.toLocaleTimeString('fr-FR');
        }
        
        if (elements.date) {
            elements.date.textContent = displayTime.toLocaleDateString('fr-FR');
        }
    }
    
    function startTimeCheck() {
        if (timeCheckInterval) clearInterval(timeCheckInterval);
        
        timeCheckInterval = setInterval(() => {
            checkTimeSync();
        }, config.checkIntervalMs);
        
        // Première vérification après 5 secondes
        setTimeout(checkTimeSync, 5000);
    }
    
    function handleUpdate(topic, data) {
        console.log('Clock update:', topic, data);
        
        if (topic === 'system.time') {
            handleServerTime(data);
        }
        else if (topic === 'network.wifi.clients') {
            handleWifiClients(data);
        }
        else if (topic === 'system.time.sync.result') {
            handleSyncResult(data);
        }
        
        // Mettre à jour l'indicateur de statut de connexion
        if (elements.status) {
            elements.status.classList.toggle('connected', window.orchestrator?.connected);
        }
    }
    
    function handleServerTime(data) {
        if (data.timestamp) {
            // Convertir le timestamp Unix en Date
            syncState.serverTime = new Date(data.timestamp * 1000);
            syncState.lastSyncCheck = new Date();
            
            // Mettre à jour l'affichage immédiatement
            updateClock();
            
            console.log('Heure serveur reçue:', syncState.serverTime.toLocaleString());
        }
    }
    
    function handleWifiClients(data) {
        if (!data.clients) return;
        
        // Charger la base de données des devices et identifier les sources de temps
        loadDeviceDatabase().then(deviceDb => {
            syncState.connectedTimeSources = data.clients.filter(client => {
                const mac = client.mac.toLowerCase();
                return deviceDb[mac] && deviceDb[mac].time_source === true;
            });
            
            console.log('Sources de temps connectées:', syncState.connectedTimeSources.length);
            
            // Vérifier si synchronisation nécessaire
            if (syncState.connectedTimeSources.length > 0) {
                checkTimeSync();
            } else {
                // Aucune source de temps connectée
                updateSyncIndicator('no-source');
                hideSyncButton();
            }
        });
    }
    
    function handleSyncResult(data) {
        if (data.status === 'success') {
            console.log('Synchronisation réussie');
            updateSyncIndicator('synced');
            hideSyncButton();
            syncState.needsSync = false;
            updateTitle('Horloge interne RPI (Sync ✓)');
            
            // Forcer une mise à jour de l'heure serveur
            setTimeout(requestServerTime, 2000);
        } else if (data.status === 'skipped') {
            console.log('Synchronisation non nécessaire');
            updateSyncIndicator('synced');
            hideSyncButton();
            syncState.needsSync = false;
            updateTitle('Horloge interne RPI');
        } else {
            console.error('Échec synchronisation:', data.message);
            updateSyncIndicator('error');
            updateTitle('Horloge interne RPI (Erreur)');
        }
    }
    
    async function loadDeviceDatabase() {
        try {
            const response = await fetch('widgets/wifistats/devices.json');
            return await response.json();
        } catch (error) {
            console.error('Erreur chargement devices.json:', error);
            return {};
        }
    }
    
    function checkTimeSync() {
        if (!syncState.serverTime || syncState.connectedTimeSources.length === 0) {
            return;
        }
        
        const now = new Date();
        const driftMs = Math.abs(now.getTime() - syncState.serverTime.getTime());
        const driftSeconds = Math.round(driftMs / 1000);
        
        console.log(`Vérification sync - Décalage: ${driftSeconds}s`);
        
        if (driftSeconds > config.maxDriftSeconds) {
            // Synchronisation nécessaire
            syncState.needsSync = true;
            updateSyncIndicator('drift');
            showSyncButton();
            updateTitle('Horloge interne RPI (Sync requis)');
            
            console.log(`Synchronisation requise - Décalage: ${driftSeconds}s`);
        } else {
            // Temps synchronisé
            syncState.needsSync = false;
            updateSyncIndicator('synced');
            hideSyncButton();
            updateTitle('Horloge interne RPI');
        }
    }
    
    function updateSyncIndicator(status) {
        if (!elements.syncIndicator) return;
        
        // Supprimer toutes les classes de statut
        elements.syncIndicator.classList.remove(
            'sync-ok', 'sync-drift', 'sync-error', 'sync-no-source'
        );
        
        // Ajouter la classe appropriée
        switch (status) {
            case 'synced':
                elements.syncIndicator.classList.add('sync-ok');
                elements.syncIndicator.title = 'Temps synchronisé';
                break;
            case 'drift':
                elements.syncIndicator.classList.add('sync-drift');
                elements.syncIndicator.title = 'Synchronisation recommandée';
                break;
            case 'error':
                elements.syncIndicator.classList.add('sync-error');
                elements.syncIndicator.title = 'Erreur de synchronisation';
                break;
            case 'no-source':
                elements.syncIndicator.classList.add('sync-no-source');
                elements.syncIndicator.title = 'Aucune source de temps connectée';
                break;
        }
    }
    
    function updateTitle(newTitle) {
        if (elements.title) {
            elements.title.textContent = newTitle;
        }
    }
    
    function showSyncButton() {
        if (elements.syncButton) {
            elements.syncButton.style.display = 'inline-flex';
            elements.syncButton.style.opacity = '1';
        }
    }
    
    function hideSyncButton() {
        if (elements.syncButton) {
            elements.syncButton.style.opacity = '0';
            setTimeout(() => {
                if (elements.syncButton) {
                    elements.syncButton.style.display = 'none';
                }
            }, 300);
        }
    }
    
    function performManualSync() {
        if (syncState.connectedTimeSources.length === 0) {
            console.warn('Aucune source de temps connectée');
            return;
        }
        
        // Prendre la première source de temps connectée
        const timeSource = syncState.connectedTimeSources[0];
        const clientTime = new Date();
        
        console.log('Synchronisation manuelle déclenchée');
        updateSyncIndicator('syncing');
        updateTitle('Horloge interne RPI (Sync...)');
        
        // Animation du bouton
        if (elements.syncButton) {
            elements.syncButton.classList.add('syncing');
        }
        
        // Préparer la commande de synchronisation
        const syncCommand = {
            action: 'set_time',
            timestamp: Math.floor(clientTime.getTime() / 1000),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            source_mac: timeSource.mac,
            source: 'dashboard_manual',
            request_id: generateRequestId()
        };
        
        // Envoyer via MQTT
        if (window.orchestrator && window.orchestrator.connected) {
            window.orchestrator.publish('system/time/sync/command', syncCommand);
            console.log('Commande de synchronisation envoyée:', syncCommand);
        } else {
            console.error('MQTT non connecté');
            updateSyncIndicator('error');
            updateTitle('Horloge interne RPI (Erreur)');
        }
        
        // Arrêter l'animation après 3 secondes
        setTimeout(() => {
            if (elements.syncButton) {
                elements.syncButton.classList.remove('syncing');
            }
        }, 3000);
    }
    
    function requestServerTime() {
        // Demander une mise à jour de l'heure serveur
        if (window.orchestrator && window.orchestrator.connected) {
            window.orchestrator.publish('system/time/request', {
                request_id: generateRequestId(),
                timestamp: Date.now()
            });
        }
    }
    
    function generateRequestId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    function destroy() {
        if (clockInterval) {
            clearInterval(clockInterval);
        }
        if (timeCheckInterval) {
            clearInterval(timeCheckInterval);
        }
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('clock');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();