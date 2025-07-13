window.mqttlogspochedetest = (function() {
    'use strict';
    
    const widgetId = 'mqttlogspochedetest';
    let widgetElement = null;
    let logsContainer = null;
    let logs = [];
    const MAX_LOGS = 1000;
    const MAX_DISPLAY_LOGS = 100;
    const TARGET_MACHINES = ['998', '999'];
    
    const CACHE_KEY = 'mqttlogspochedetest_cache';
    const CACHE_EXPIRY_HOURS = 24;
    
    function init(container) {
        widgetElement = container;
        
        fetch('widgets/mqttlogspochedetest/mqttlogspochedetest.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                logsContainer = widgetElement.querySelector('.logs-container');
                
                if (!logsContainer) {
                    console.error(`[${widgetId}] Container des logs non trouvé après injection HTML`);
                    return;
                }
                
                console.log(`[${widgetId}] Widget initialisé avec succès`);
                
                loadFromCache();
                
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('mqttlogspochedetest', {
                        update: handleConfirmedResult
                    }, ['test.confirmed']);
                } else {
                    console.error(`[${widgetId}] Orchestrateur non disponible`);
                }
            })
            .catch(error => {
                console.error(`[${widgetId}] Erreur chargement HTML:`, error);
            });
        
        return true;
    }
    
    function loadFromCache() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const cacheData = JSON.parse(cached);
                const age = Date.now() - cacheData.timestamp;
                const maxAge = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
                
                if (age < maxAge && cacheData.logs && Array.isArray(cacheData.logs)) {
                    logs = cacheData.logs;
                    displayCachedLogs();
                    return;
                }
            }
        } catch (e) {
            console.warn(`[${widgetId}] Erreur lecture cache:`, e);
        }
        
        addSystemMessage('En attente des résultats confirmés...', 'info');
    }
    
    function clearCache() {
        try {
            localStorage.removeItem(CACHE_KEY);
            logs = [];
            if (logsContainer) {
                logsContainer.innerHTML = '';
                addSystemMessage('Cache vidé', 'success');
            }
        } catch (e) {
            console.warn(`[${widgetId}] Erreur suppression cache:`, e);
        }
    }
    
    function handleConfirmedResult(topic, data) {
        if (topic !== 'test.confirmed') {
            return;
        }
        
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
    
    function saveToCache() {
        try {
            const cacheData = {
                logs: logs.slice(-MAX_LOGS),
                timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {
            console.warn(`[${widgetId}] Erreur sauvegarde cache:`, e);
        }
    }
    
    function displayCachedLogs() {
        if (!logsContainer) {
            console.warn(`[${widgetId}] Container non disponible pour displayCachedLogs`);
            return;
        }
        
        logsContainer.innerHTML = '';
        
        const logsToDisplay = logs.slice(-MAX_DISPLAY_LOGS);
        
        logsToDisplay.forEach(log => {
            const logElement = createLogElement(log);
            logsContainer.appendChild(logElement);
            logElement.style.opacity = '1';
            logElement.style.transform = 'translateX(0)';
        });
        
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        if (logs.length > MAX_DISPLAY_LOGS) {
            const hiddenCount = logs.length - MAX_DISPLAY_LOGS;
            console.log(`[${widgetId}] ${hiddenCount} lignes cachées pour performance`);
        }
    }
    
    function addLog(logEntry) {
        if (!logsContainer) {
            console.warn(`[${widgetId}] Container non disponible pour addLog`);
            return;
        }
        
        logs.push(logEntry);
        
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(-MAX_LOGS);
        }
        
        const logElement = createLogElement(logEntry);
        
        const systemMsg = logsContainer.querySelector('.system-message');
        if (systemMsg) {
            systemMsg.remove();
        }
        
        logsContainer.appendChild(logElement);
        
        while (logsContainer.children.length > MAX_DISPLAY_LOGS) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
        
        logElement.offsetHeight;
        logElement.style.opacity = '1';
        logElement.style.transform = 'translateX(0)';
        
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        saveToCache();
    }
    
    function createLogElement(log) {
        const div = document.createElement('div');
        div.className = 'log-line';
        div.style.opacity = '0';
        div.style.transform = 'translateX(20px)';
        div.style.transition = 'all 0.3s ease';
        
        const [date, time] = formatTimestampForDisplay(log.timestamp);
        const statusText = getStatusText(log.result);
        const statusClass = getStatusClass(log.result);
        
        div.innerHTML = `
            <div class="datetime-container">
                <span class="log-date">${date}</span>
                <span class="log-time">${time}</span>
            </div>
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
        if (!logsContainer) {
            console.warn(`[${widgetId}] Container non disponible pour addSystemMessage`);
            return;
        }
        
        const div = document.createElement('div');
        div.className = `system-message ${type}`;
        div.textContent = message;
        
        logsContainer.innerHTML = '';
        logsContainer.appendChild(div);
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('mqttlogspochedetest');
        }
        
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
        clearCache: clearCache
    };
})();