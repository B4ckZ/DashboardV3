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
                        'system.cpu.*',      // Inclut system.cpu.frequency
                        'system.gpu.*',      // Inclut system.gpu.frequency
                        'system.temp.*',
                        'system.memory.*'
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
            console.log('CPU Frequency update:', data);
            // La fréquence du collecteur est déjà en GHz, pas besoin de diviser
            // Pour le Pi 5, max est 2.4 GHz
            const freqGHz = data.raw; // Déjà en GHz depuis le collecteur
            const freqPercent = (freqGHz / 2.4) * 100;
            updateProgressBar('freq-cpu', freqPercent, data.formatted);
        }
        // GPU Frequency
        else if (topic === 'system.gpu.frequency') {
            console.log('GPU Frequency update:', data);
            // La fréquence GPU est en MHz
            const freqMHz = data.raw;
            // Pour le Pi 5, max GPU est 910 MHz
            const freqPercent = (freqMHz / 910) * 100;
            updateProgressBar('freq-gpu', freqPercent, data.formatted);
        }
        // Températures
        else if (topic === 'system.temp.cpu') {
            updateProgressBar('temp-cpu', (data.raw / 100) * 100, data.formatted); // 100°C max
        }
        else if (topic === 'system.temp.gpu') {
            updateProgressBar('temp-gpu', (data.raw / 100) * 100, data.formatted); // 100°C max
        }
        // Mémoire
        else if (topic === 'system.memory.ram') {
            updateProgressBar('memory-ram', data.raw, data.formatted);
        }
        else if (topic === 'system.memory.swap') {
            updateProgressBar('memory-swap', data.raw, data.formatted);
        }
        else if (topic === 'system.memory.disk') {
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