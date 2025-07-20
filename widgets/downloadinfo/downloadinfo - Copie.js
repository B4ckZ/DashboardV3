window.downloadinfo = (function() {
    let widgetElement;
    let downloadinfoElement;
    
    function init(element) {
        widgetElement = element;
        
        fetch('widgets/downloadinfo/downloadinfo.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                downloadinfoElement = widgetElement.querySelector('[data-metric="downloadinfo"]');
                
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('downloadinfo', {
                        update: updateValue
                    }, ['download.info']);
                }
                
                loadLastDownload();
            });
    }
    
    function updateValue(topic, data) {
        if (topic === 'download.info' && downloadinfoElement) {
            const formatted = formatDownloadInfo(data);
            downloadinfoElement.textContent = formatted;
            downloadinfoElement.classList.add('downloadinfo-value-stable');
            saveLastDownload(data);
        }
    }
    
    function formatDownloadInfo(data) {
        if (data.date && data.week) {
            return `${data.date} | Semaine ${data.week}`;
        }
        return data.date || data.formatted || data;
    }
    
    function saveLastDownload(data) {
        try {
            localStorage.setItem('lastDownload', JSON.stringify(data));
        } catch (e) {
            console.warn('Cannot save to localStorage:', e);
        }
    }
    
    function loadLastDownload() {
        try {
            const saved = localStorage.getItem('lastDownload');
            if (saved && downloadinfoElement) {
                const data = JSON.parse(saved);
                const formatted = formatDownloadInfo(data);
                downloadinfoElement.textContent = formatted;
                downloadinfoElement.classList.add('downloadinfo-value-stable');
                return;
            }
        } catch (e) {
            console.warn('Cannot load from localStorage:', e);
        }
        
        if (downloadinfoElement) {
            downloadinfoElement.textContent = '--/--/---- | Semaine --';
            downloadinfoElement.classList.add('downloadinfo-value-stable');
        }
    }
    
    function destroy() {
        if (window.orchestrator) {
            window.orchestrator.unregisterWidget('downloadinfo');
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
})();