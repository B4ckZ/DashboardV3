// ===============================================================================
// CLOCK WIDGET V4 - INDICATEUR COHÉRENT AVEC WIFISTATS/MQTTSTATS
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
        lastSyncCheck: null,
        systemStatus: 'unknown' // 'ok', 'error', 'unknown'
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
                
                // Ajouter les classes de stabilité existantes
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
                
                console.log('Clock widget avec indicateur cohérent initialisé');
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
            
            // Vérifier le statut système
            evaluateSystemStatus();
        });
    }
    
    function handleSyncResult(data) {
        if (data.status === 'success' || data.status === 'skipped') {
            console.log('Synchronisation OK:', data.status);
            syncState.systemStatus = 'ok';
        } else {
            console.error('Synchronisation échouée:', data.message);
            syncState.systemStatus = 'error';
        }
        
        // Mettre à jour l'indicateur
        updateStatusIndicator();
        
        // Forcer une mise à jour de l'heure serveur si succès
        if (data.status === 'success') {
            setTimeout(requestServerTime, 2000);
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
        evaluateSystemStatus();
        
        // Si sources disponibles et décalage détecté, synchroniser automatiquement
        if (syncState.connectedTimeSources.length > 0 && syncState.serverTime) {
            const now = new Date();
            const driftMs = Math.abs(now.getTime() - syncState.serverTime.getTime());
            const driftSeconds = Math.round(driftMs / 1000);
            
            console.log(`Vérification sync - Décalage: ${driftSeconds}s`);
            
            if (driftSeconds > config.maxDriftSeconds) {
                console.log(`Synchronisation automatique déclenchée - Décalage: ${driftSeconds}s`);
                performAutoSync();
            }
        }
    }
    
    function evaluateSystemStatus() {
        let newStatus = 'unknown';
        
        // Déterminer le statut du système
        if (syncState.connectedTimeSources.length === 0) {
            // Aucune source de temps connectée
            if (syncState.serverTime) {
                // On a quand même une heure serveur (RTC), donc OK
                newStatus = 'ok';
            } else {
                // Pas de source de temps du tout
                newStatus = 'error';
            }
        } else {
            // Au moins une source de temps connectée
            if (syncState.serverTime) {
                const now = new Date();
                const driftMs = Math.abs(now.getTime() - syncState.serverTime.getTime());
                const driftSeconds = Math.round(driftMs / 1000);
                
                if (driftSeconds <= config.maxDriftSeconds) {
                    newStatus = 'ok';
                } else {
                    // Décalage important détecté
                    newStatus = 'error';
                }
            } else {
                // Pas encore d'heure serveur reçue
                newStatus = 'unknown';
            }
        }
        
        // Mettre à jour le statut si changement
        if (newStatus !== syncState.systemStatus) {
            syncState.systemStatus = newStatus;
            updateStatusIndicator();
            console.log('Statut système mis à jour:', newStatus);
        }
    }
    
    function updateStatusIndicator() {
        if (!elements.statusIndicator) return;
        
        // UTILISER LES MÊMES CLASSES QUE WIFISTATS/MQTTSTATS
        elements.statusIndicator.classList.remove('status-ok', 'status-error');
        
        // Ajouter la classe appropriée
        switch (syncState.systemStatus) {
            case 'ok':
                elements.statusIndicator.classList.add('status-ok');
                elements.statusIndicator.title = 'Temps synchronisé';
                break;
            case 'error':
            case 'unknown':
            default:
                elements.statusIndicator.classList.add('status-error');
                elements.statusIndicator.title = 'Problème de synchronisation';
                break;
        }
    }
    
    function performAutoSync() {
        if (syncState.connectedTimeSources.length === 0) {
            console.warn('Aucune source de temps connectée pour la synchronisation automatique');
            return;
        }
        
        // Prendre la première source de temps connectée
        const timeSource = syncState.connectedTimeSources[0];
        const clientTime = new Date();
        
        console.log('Synchronisation automatique en cours...');
        
        // Préparer la commande de synchronisation
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
            console.log('Commande de synchronisation automatique envoyée:', syncCommand);
        } else {
            console.error('MQTT non connecté - synchronisation automatique impossible');
            syncState.systemStatus = 'error';
            updateStatusIndicator();
        }
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