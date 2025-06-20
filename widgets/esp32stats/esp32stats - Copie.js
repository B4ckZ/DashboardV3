/**
 * Widget ESP32 Stats - Monitoring des cartes ESP32
 */
window.esp32stats = (function() {
    'use strict';
    
    const widgetId = 'esp32stats';
    let widgetElement = null;
    let contentElement = null;
    let currentTab = 'node1';
    
    // Données simulées pour les ESP32
    const esp32Data = {
        node1: {
            name: 'ESP32-NODE-01',
            status: 'online',
            metrics: {
                cpu: { value: 45, unit: '%' },
                ram: { used: 128, total: 320, unit: 'KB' },
                temperature: { value: 42, unit: '°C' },
                uptime: { value: '2d 14h 32m' },
                wifi: { rssi: -45, unit: 'dBm' },
                tasks: { value: 12 },
                heap: { free: 192, unit: 'KB' }
            }
        },
        node2: {
            name: 'ESP32-NODE-02',
            status: 'online',
            metrics: {
                cpu: { value: 38, unit: '%' },
                ram: { used: 156, total: 320, unit: 'KB' },
                temperature: { value: 39, unit: '°C' },
                uptime: { value: '5d 8h 16m' },
                wifi: { rssi: -52, unit: 'dBm' },
                tasks: { value: 15 },
                heap: { free: 164, unit: 'KB' }
            }
        }
    };
    
    /**
     * Crée le contenu HTML pour un nœud ESP32
     */
    function createNodeContent(nodeData) {
        const metrics = nodeData.metrics;
        const ramPercent = Math.round((metrics.ram.used / metrics.ram.total) * 100);
        
        return `
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Utilisation CPU</span>
                <span class="esp32-metric-value">${metrics.cpu.value}${metrics.cpu.unit}</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">RAM Utilisée</span>
                <span class="esp32-metric-value">${metrics.ram.used}${metrics.ram.unit} / ${metrics.ram.total}${metrics.ram.unit}</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Température</span>
                <span class="esp32-metric-value ${metrics.temperature.value > 50 ? 'warning' : ''}">${metrics.temperature.value}${metrics.temperature.unit}</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Uptime</span>
                <span class="esp32-metric-value">${metrics.uptime.value}</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Signal WiFi</span>
                <span class="esp32-metric-value">${metrics.wifi.rssi}${metrics.wifi.unit}</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Tâches actives</span>
                <span class="esp32-metric-value">${metrics.tasks.value}</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Heap libre</span>
                <span class="esp32-metric-value">${metrics.heap.free}${metrics.heap.unit}</span>
            </div>
        `;
    }
    
    /**
     * Crée le contenu du résumé
     */
    function createSummaryContent() {
        const node1 = esp32Data.node1.metrics;
        const node2 = esp32Data.node2.metrics;
        
        const avgCpu = Math.round((node1.cpu.value + node2.cpu.value) / 2);
        const totalRam = node1.ram.used + node2.ram.used;
        const avgTemp = ((node1.temperature.value + node2.temperature.value) / 2).toFixed(1);
        
        return `
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Devices en ligne</span>
                <span class="esp32-metric-value success">2/2</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">CPU moyen</span>
                <span class="esp32-metric-value">${avgCpu}%</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">RAM totale utilisée</span>
                <span class="esp32-metric-value">${totalRam}KB</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Température moyenne</span>
                <span class="esp32-metric-value">${avgTemp}°C</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Signal WiFi min</span>
                <span class="esp32-metric-value">${Math.min(node1.wifi.rssi, node2.wifi.rssi)}dBm</span>
            </div>
            <div class="esp32-metric-row">
                <span class="esp32-metric-label">Alertes actives</span>
                <span class="esp32-metric-value success">0</span>
            </div>
        `;
    }
    
    /**
     * Met à jour le contenu selon l'onglet actif
     */
    function updateContent() {
        if (!contentElement) return;
        
        let content = '';
        switch(currentTab) {
            case 'node1':
                content = createNodeContent(esp32Data.node1);
                break;
            case 'node2':
                content = createNodeContent(esp32Data.node2);
                break;
            case 'summary':
                content = createSummaryContent();
                break;
        }
        
        contentElement.innerHTML = content;
    }
    
    /**
     * Gère le clic sur les onglets
     */
    function handleTabClick(event) {
        const tab = event.target.closest('.esp32-tab');
        if (!tab) return;
        
        // Retirer la classe active de tous les onglets
        widgetElement.querySelectorAll('.esp32-tab').forEach(t => {
            t.classList.remove('active');
        });
        
        // Ajouter la classe active à l'onglet cliqué
        tab.classList.add('active');
        
        // Mettre à jour le contenu
        currentTab = tab.dataset.tab;
        updateContent();
    }
    
    /**
     * Met à jour les données depuis MQTT
     */
    function updateData(topic, data) {
        // Parser le topic pour identifier le nœud et la métrique
        // Format attendu: esp32/node1/cpu, esp32/node2/temperature, etc.
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
            
            // Mettre à jour l'affichage si on est sur le bon onglet
            if (currentTab === nodeId || currentTab === 'summary') {
                updateContent();
            }
        }
    }
    
    /**
     * Initialisation du widget
     */
    function init(element) {
        console.log(`[${widgetId}] Initialisation`);
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/esp32stats/esp32stats.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer les éléments
                contentElement = widgetElement.querySelector('#esp32-content');
                
                // Ajouter les event listeners pour les onglets
                widgetElement.querySelector('.esp32-tabs').addEventListener('click', handleTabClick);
                
                // Afficher le contenu initial
                updateContent();
                
                // S'abonner aux topics MQTT si disponible
                if (window.orchestrator && window.orchestrator.subscribeToTopic) {
                    // S'abonner aux métriques des ESP32
                    window.orchestrator.subscribeToTopic('esp32/+/+', updateData);
                    console.log(`[${widgetId}] Abonné aux topics MQTT esp32/+/+`);
                }
                
                // Simuler des mises à jour pour la démo
                setInterval(() => {
                    // Variation aléatoire des valeurs
                    esp32Data.node1.metrics.cpu.value = Math.min(100, Math.max(0, esp32Data.node1.metrics.cpu.value + (Math.random() - 0.5) * 10));
                    esp32Data.node2.metrics.cpu.value = Math.min(100, Math.max(0, esp32Data.node2.metrics.cpu.value + (Math.random() - 0.5) * 10));
                    esp32Data.node1.metrics.temperature.value = Math.min(80, Math.max(20, esp32Data.node1.metrics.temperature.value + (Math.random() - 0.5) * 2));
                    esp32Data.node2.metrics.temperature.value = Math.min(80, Math.max(20, esp32Data.node2.metrics.temperature.value + (Math.random() - 0.5) * 2));
                    
                    updateContent();
                }, 5000);
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