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
                    },
                    'memory-usb': {
                        row: widgetElement.querySelector('[data-metric="memory-usb"]'),
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
            // Pour le Pi 5, max GPU est ~900 MHz
            const freqPercent = (data.raw / 900) * 100;
            updateProgressBar('freq-gpu', freqPercent, data.formatted);
        }
        // Températures
        else if (topic === 'system.temp.cpu') {
            const tempPercent = (data.raw / 85) * 100; // Max 85°C
            updateProgressBar('temp-cpu', tempPercent, data.formatted);
        }
        else if (topic === 'system.temp.gpu') {
            const tempPercent = (data.raw / 85) * 100; // Max 85°C
            updateProgressBar('temp-gpu', tempPercent, data.formatted);
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
        else if (topic === 'system.memory.usb') {
            // Gestion spéciale pour USB
            if (data.raw === -1) {
                // Clé USB non trouvée
                updateProgressBar('memory-usb', 0, 'N/A', false);
            } else {
                updateProgressBar('memory-usb', data.raw, data.formatted, true);
            }
        }
    }
    
    function updateProgressBar(metric, value, formattedValue, isAvailable = true) {
        if (elements[metric] && elements[metric].bar && elements[metric].value) {
            if (isAvailable) {
                // Limiter la valeur entre 0 et 100
                const clampedValue = Math.max(0, Math.min(100, value));
                
                // Mettre à jour la largeur de la barre
                elements[metric].bar.style.width = clampedValue + '%';
                
                // Appliquer les classes de couleur
                elements[metric].bar.classList.remove('low', 'medium', 'high', 'critical');
                
                if (clampedValue < 50) {
                    elements[metric].bar.classList.add('low');
                } else if (clampedValue < 70) {
                    elements[metric].bar.classList.add('medium');
                } else if (clampedValue < 85) {
                    elements[metric].bar.classList.add('high');
                } else {
                    elements[metric].bar.classList.add('critical');
                }
                
                // Retirer la classe unavailable si elle existe
                elements[metric].bar.classList.remove('unavailable');
            } else {
                // USB non disponible
                elements[metric].bar.style.width = '0%';
                elements[metric].bar.classList.add('unavailable');
            }
            
            // Mettre à jour la valeur textuelle
            elements[metric].value.textContent = formattedValue;
        }
    }
    
    // API publique
    return {
        init: init
    };
})();