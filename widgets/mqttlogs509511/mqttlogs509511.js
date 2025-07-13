// widgets/mqttlogs509511/mqttlogs509511.js - Widget MQTT Logs V5
// Version corrigée suivant le pattern des autres widgets + fix erreur DOM
// ==============================================================

window.mqttlogs509511 = (function() {
    'use strict';
    
    const widgetId = 'mqttlogs509511';
    let widgetElement = null;
    let logsContainer = null;
    let logs = [];
    const MAX_LOGS = 50;
    const TARGET_MACHINES = ['509', '511'];
    
    /**
     * Initialise le widget
     */
    function init(element) {
        console.log(`[${widgetId}] Initialisation - Version CSV sécurisée`);
        widgetElement = element;
        
        // Charger le HTML
        fetch('widgets/mqttlogs509511/mqttlogs509511.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                logsContainer = widgetElement.querySelector('.logs-container');
                
                if (!logsContainer) {
                    console.error(`[${widgetId}] Container des logs non trouvé`);
                    return;
                }
                
                // Message initial
                addSystemMessage("En attente des résultats confirmés et persistés...");
                
                // CORRECTION : Utiliser le pattern standard registerWidget
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('mqttlogs509511', {
                        update: handleConfirmedResult
                    }, ['SOUFFLAGE/ESP32/RTP/CONFIRMED']);
                    
                    console.log(`[${widgetId}] Widget enregistré avec topic: SOUFFLAGE/ESP32/RTP/CONFIRMED`);
                    console.log(`[${widgetId}] Filtrage pour machines: ${TARGET_MACHINES.join(', ')}`);
                } else {
                    console.error(`[${widgetId}] Orchestrateur non disponible`);
                    addSystemMessage("Erreur: Système MQTT non disponible", 'error');
                }
            })
            .catch(error => {
                console.error(`[${widgetId}] Erreur lors du chargement:`, error);
            });
    }
    
    /**
     * Gère la réception d'un résultat confirmé et persisté
     * Cette fonction est appelée par l'orchestrateur avec (topic, data)
     */
    function handleConfirmedResult(topic, data) {
        console.log(`[${widgetId}] Résultat confirmé reçu:`, topic, data);
        
        try {
            // Les données arrivent directement en format CSV string
            const csv_line = typeof data === 'string' ? data.trim() : data.toString().trim();
            console.log(`[${widgetId}] Ligne CSV reçue: "${csv_line}"`);
            
            // Parser la ligne CSV: date,heure,équipe,codebarre,résultat
            const csv_fields = csv_line.split(',');
            
            if (csv_fields.length !== 5) {
                console.error(`[${widgetId}] Format CSV invalide: ${csv_fields.length} champs au lieu de 5`);
                return;
            }
            
            const [date, heure, equipe, codebarre, resultat] = csv_fields;
            
            // Extraire l'ID machine du code-barres (positions 7,8,9)
            if (codebarre.length < 9) {
                console.error(`[${widgetId}] Code-barres trop court: ${codebarre}`);
                return;
            }
            
            const machineId = codebarre.substring(6, 9); // Positions 7,8,9 (indices 6,7,8)
            console.log(`[${widgetId}] Machine extraite du code-barres: "${machineId}"`);
            
            // Filtrer uniquement les machines 509 et 511
            if (!TARGET_MACHINES.includes(machineId)) {
                console.log(`[${widgetId}] Machine ${machineId} filtrée (non ciblée)`);
                return;
            }
            
            // Convertir le résultat numérique en texte
            const resultText = getResultText(resultat);
            
            // Créer l'entrée de log avec timestamp formaté
            const logEntry = {
                id: Date.now(),
                timestamp: formatTimestamp(date, heure),
                machine: machineId,
                team: equipe || '?',
                barcode: codebarre,
                result: resultText,
                confirmed: true
            };
            
            console.log(`[${widgetId}] Entrée de log créée:`, logEntry);
            
            // Ajouter le log
            addLog(logEntry);
            
        } catch (error) {
            console.error(`[${widgetId}] Erreur lors du traitement:`, error);
        }
    }
    
    /**
     * Convertit le résultat numérique en texte
     */
    function getResultText(resultat) {
        switch (resultat.toString().trim()) {
            case '1':
                return 'POCHE OK';
            case '2':
                return 'FUITE VANNE';
            case '3':
                return 'FUITE POCHE';
            default:
                return resultat; // Garder la valeur originale si inconnue
        }
    }
    
    /**
     * Formate le timestamp à partir de date et heure CSV
     */
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
    
    /**
     * Ajoute un log à l'affichage
     */
    function addLog(logEntry) {
        // Ajouter au début de la liste
        logs.unshift(logEntry);
        
        // Limiter le nombre de logs
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(0, MAX_LOGS);
        }
        
        // Créer l'élément HTML
        const logElement = createLogElement(logEntry);
        
        // Retirer le message initial s'il existe
        const systemMsg = logsContainer.querySelector('.system-message');
        if (systemMsg) {
            systemMsg.remove();
        }
        
        // Ajouter au début du container
        if (logsContainer.firstChild) {
            logsContainer.insertBefore(logElement, logsContainer.firstChild);
        } else {
            logsContainer.appendChild(logElement);
        }
        
        // Retirer les anciens logs si nécessaire
        while (logsContainer.children.length > MAX_LOGS) {
            logsContainer.removeChild(logsContainer.lastChild);
        }
        
        // Animation d'entrée
        setTimeout(() => {
            logElement.classList.add('show');
        }, 10);
    }
    
    /**
     * Crée l'élément HTML pour un log - VERSION CORRIGÉE
     */
    function createLogElement(log) {
        const div = document.createElement('div');
        div.className = 'log-line';
        
        // CORRECTION : Ajouter la classe seulement si elle n'est pas vide
        const resultClass = getResultClass(log.result);
        if (resultClass) {
            div.classList.add(resultClass);
        }
        
        // Formater la date et l'heure pour affichage
        const [date, time] = formatTimestampForDisplay(log.timestamp);
        
        // Créer le contenu HTML
        div.innerHTML = `
            <span class="log-date">${date}</span>
            <span class="log-time">${time}</span>
            <span class="log-device">${log.machine}</span>
            <span class="log-id">${log.barcode}</span>
            <div class="status-indicator ${getStatusClass(log.result)}">${getStatusText(log.result)}</div>
        `;
        
        return div;
    }
    
    /**
     * Formate le timestamp pour l'affichage
     */
    function formatTimestampForDisplay(timestamp) {
        try {
            const [datePart, timePart] = timestamp.split('T');
            const time = timePart ? timePart.substring(0, 5) : '00:00';
            return [datePart, time];
        } catch (e) {
            return ['--/--/----', '--:--'];
        }
    }
    
    /**
     * Retourne la classe CSS pour le résultat - VERSION CORRIGÉE
     */
    function getResultClass(result) {
        switch (result.toUpperCase()) {
            case 'POCHE OK':
                return null; // CORRECTION : Pas de classe CSS particulière pour POCHE OK
            case 'FUITE VANNE':
            case 'FV':
                return 'log-fuite-vanne';
            case 'FUITE POCHE':
            case 'FP':
                return 'log-fuite-poche';
            default:
                return 'log-unknown';
        }
    }
    
    /**
     * Retourne la classe CSS pour l'indicateur de statut
     */
    function getStatusClass(result) {
        switch (result.toUpperCase()) {
            case 'POCHE OK':
                return 'status-ok';
            case 'FUITE VANNE':
            case 'FV':
                return 'status-fuite-vanne';
            case 'FUITE POCHE':
            case 'FP':
                return 'status-fuite-poche';
            default:
                return 'status-unknown';
        }
    }
    
    /**
     * Retourne le texte court pour le statut
     */
    function getStatusText(result) {
        switch (result.toUpperCase()) {
            case 'POCHE OK':
                return 'OK'; // Texte court pour "POCHE OK"
            case 'FUITE VANNE':
            case 'FV':
                return 'FV';
            case 'FUITE POCHE':
            case 'FP':
                return 'FP';
            default:
                return '?';
        }
    }
    
    /**
     * Ajoute un message système
     */
    function addSystemMessage(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `system-message ${type}`;
        div.textContent = message;
        
        if (logsContainer) {
            logsContainer.innerHTML = '';
            logsContainer.appendChild(div);
        }
    }
    
    /**
     * Destruction du widget
     */
    function destroy() {
        console.log(`[${widgetId}] Destruction`);
        
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('mqttlogs509511');
        }
        
        logs = [];
        if (logsContainer) {
            logsContainer.innerHTML = '';
        }
    }
    
    // API publique
    return {
        init: init,
        destroy: destroy
    };
})();