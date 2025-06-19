// ===============================================================================
// CLOCK WIDGET V6 - VERSION SIMPLIFIÉE FINALE
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
        checkIntervalMs: 500 // Vérification toutes les 30 secondes
    };
    
    // État de synchronisation
    let syncState = {
        serverTime: null,
        connectedTimeSources: [],
        lastSyncCheck: null,
        systemStatus: 'ok', // 'ok', 'syncing', 'error'
        isSyncing: false
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
                elements.statusIndicator = widgetElement.querySelector('#sync-status-indicator');
                
                // Ajouter les classes de stabilité
                if (elements.time) {
                    elements.time.classList.add('clock-time-stable');
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
                
                // Démarrer avec indicateur vert (état normal)
                updateStatusIndicator();
                
                if (window.APP_CONFIG && window.APP_CONFIG.debug) {
                    console.log('Clock widget V6 simplifié initialisé');
                }
            })
            .catch(error => {
                console.error('Erreur chargement Clock widget:', error);
            });
    }
    
    function updateClock() {
        try {
            let displayTime;
            
            if (syncState.serverTime && !isNaN(syncState.serverTime.getTime())) {
                // Utiliser l'heure du serveur
                displayTime = new Date(syncState.serverTime.getTime());
                
                // Ajuster en fonction du temps écoulé
                if (syncState.lastSyncCheck) {
                    const elapsed = Date.now() - syncState.lastSyncCheck.getTime();
                    displayTime.setTime(displayTime.getTime() + elapsed);
                }
            } else {
                // Utiliser l'heure locale si pas d'heure serveur
                displayTime = new Date();
            }
            
            // Vérifier la validité
            if (!displayTime || isNaN(displayTime.getTime())) {
                displayTime = new Date();
            }
            
            // Afficher l'heure
            if (elements.time) {
                elements.time.textContent = displayTime.toLocaleTimeString('fr-FR');
            }
            
            if (elements.date) {
                elements.date.textContent = displayTime.toLocaleDateString('fr-FR');
            }
        } catch (error) {
            console.error('Erreur dans updateClock:', error);
            const fallbackTime = new Date();
            if (elements.time) {
                elements.time.textContent = fallbackTime.toLocaleTimeString('fr-FR');
            }
            if (elements.date) {
                elements.date.textContent = fallbackTime.toLocaleDateString('fr-FR');
            }
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
        if (window.APP_CONFIG && window.APP_CONFIG.debug) {
            console.log('Clock update:', topic, data);
        }
        
        if (topic === 'system.time') {
            handleServerTime(data);
        }
        else if (topic === 'network.wifi.clients') {
            handleWifiClients(data);
        }
        else if (topic === 'system.time.sync.result') {
            handleSyncResult(data);
        }
    }
    
    function handleServerTime(data) {
        try {
            if (data && data.timestamp) {
                const timestamp = parseFloat(data.timestamp);
                
                if (isNaN(timestamp) || timestamp <= 0) {
                    return;
                }
                
                // Convertir le timestamp Unix en Date
                const newServerTime = new Date(timestamp * 1000);
                
                // Vérifier la validité
                if (isNaN(newServerTime.getTime())) {
                    return;
                }
                
                // Vérifier que la date est raisonnable
                const now = new Date();
                const yearDiff = Math.abs(newServerTime.getFullYear() - now.getFullYear());
                if (yearDiff > 10) {
                    return;
                }
                
                syncState.serverTime = newServerTime;
                syncState.lastSyncCheck = new Date();
                
                // Mettre à jour l'affichage
                updateClock();
            }
        } catch (error) {
            console.error('Erreur dans handleServerTime:', error);
        }
    }
    
    function handleWifiClients(data) {
        if (!data || !data.clients) return;
        
        // Charger la base de données des devices
        loadDeviceDatabase().then(deviceDb => {
            syncState.connectedTimeSources = data.clients.filter(client => {
                const mac = client.mac.toLowerCase();
                return deviceDb[mac] && deviceDb[mac].time_source === true;
            });
            
            if (window.APP_CONFIG && window.APP_CONFIG.debug && syncState.connectedTimeSources.length > 0) {
                console.log(`${syncState.connectedTimeSources.length} source(s) de temps connectée(s)`);
            }
        });
    }
    
    function handleSyncResult(data) {
        if (data.status === 'success') {
            if (window.APP_CONFIG && window.APP_CONFIG.debug) {
                console.log('Synchronisation réussie:', data.message);
            }
            syncState.systemStatus = 'ok';
            syncState.isSyncing = false;
            
            // Demander une mise à jour de l'heure
            setTimeout(requestServerTime, 1000);
        } else if (data.status === 'skipped') {
            syncState.systemStatus = 'ok';
            syncState.isSyncing = false;
        } else if (data.status === 'error') {
            console.error('Erreur synchronisation:', data.message);
            syncState.systemStatus = 'error';
            syncState.isSyncing = false;
        }
        
        updateStatusIndicator();
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
        // Si pas de source de temps connectée, tout va bien (indicateur vert)
        if (syncState.connectedTimeSources.length === 0) {
            syncState.systemStatus = 'ok';
            updateStatusIndicator();
            return;
        }
        
        // Si on a une source de temps ET l'heure serveur
        if (syncState.serverTime && !isNaN(syncState.serverTime.getTime())) {
            const now = new Date();
            const serverTimeAdjusted = new Date(syncState.serverTime.getTime());
            
            // Ajuster l'heure serveur
            if (syncState.lastSyncCheck) {
                const elapsed = now.getTime() - syncState.lastSyncCheck.getTime();
                serverTimeAdjusted.setTime(serverTimeAdjusted.getTime() + elapsed);
            }
            
            const driftMs = Math.abs(now.getTime() - serverTimeAdjusted.getTime());
            const driftSeconds = Math.round(driftMs / 1000);
            
            if (window.APP_CONFIG && window.APP_CONFIG.debug && driftSeconds > 10) {
                console.log(`Décalage temps: ${driftSeconds}s`);
            }
            
            // Si décalage > 3 minutes et pas déjà en train de synchroniser
            if (driftSeconds > config.maxDriftSeconds && !syncState.isSyncing) {
                console.log(`Synchronisation automatique requise - Décalage: ${driftSeconds}s`);
                performAutoSync();
            } else {
                // Tout va bien
                syncState.systemStatus = 'ok';
                updateStatusIndicator();
            }
        }
    }
    
    function updateStatusIndicator() {
        if (!elements.statusIndicator) return;
        
        elements.statusIndicator.classList.remove('status-ok', 'status-error', 'status-syncing');
        
        switch (syncState.systemStatus) {
            case 'ok':
                elements.statusIndicator.classList.add('status-ok');
                elements.statusIndicator.title = 'Heure synchronisée';
                break;
            
            case 'syncing':
                elements.statusIndicator.classList.add('status-syncing');
                elements.statusIndicator.title = 'Synchronisation en cours...';
                break;
            
            case 'error':
                elements.statusIndicator.classList.add('status-error');
                elements.statusIndicator.title = 'Erreur de synchronisation';
                // Repasser en OK après 5 secondes
                setTimeout(() => {
                    if (syncState.systemStatus === 'error') {
                        syncState.systemStatus = 'ok';
                        updateStatusIndicator();
                    }
                }, 5000);
                break;
        }
    }
    
    function performAutoSync() {
        if (syncState.connectedTimeSources.length === 0 || syncState.isSyncing) {
            return;
        }
        
        // Marquer comme en cours de synchronisation
        syncState.isSyncing = true;
        syncState.systemStatus = 'syncing';
        updateStatusIndicator();
        
        // Utiliser la première source de temps disponible
        const timeSource = syncState.connectedTimeSources[0];
        const clientTime = new Date(); // Heure du PC qui consulte le dashboard
        
        console.log(`Synchronisation avec l'heure du client: ${clientTime.toLocaleString()}`);
        
        // Préparer la commande
        const syncCommand = {
            action: 'set_time',
            timestamp: Math.floor(clientTime.getTime() / 1000),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            source_mac: timeSource.mac,
            source: 'dashboard_auto',
            request_id: generateRequestId()
        };
        
        // Envoyer via MQTT
        if (window.orchestrator && window.orchestrator.connected) {
            window.orchestrator.publish('system/time/sync/command', syncCommand);
        } else {
            console.error('MQTT non connecté');
            syncState.systemStatus = 'error';
            syncState.isSyncing = false;
            updateStatusIndicator();
        }
    }
    
    function requestServerTime() {
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
        destroy: destroy,
        // Méthodes exposées pour debug
        getState: () => syncState,
        forceSync: performAutoSync,
        checkSync: checkTimeSync
    };
})();