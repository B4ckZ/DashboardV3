// widgets/mqttlogs509511/mqttlogs509511.js
// Widget d'affichage des résultats de tests confirmés pour machines 509 et 511
// ============================================================================

window.mqttlogs509511 = (function() {
    'use strict';
    
    const widgetId = 'mqttlogs509511';
    let widgetElement = null;
    let logsContainer = null;
    let logs = [];
    const MAX_LOGS = 50;
    const TARGET_MACHINES = ['509', '511'];
    
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
                
                addSystemMessage("En attente des résultats confirmés et persistés...");
                
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
                team: equipe || '?',
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
        logs.unshift(logEntry);
        
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(0, MAX_LOGS);
        }
        
        const logElement = createLogElement(logEntry);
        
        const systemMsg = logsContainer.querySelector('.system-message');
        if (systemMsg) {
            systemMsg.remove();
        }
        
        if (logsContainer.firstChild) {
            logsContainer.insertBefore(logElement, logsContainer.firstChild);
        } else {
            logsContainer.appendChild(logElement);
        }
        
        while (logsContainer.children.length > MAX_LOGS) {
            logsContainer.removeChild(logsContainer.lastChild);
        }
        
        setTimeout(() => logElement.classList.add('show'), 10);
    }
    
    function createLogElement(log) {
        const div = document.createElement('div');
        div.className = 'log-line';
        
        const [date, time] = formatTimestampForDisplay(log.timestamp);
        
        div.innerHTML = `
            <span class="log-date">${date}</span>
            <span class="log-time">${time}</span>
            <span class="blue-badge">${log.team}</span>
            <span class="blue-badge">${log.machine}</span>
            <span class="log-barcode">${log.barcode}</span>
            <span class="blue-badge">${getStatusText(log.result)}</span>
        `;
        
        return div;
    }
    
    function formatTimestampForDisplay(timestamp) {
        try {
            const [datePart, timePart] = timestamp.split('T');
            const time = timePart ? timePart.substring(0, 5) : '00:00';
            const dateFormatted = datePart.replace(/-/g, '/');
            return [dateFormatted, time];
        } catch (e) {
            return ['--/--/----', '--:--'];
        }
    }
    
    function getStatusText(result) {
        switch (result.toUpperCase()) {
            case 'POCHE OK': return 'OK';
            case 'FUITE VANNE': return 'FV';
            case 'FUITE POCHE': return 'FP';
            default: return '?';
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
        
        logs = [];
        if (logsContainer) {
            logsContainer.innerHTML = '';
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();