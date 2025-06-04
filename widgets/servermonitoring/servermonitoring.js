// widgets/servermonitoring/servermonitoring.js - Widget Server Monitoring V3
// =========================================================================

window.servermonitoring = (function() {
    let widgetElement;
    let elements = {};
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/servermonitoring/servermonitoring.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer tous les éléments de métriques
                elements = {
                    // CPU
                    'cpu-core1': {
                        row: widgetElement.querySelector('[data-metric="cpu-core1"]'),
                        bar: null,
                        value: null
                    },
                    'cpu-core2': {
                        row: widgetElement.querySelector('[data-metric="cpu-core2"]'),
                        bar: null,
                        value: null
                    },
                    'cpu-core3': {
                        row: widgetElement.querySelector('[data-metric="cpu-core3"]'),
                        bar: null,
                        value: null
                    },
                    'cpu-core4': {
                        row: widgetElement.querySelector('[data-metric="cpu-core4"]'),
                        bar: null,
                        value: null
                    },
                    // Températures
                    'temp-cpu': {
                        row: widgetElement.querySelector('[data-metric="temp-cpu"]'),
                        bar: null,
                        value: null
                    },
                    'temp-gpu': {
                        row: widgetElement.querySelector('[data-metric="temp-gpu"]'),
                        bar: null,
                        value: null
                    },
                    // Fréquences
                    'freq-cpu': {
                        row: widgetElement.querySelector('[data-metric="freq-cpu"]'),
                        bar: null,
                        value: null
                    },
                    'freq-gpu': {
                        row: widgetElement.querySelector('[data-metric="freq-gpu"]'),
                        bar: null,
                        value: null
                    },
                    // Mémoire
                    'memory-ram': {
                        row: widgetElement.querySelector('[data-metric="memory-ram"]'),
                        bar: null,
                        value: null
                    },
                    'memory-swap': {
                        row: widgetElement.querySelector('[data-metric="memory-swap"]'),
                        bar: null,
                        value: null
                    },
                    'memory-disk': {
                        row: widgetElement.querySelector('[data-metric="memory-disk"]'),
                        bar: null,
                        value: null
                    }
                };
                
                // Pour chaque métrique, récupérer la barre et la valeur
                Object.keys(elements).forEach(key => {
                    if (elements[key].row) {
                        elements[key].bar = elements[key].row.querySelector('.progress-bar');
                        elements[key].value = elements[key].row.querySelector('.progress-value');
                    }
                });
                
                // Enregistrer auprès de l'orchestrateur
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('servermonitoring', {
                        update: updateMetric
                    }, [
                        'system.cpu.*',
                        'system.temp.*',
                        'system.memory.*',
                        'system.disk.*'
                    ]);
                }
            });
    }
    
    function updateMetric(topic, data) {
        console.log('Server monitoring update:', topic, data);
        
        // CPU Cores
        if (topic === 'system.cpu.core1') {
            updateProgressBar('cpu-core1', data.raw, data.formatted);
        }
        else if (topic === 'system.cpu.core2') {
            updateProgressBar('cpu-core2', data.raw, data.formatted);
        }
        else if (topic === 'system.cpu.core3') {
            updateProgressBar('cpu-core3', data.raw, data.formatted);
        }
        else if (topic === 'system.cpu.core4') {
            updateProgressBar('cpu-core4', data.raw, data.formatted);
        }
        // CPU Frequency
        else if (topic === 'system.cpu.frequency') {
            // La fréquence est en MHz, max théorique du Pi 5 est 2400 MHz
            const freqPercent = (data.raw / 2400) * 100;
            updateProgressBar('freq-cpu', freqPercent, data.formatted);
        }
        // Températures
        else if (topic === 'system.temp.cpu') {
            updateProgressBar('temp-cpu', (data.raw / 100) * 100, data.formatted); // 100°C max
        }
        else if (topic === 'system.temp.gpu') {
            updateProgressBar('temp-gpu', (data.raw / 100) * 100, data.formatted); // 100°C max
        }
        // Mémoire
        else if (topic === 'system.memory.percent') {
            updateProgressBar('memory-ram', data.raw, data.formatted);
        }
        // Swap (à implémenter côté collecteur)
        else if (topic === 'system.memory.swap.percent') {
            updateProgressBar('memory-swap', data.raw, data.formatted);
        }
        // Disque
        else if (topic === 'system.disk.percent') {
            updateProgressBar('memory-disk', data.raw, data.formatted);
        }
    }
    
    function updateProgressBar(metric, percentage, formattedValue) {
        const element = elements[metric];
        if (!element || !element.row) return;
        
        // Limiter le pourcentage entre 0 et 100
        percentage = Math.max(0, Math.min(100, percentage));
        
        // Mettre à jour la barre de progression
        if (element.bar) {
            element.bar.style.width = percentage + '%';
            
            // Ajouter des classes de couleur selon la valeur
            element.bar.classList.remove('low', 'medium', 'high');
            if (percentage < 50) {
                element.bar.classList.add('low');
            } else if (percentage < 80) {
                element.bar.classList.add('medium');
            } else {
                element.bar.classList.add('high');
            }
        }
        
        // Mettre à jour la valeur affichée
        if (element.value) {
            element.value.textContent = formattedValue;
        }
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('servermonitoring');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();