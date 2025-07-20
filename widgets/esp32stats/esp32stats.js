/**
 * Widget ESP32 Stats - Monitoring des cartes ESP32
 * Version simplifiée avec 4 métriques essentielles
 */
window.esp32stats = (function() {
    'use strict';
    
    const widgetId = 'Surveillance ESP32';
    let widgetElement = null;
    let currentTab = 'node1';
    let valueElements = {};
    
    // Données simulées pour les ESP32
    const esp32Data = {
        node1: {
            name: 'ESP32-NODE-01',
            status: 'online',
            metrics: {
                cpu: { value: 45, unit: '%' },
                ram: { value: 40, unit: '%' }, // En pourcentage
                temperature: { value: 42.5, unit: '°C' },
                uptime: { value: '2d 14h 32m' }
            }
        },
        node2: {
            name: 'ESP32-NODE-02',
            status: 'online',
            metrics: {
                cpu: { value: 38, unit: '%' },
                ram: { value: 48, unit: '%' }, // En pourcentage
                temperature: { value: 39.2, unit: '°C' },
                uptime: { value: '5d 8h 16m' }
            }
        }
    };
    
    /**
     * Met à jour les valeurs affichées sans recharger le DOM
     */
    function updateDisplayedValues() {
        const nodeData = esp32Data[currentTab];
        if (!nodeData || !valueElements) return;
        
        const metrics = nodeData.metrics;
        
        // Mise à jour CPU
        if (valueElements.cpu) {
            valueElements.cpu.textContent = `${metrics.cpu.value}${metrics.cpu.unit}`;
            valueElements.cpu.className = 'esp32-metric-value';
            if (metrics.cpu.value > 80) {
                valueElements.cpu.classList.add('warning');
            } else if (metrics.cpu.value > 90) {
                valueElements.cpu.classList.add('error');
            }
        }
        
        // Mise à jour RAM
        if (valueElements.ram) {
            valueElements.ram.textContent = `${metrics.ram.value}${metrics.ram.unit}`;
            valueElements.ram.className = 'esp32-metric-value';
            if (metrics.ram.value > 80) {
                valueElements.ram.classList.add('warning');
            } else if (metrics.ram.value > 90) {
                valueElements.ram.classList.add('error');
            }
        }
        
        // Mise à jour Température
        if (valueElements.temp) {
            valueElements.temp.textContent = `${metrics.temperature.value}${metrics.temperature.unit}`;
            valueElements.temp.className = 'esp32-metric-value';
            if (metrics.temperature.value > 60) {
                valueElements.temp.classList.add('warning');
            } else if (metrics.temperature.value > 70) {
                valueElements.temp.classList.add('error');
            }
        }
        
        // Mise à jour Uptime
        if (valueElements.uptime) {
            valueElements.uptime.textContent = metrics.uptime.value;
            valueElements.uptime.className = 'esp32-metric-value success';
        }
    }
    
    /**
     * Gère le clic sur les onglets
     */
    function handleTabClick(event) {
        const tab = event.target;
        if (!tab.classList.contains('esp32-tab')) return;
        
        // Éviter de recharger si c'est déjà l'onglet actif
        if (tab.dataset.tab === currentTab) return;
        
        // Retirer la classe active de tous les onglets
        widgetElement.querySelectorAll('.esp32-tab').forEach(t => {
            t.classList.remove('active');
        });
        
        // Ajouter la classe active à l'onglet cliqué
        tab.classList.add('active');
        
        // Mettre à jour l'onglet courant et rafraîchir les valeurs
        currentTab = tab.dataset.tab;
        updateDisplayedValues();
    }
    
    /**
     * Met à jour les données depuis MQTT
     */
    function updateData(topic, data) {
        // Parser le topic pour identifier le nœud et la métrique
        const parts = topic.split('/');
        if (parts.length < 3) return;
        
        const nodeId = parts[1];
        const metric = parts[2];
        
        if (esp32Data[nodeId] && esp32Data[nodeId].metrics[metric]) {
            if (typeof data === 'object') {
                esp32Data[nodeId].metrics[metric] = { ...esp32Data[nodeId].metrics[metric], ...data };
            } else {
                esp32Data[nodeId].metrics[metric].value = data;
            }
            
            // Mettre à jour l'affichage uniquement si on est sur le bon onglet
            if (currentTab === nodeId) {
                updateDisplayedValues();
            }
        }
    }
    
    /**
     * Simulation de mise à jour des données
     */
    function simulateDataUpdate() {
        // Variation aléatoire des valeurs pour node1
        esp32Data.node1.metrics.cpu.value = Math.round(Math.min(100, Math.max(0, 
            esp32Data.node1.metrics.cpu.value + (Math.random() - 0.5) * 10)));
        esp32Data.node1.metrics.ram.value = Math.round(Math.min(100, Math.max(0, 
            esp32Data.node1.metrics.ram.value + (Math.random() - 0.5) * 5)));
        esp32Data.node1.metrics.temperature.value = parseFloat(Math.min(80, Math.max(20, 
            esp32Data.node1.metrics.temperature.value + (Math.random() - 0.5) * 2)).toFixed(1));
        
        // Variation aléatoire des valeurs pour node2
        esp32Data.node2.metrics.cpu.value = Math.round(Math.min(100, Math.max(0, 
            esp32Data.node2.metrics.cpu.value + (Math.random() - 0.5) * 10)));
        esp32Data.node2.metrics.ram.value = Math.round(Math.min(100, Math.max(0, 
            esp32Data.node2.metrics.ram.value + (Math.random() - 0.5) * 5)));
        esp32Data.node2.metrics.temperature.value = parseFloat(Math.min(80, Math.max(20, 
            esp32Data.node2.metrics.temperature.value + (Math.random() - 0.5) * 2)).toFixed(1));
        
        // Simulation d'incrémentation de l'uptime
        updateUptime();
        
        // Mettre à jour l'affichage
        updateDisplayedValues();
    }
    
    /**
     * Simule l'incrémentation de l'uptime
     */
    function updateUptime() {
        // Cette fonction pourrait parser et incrémenter l'uptime
        // Pour l'instant on garde les valeurs statiques
        // Dans un cas réel, l'uptime viendrait de l'ESP32
    }
    
    /**
     * Initialisation du widget
     */
    function init(element) {
        console.log(`✅​️ ${widgetId} initialisé.​`);
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/esp32stats/esp32stats.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer les références aux éléments de valeur
                valueElements = {
                    cpu: widgetElement.querySelector('[data-metric="cpu"]'),
                    ram: widgetElement.querySelector('[data-metric="ram"]'),
                    temp: widgetElement.querySelector('[data-metric="temp"]'),
                    uptime: widgetElement.querySelector('[data-metric="uptime"]')
                };
                
                // Ajouter les event listeners pour les onglets
                const tabs = widgetElement.querySelectorAll('.esp32-tab');
                tabs.forEach(tab => {
                    tab.addEventListener('click', handleTabClick);
                });
                
                // Afficher les valeurs initiales
                updateDisplayedValues();
                
                // S'abonner aux topics MQTT si disponible
                if (window.orchestrator && window.orchestrator.subscribeToTopic) {
                    window.orchestrator.subscribeToTopic('esp32/+/+', updateData);
                    console.log(`[${widgetId}] Abonné aux topics MQTT esp32/+/+`);
                }
                
                // Simuler des mises à jour toutes les 5 secondes
                setInterval(simulateDataUpdate, 5000);
            })
            .catch(error => {
                console.error(`[${widgetId}] Erreur lors du chargement du HTML:`, error);
            });
    }
    
    /**
     * Destruction du widget
     */
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget(widgetId);
        }
    }
    
    // API publique
    return {
        init: init,
        destroy: destroy,
        updateData: updateData
    };
})();