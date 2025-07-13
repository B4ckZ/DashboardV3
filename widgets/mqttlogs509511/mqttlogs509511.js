// widgets/mqttlogs509511/mqttlogs509511.js
// Widget d'affichage des résultats de tests confirmés pour machines 509 et 511
// Version finale optimisée : date courte DD/MM/YY + sans badge équipe + couleurs de statut

window.mqttlogs509511 = (function() {
    'use strict';
    
    const widgetId = 'mqttlogs509511';
    let widgetElement = null;
    let logsContainer = null;
    let logs = [];
    const MAX_LOGS = 1000;
    const MAX_DISPLAY_LOGS = 100; // Limite d'affichage pour les performances
    const TARGET_MACHINES = ['509', '511'];
    
    // Configuration du cache localStorage
    const CACHE_KEY = 'mqttlogs509511_cache';
    const CACHE_EXPIRY_HOURS = 24; // Cache expire après 24h
    
    // Fonctions de cache localStorage
    function saveToCache() {
        try {
            const cacheData = {
                logs: logs.slice(-MAX_LOGS), // Garde les 1000 dernières lignes
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            console.log(`[${widgetId}] Cache sauvegardé: ${logs.length} lignes`);
        } catch (e) {
            console.warn(`[${widgetId}] Erreur sauvegarde cache:`, e);
        }
    }
    
    function displayCachedLogs() {
        logsContainer.innerHTML = '';
        
        // N'affiche que les dernières lignes pour les performances
        const logsToDisplay = logs.slice(-MAX_DISPLAY_LOGS);
        
        logsToDisplay.forEach(log => {
            const logElement = createLogElement(log);
            logsContainer.appendChild(logElement);
            // Pas d'animation pour les logs cachés (affichage immédiat)
            logElement.classList.add('show');
        });
        
        // Scroll vers le bas pour montrer les plus récents
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        if (logs.length > MAX_DISPLAY_LOGS) {
            console.log(`[${widgetId}] Affichage: ${MAX_DISPLAY_LOGS} lignes (${logs.length} en cache)`);
        }
    }
    
    function loadFromCache() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const cacheData = JSON.parse(cached);
                
                // Vérifie que le cache n'est pas expiré
                const cacheAge = Date.now() - cacheData.timestamp;
                const maxAge = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
                
                if (cacheAge < maxAge && cacheData.logs) {
                    console.log(`[${widgetId}] Cache restauré: ${cacheData.logs.length} lignes`);
                    return cacheData.logs;
                } else {
                    console.log(`[${widgetId}] Cache expiré, suppression`);
                    localStorage.removeItem(CACHE_KEY);
                }
            }
        } catch (e) {
            console.warn(`[${widgetId}] Erreur chargement cache:`, e);
            localStorage.removeItem(CACHE_KEY);
        }
        return [];
    }
    
    function clearCache() {
        try {
            localStorage.removeItem(CACHE_KEY);
            console.log(`[${widgetId}] Cache vidé`);
        } catch (e) {
            console.warn(`[${widgetId}] Erreur vidage cache:`, e);
        }
    }
    
    function init(element) {
        widgetElement = element;
        
        fetch('widgets/mqttlogs509511/mqttlogs509511.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                logsContainer = widgetElement.querySelector('.logs-container');
                
                if (!logsContainer) {
                    console.error(`[${widgetId}] Container des logs non trouvé`);
                    return;
                }
                
                // Charger le cache avant d'afficher le message d'attente
                const cachedLogs = loadFromCache();
                
                if (cachedLogs.length > 0) {
                    logs = cachedLogs;
                    displayCachedLogs();
                    console.log(`[${widgetId}] ${cachedLogs.length} lignes restaurées depuis le cache`);
                } else {
                    addSystemMessage("En attente des résultats confirmés et persistés...");
                }
                
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('mqttlogs509511', {
                        update: handleConfirmedResult
                    }, ['test.confirmed']);
                } else {
                    console.error(`[${widgetId}] Orchestrateur non disponible`);
                    addSystemMessage("Erreur: Système MQTT non disponible", 'error');
                }
            })
            .catch(error => {
                console.error(`[${widgetId}] Erreur lors du chargement:`, error);
            });
    }
    
    function handleConfirmedResult(topic, data) {
        try {
            let csv_line;
            if (typeof data === 'string') {
                csv_line = data.trim();
            } else if (data && typeof data === 'object') {
                csv_line = data.value || data.raw || data.formatted || data.toString();
                if (typeof csv_line === 'string') {
                    csv_line = csv_line.trim();
                } else {
                    console.error(`[${widgetId}] Format de données invalide:`, data);
                    return;
                }
            } else {
                csv_line = data.toString().trim();
            }
            
            const csv_fields = csv_line.split(',');
            if (csv_fields.length !== 5) {
                console.error(`[${widgetId}] Format CSV invalide: ${csv_fields.length} champs`);
                return;
            }
            
            const [date, heure, equipe, codebarre, resultat] = csv_fields;
            
            if (codebarre.length < 9) {
                console.error(`[${widgetId}] Code-barres trop court: ${codebarre}`);
                return;
            }
            
            const machineId = codebarre.substring(6, 9);
            
            if (!TARGET_MACHINES.includes(machineId)) {
                return;
            }
            
            const logEntry = {
                id: Date.now(),
                timestamp: formatTimestamp(date, heure),
                machine: machineId,
                barcode: codebarre,
                result: getResultText(resultat),
                confirmed: true
            };
            
            addLog(logEntry);
            
        } catch (error) {
            console.error(`[${widgetId}] Erreur lors du traitement:`, error);
        }
    }
    
    function getResultText(resultat) {
        switch (resultat.toString().trim()) {
            case '1': return 'POCHE OK';
            case '2': return 'FUITE VANNE';
            case '3': return 'FUITE POCHE';
            default: return resultat;
        }
    }
    
    function formatTimestamp(date, heure) {
        try {
            const dateParts = date.split('/');
            if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                const timePart = heure.replace('H', ':') + ':00';
                return `${day}-${month}-${year}T${timePart}`;
            }
        } catch (e) {
            console.warn(`[${widgetId}] Erreur formatage timestamp:`, e);
        }
        return `${date}T${heure}`;
    }
    
    function addLog(logEntry) {
        logs.push(logEntry); // Ajoute à la fin du tableau au lieu du début
        
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(-MAX_LOGS); // Garde les 1000 derniers éléments
        }
        
        const logElement = createLogElement(logEntry);
        
        const systemMsg = logsContainer.querySelector('.system-message');
        if (systemMsg) {
            systemMsg.remove();
        }
        
        // Ajoute toujours à la fin
        logsContainer.appendChild(logElement);
        
        // Supprime les anciens éléments d'affichage si nécessaire (limite visuelle)
        while (logsContainer.children.length > MAX_DISPLAY_LOGS) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
        
        setTimeout(() => logElement.classList.add('show'), 10);
        
        // Auto-scroll vers le bas pour voir la nouvelle ligne
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        // Sauvegarde dans le cache après chaque nouveau log
        saveToCache();
    }
    
    function createLogElement(log) {
        const div = document.createElement('div');
        div.className = 'log-line';
        
        const [date, time] = formatTimestampForDisplay(log.timestamp);
        const statusText = getStatusText(log.result);
        const statusClass = getStatusClass(log.result);
        
        div.innerHTML = `
            <span class="log-date">${date}</span>
            <span class="log-time">${time}</span>
            <span class="blue-badge machine">${log.machine}</span>
            <span class="log-barcode" title="${log.barcode}">${log.barcode}</span>
            <span class="blue-badge status ${statusClass}">${statusText}</span>
        `;
        
        return div;
    }
    
    function formatTimestampForDisplay(timestamp) {
        try {
            const [datePart, timePart] = timestamp.split('T');
            const time = timePart ? timePart.substring(0, 5) : '00:00';
            const dateFormatted = formatDateShort(datePart);
            return [dateFormatted, time];
        } catch (e) {
            return ['--/--/--', '--:--'];
        }
    }
    
    function formatDateShort(datePart) {
        try {
            const parts = datePart.split('-');
            if (parts.length === 3) {
                const [day, month, year] = parts;
                const shortYear = year.slice(-2);
                return `${day}/${month}/${shortYear}`;
            }
        } catch (e) {
            console.warn(`[${widgetId}] Erreur formatage date courte:`, e);
        }
        
        try {
            const withSlashes = datePart.replace(/-/g, '/');
            const parts = withSlashes.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts;
                const shortYear = year.length === 4 ? year.slice(-2) : year;
                return `${day}/${month}/${shortYear}`;
            }
        } catch (e) {
            console.warn(`[${widgetId}] Erreur formatage date courte fallback:`, e);
        }
        
        return '--/--/--';
    }
    
    function getStatusText(result) {
        switch (result.toUpperCase()) {
            case 'POCHE OK': return 'OK';
            case 'FUITE VANNE': return 'FV';
            case 'FUITE POCHE': return 'FP';
            default: return '?';
        }
    }
    
    function getStatusClass(result) {
        switch (result.toUpperCase()) {
            case 'POCHE OK': return 'status-ok';
            case 'FUITE VANNE': return 'status-fv';
            case 'FUITE POCHE': return 'status-fp';
            default: return '';
        }
    }
    
    function addSystemMessage(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `system-message ${type}`;
        div.textContent = message;
        
        if (logsContainer) {
            logsContainer.innerHTML = '';
            logsContainer.appendChild(div);
        }
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('mqttlogs509511');
        }
        
        // Sauvegarde finale avant destruction
        if (logs.length > 0) {
            saveToCache();
        }
        
        logs = [];
        if (logsContainer) {
            logsContainer.innerHTML = '';
        }
    }
    
    return {
        init: init,
        destroy: destroy,
        clearCache: clearCache // Fonction utilitaire pour vider le cache si nécessaire
    };
})();