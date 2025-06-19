// ===============================================================================
// CLOCK WIDGET V5 - SYNCHRONISATION INTELLIGENTE AVEC TIME_SOURCE
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
        systemStatus: 'unknown', // 'ok', 'error', 'unknown'
        currentDeviceIsTimeSource: false, // NOUVEAU: flag pour le device actuel
        currentDeviceMac: null // NOUVEAU: MAC address du device actuel
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
                
                // Détecter le device actuel
                detectCurrentDevice();
                
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
                
                console.log('Clock widget V5 avec détection time_source initialisé');
            })
            .catch(error => {
                console.error('Erreur chargement Clock widget:', error);
            });
    }
    
    // NOUVEAU: Détecter si le device actuel est configuré comme time_source
    async function detectCurrentDevice() {
        try {
            // Méthode 1: Essayer de récupérer l'adresse MAC locale (ne fonctionne pas dans tous les navigateurs)
            // Pour l'instant, on utilise une approche basée sur la détection des clients connectés
            
            // Charger la base de données des devices
            const deviceDb = await loadDeviceDatabase();
            
            // Attendre que la liste des clients soit disponible
            setTimeout(() => {
                if (syncState.connectedTimeSources.length > 0) {
                    // Pour l'instant, on considère que si au moins un time_source est connecté
                    // et que nous sommes sur le réseau local, nous pouvons synchroniser
                    console.log('Time sources détectées, synchronisation possible');
                    
                    // Dans une version future, on pourrait identifier spécifiquement 
                    // quel client consulte le dashboard via WebRTC ou autre méthode
                }
            }, 5000);
            
        } catch (error) {
            console.error('Erreur détection device actuel:', error);
        }
    }
    
    function updateClock() {
        try {
            // CORRECTION : Vérifier la validité de serverTime avant utilisation
            let displayTime;
            
            if (syncState.serverTime && !isNaN(syncState.serverTime.getTime())) {
                // Utiliser l'heure du serveur si elle est valide
                displayTime = new Date(syncState.serverTime.getTime());
                
                // Ajuster l'heure en fonction du temps écoulé depuis la dernière synchro
                if (syncState.lastSyncCheck) {
                    const elapsed = Date.now() - syncState.lastSyncCheck.getTime();
                    displayTime.setTime(displayTime.getTime() + elapsed);
                }
            } else {
                // Utiliser l'heure locale si pas d'heure serveur valide
                displayTime = new Date();
            }
            
            // Vérifier que displayTime est valide avant affichage
            if (!displayTime || isNaN(displayTime.getTime())) {
                console.error('Heure invalide détectée, utilisation de l\'heure locale');
                displayTime = new Date();
            }
            
            if (elements.time) {
                elements.time.textContent = displayTime.toLocaleTimeString('fr-FR');
            }
            
            if (elements.date) {
                elements.date.textContent = displayTime.toLocaleDateString('fr-FR');
            }
        } catch (error) {
            console.error('Erreur dans updateClock:', error);
            // En cas d'erreur, afficher l'heure locale
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
        try {
            if (data && data.timestamp) {
                // CORRECTION : Validation du timestamp avant conversion
                const timestamp = parseFloat(data.timestamp);
                
                if (isNaN(timestamp) || timestamp <= 0) {
                    console.error('Timestamp invalide reçu:', data.timestamp);
                    return;
                }
                
                // Convertir le timestamp Unix en Date
                const newServerTime = new Date(timestamp * 1000);
                
                // Vérifier que la date est valide
                if (isNaN(newServerTime.getTime())) {
                    console.error('Date invalide après conversion:', timestamp);
                    return;
                }
                
                // Vérifier que la date est raisonnable (pas dans le passé lointain ou futur)
                const now = new Date();
                const yearDiff = Math.abs(newServerTime.getFullYear() - now.getFullYear());
                if (yearDiff > 10) {
                    console.error('Date suspecte (écart > 10 ans):', newServerTime);
                    return;
                }
                
                syncState.serverTime = newServerTime;
                syncState.lastSyncCheck = new Date();
                
                // Mettre à jour l'affichage immédiatement
                updateClock();
                
                console.log('Heure serveur reçue:', syncState.serverTime.toLocaleString());
            }
        } catch (error) {
            console.error('Erreur dans handleServerTime:', error);
            // Ne pas modifier syncState.serverTime en cas d'erreur
        }
    }
    
    function handleWifiClients(data) {
        if (!data || !data.clients) return;
        
        // Charger la base de données des devices et identifier les sources de temps
        loadDeviceDatabase().then(deviceDb => {
            syncState.connectedTimeSources = data.clients.filter(client => {
                const mac = client.mac.toLowerCase();
                return deviceDb[mac] && deviceDb[mac].time_source === true;
            });
            
            console.log('Sources de temps connectées:', syncState.connectedTimeSources.length);
            
            // NOUVEAU: Afficher les time sources dans la console pour debug
            if (syncState.connectedTimeSources.length > 0) {
                console.log('Time sources disponibles:');
                syncState.connectedTimeSources.forEach(source => {
                    const device = deviceDb[source.mac.toLowerCase()];
                    console.log(`- ${device.name} (${source.mac})`);
                });
            }
            
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
        
        // MODIFICATION: Ne synchroniser que si on a des time_sources connectées
        if (syncState.connectedTimeSources.length > 0 && syncState.serverTime && !isNaN(syncState.serverTime.getTime())) {
            const now = new Date();
            const serverTimeAdjusted = new Date(syncState.serverTime.getTime());
            
            // Ajuster l'heure serveur en fonction du temps écoulé
            if (syncState.lastSyncCheck) {
                const elapsed = now.getTime() - syncState.lastSyncCheck.getTime();
                serverTimeAdjusted.setTime(serverTimeAdjusted.getTime() + elapsed);
            }
            
            const driftMs = Math.abs(now.getTime() - serverTimeAdjusted.getTime());
            const driftSeconds = Math.round(driftMs / 1000);
            
            console.log(`Vérification sync - Décalage: ${driftSeconds}s`);
            
            if (driftSeconds > config.maxDriftSeconds) {
                console.log(`Décalage important détecté: ${driftSeconds}s`);
                
                // NOUVEAU: Demander confirmation avant synchronisation automatique
                // Cela permet de s'assurer qu'on est bien sur un PC time_source
                if (shouldAutoSync()) {
                    console.log(`Synchronisation automatique déclenchée`);
                    performAutoSync();
                } else {
                    console.log('Synchronisation automatique désactivée - pas un time_source confirmé');
                }
            }
        }
    }
    
    // NOUVEAU: Logique pour déterminer si on doit synchroniser automatiquement
    function shouldAutoSync() {
        // Pour l'instant, on synchronise si:
        // 1. Au moins un time_source est connecté
        // 2. Le décalage est important
        // 
        // Dans une version future, on pourrait:
        // - Identifier spécifiquement si le PC actuel est un time_source
        // - Demander confirmation à l'utilisateur
        // - Vérifier que l'heure locale semble correcte (pas 1970, pas dans le futur, etc.)
        
        const localTime = new Date();
        const currentYear = localTime.getFullYear();
        
        // Vérifier que l'heure locale semble valide
        if (currentYear < 2020 || currentYear > 2030) {
            console.warn('Heure locale suspecte, pas de synchronisation automatique');
            return false;
        }
        
        // Si on a des time_sources connectées, on peut synchroniser
        return syncState.connectedTimeSources.length > 0;
    }
    
    function evaluateSystemStatus() {
        let newStatus = 'unknown';
        
        // Déterminer le statut du système
        if (syncState.connectedTimeSources.length === 0) {
            // Aucune source de temps connectée
            if (syncState.serverTime && !isNaN(syncState.serverTime.getTime())) {
                // On a quand même une heure serveur valide (RTC), donc OK
                newStatus = 'ok';
            } else {
                // Pas de source de temps du tout
                newStatus = 'error';
            }
        } else {
            // Au moins une source de temps connectée
            if (syncState.serverTime && !isNaN(syncState.serverTime.getTime())) {
                const now = new Date();
                const serverTimeAdjusted = new Date(syncState.serverTime.getTime());
                
                // Ajuster l'heure serveur en fonction du temps écoulé
                if (syncState.lastSyncCheck) {
                    const elapsed = now.getTime() - syncState.lastSyncCheck.getTime();
                    serverTimeAdjusted.setTime(serverTimeAdjusted.getTime() + elapsed);
                }
                
                const driftMs = Math.abs(now.getTime() - serverTimeAdjusted.getTime());
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
        const clientTime = new Date(); // Heure du PC qui consulte le dashboard
        
        console.log('Synchronisation automatique en cours...');
        console.log(`Heure locale du PC: ${clientTime.toLocaleString()}`);
        console.log(`Source utilisée: ${timeSource.mac}`);
        
        // Préparer la commande de synchronisation
        const syncCommand = {
            action: 'set_time',
            timestamp: Math.floor(clientTime.getTime() / 1000), // Heure du PC en secondes Unix
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            source_mac: timeSource.mac,
            source: 'dashboard_auto',
            source_device: navigator.userAgent, // Info sur le navigateur/PC
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
        destroy: destroy,
        // NOUVEAU: Exposer des méthodes pour le debug
        getState: () => syncState,
        forceSync: performAutoSync,
        checkSync: checkTimeSync
    };
})();