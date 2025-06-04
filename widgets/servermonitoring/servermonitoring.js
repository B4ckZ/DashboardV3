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
                    cpu: {
                        core1: widgetElement.querySelector('[data-metric="cpu-core1"]'),
                        core2: widgetElement.querySelector('[data-metric="cpu-core2"]'),
                        core3: widgetElement.querySelector('[data-metric="cpu-core3"]'),
                        core4: widgetElement.querySelector('[data-metric="cpu-core4"]'),
                        freq: widgetElement.querySelector('[data-metric="cpu-freq"]')
                    },
                    temp: {
                        cpu: widgetElement.querySelector('[data-metric="temp-cpu"]'),
                        gpu: widgetElement.querySelector('[data-metric="temp-gpu"]')
                    },
                    memory: {
                        used: widgetElement.querySelector('[data-metric="mem-used"]'),
                        total: widgetElement.querySelector('[data-metric="mem-total"]'),
                        percent: widgetElement.querySelector('[data-metric="mem-percent"]'),
                        bar: widgetElement.querySelector('.memory-bar-fill')
                    },
                    disk: {
                        used: widgetElement.querySelector('[data-metric="disk-used"]'),
                        total: widgetElement.querySelector('[data-metric="disk-total"]'),
                        percent: widgetElement.querySelector('[data-metric="disk-percent"]'),
                        bar: widgetElement.querySelector('.disk-bar-fill')
                    }
                };
                
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
        // CPU Cores
        if (topic === 'system.cpu.core1' && elements.cpu.core1) {
            elements.cpu.core1.textContent = data.formatted;
            updateCpuColor(elements.cpu.core1, data.raw);
        }
        else if (topic === 'system.cpu.core2' && elements.cpu.core2) {
            elements.cpu.core2.textContent = data.formatted;
            updateCpuColor(elements.cpu.core2, data.raw);
        }
        else if (topic === 'system.cpu.core3' && elements.cpu.core3) {
            elements.cpu.core3.textContent = data.formatted;
            updateCpuColor(elements.cpu.core3, data.raw);
        }
        else if (topic === 'system.cpu.core4' && elements.cpu.core4) {
            elements.cpu.core4.textContent = data.formatted;
            updateCpuColor(elements.cpu.core4, data.raw);
        }
        else if (topic === 'system.cpu.frequency' && elements.cpu.freq) {
            elements.cpu.freq.textContent = data.formatted;
        }
        
        // Températures
        else if (topic === 'system.temp.cpu' && elements.temp.cpu) {
            elements.temp.cpu.textContent = data.formatted;
            updateTempColor(elements.temp.cpu, data.raw);
        }
        else if (topic === 'system.temp.gpu' && elements.temp.gpu) {
            elements.temp.gpu.textContent = data.formatted;
            updateTempColor(elements.temp.gpu, data.raw);
        }
        
        // Mémoire
        else if (topic === 'system.memory.used' && elements.memory.used) {
            elements.memory.used.textContent = data.formatted;
        }
        else if (topic === 'system.memory.total' && elements.memory.total) {
            elements.memory.total.textContent = data.formatted;
        }
        else if (topic === 'system.memory.percent' && elements.memory.percent) {
            elements.memory.percent.textContent = data.formatted;
            if (elements.memory.bar) {
                elements.memory.bar.style.width = data.raw + '%';
                updateBarColor(elements.memory.bar, data.raw);
            }
        }
        
        // Disque
        else if (topic === 'system.disk.used' && elements.disk.used) {
            elements.disk.used.textContent = data.formatted;
        }
        else if (topic === 'system.disk.total' && elements.disk.total) {
            elements.disk.total.textContent = data.formatted;
        }
        else if (topic === 'system.disk.percent' && elements.disk.percent) {
            elements.disk.percent.textContent = data.formatted;
            if (elements.disk.bar) {
                elements.disk.bar.style.width = data.raw + '%';
                updateBarColor(elements.disk.bar, data.raw);
            }
        }
    }
    
    function updateCpuColor(element, value) {
        element.classList.remove('low', 'medium', 'high');
        if (value < 50) element.classList.add('low');
        else if (value < 80) element.classList.add('medium');
        else element.classList.add('high');
    }
    
    function updateTempColor(element, value) {
        element.classList.remove('low', 'medium', 'high');
        if (value < 60) element.classList.add('low');
        else if (value < 75) element.classList.add('medium');
        else element.classList.add('high');
    }
    
    function updateBarColor(element, value) {
        element.classList.remove('low', 'medium', 'high');
        if (value < 60) element.classList.add('low');
        else if (value < 80) element.classList.add('medium');
        else element.classList.add('high');
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