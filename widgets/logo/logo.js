// widgets/logo/logo.js - Widget Logo V3 avec système de toggle
// ===========================================================

window.logo = (function() {
    let widgetElement;
    let isToggled = false;
    
    /**
     * Bascule entre les widgets esp32stats et test
     */
    function toggleWidgets() {
        const esp32Widget = document.getElementById('esp32stats');
        const testWidget = document.getElementById('test');
        
        if (!esp32Widget || !testWidget) {
            console.warn('[logo] Un des widgets à basculer n\'est pas trouvé');
            return;
        }
        
        if (!isToggled) {
            // Afficher test, cacher esp32stats
            esp32Widget.style.display = 'none';
            testWidget.style.display = 'flex';
            console.log('[logo] Basculé vers widget TEST');
        } else {
            // Afficher esp32stats, cacher test
            testWidget.style.display = 'none';
            esp32Widget.style.display = 'flex';
            console.log('[logo] Basculé vers widget ESP32STATS');
        }
        
        isToggled = !isToggled;
        
        // Ajouter un effet visuel au logo pour indiquer l'état
        if (widgetElement) {
            const logoImg = widgetElement.querySelector('.logo-image');
            if (logoImg) {
                logoImg.style.transition = 'transform 0.3s ease';
                logoImg.style.transform = isToggled ? 'scale(0.95)' : 'scale(1)';
            }
        }
    }
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/logo/logo.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Ajouter le curseur pointer pour indiquer que c'est cliquable
                widgetElement.style.cursor = 'pointer';
                
                // Ajouter l'event listener pour le clic
                widgetElement.addEventListener('click', toggleWidgets);
                
                // S'assurer que test est caché au démarrage
                setTimeout(() => {
                    const testWidget = document.getElementById('test');
                    if (testWidget) {
                        testWidget.style.display = 'none';
                    }
                }, 100);
                
                console.log('[logo] Widget initialisé avec fonction toggle');
            });
    }
    
    function destroy() {
        // Retirer l'event listener
        if (widgetElement) {
            widgetElement.removeEventListener('click', toggleWidgets);
        }
    }
    
    return {
        init: init,
        destroy: destroy,
        toggleWidgets: toggleWidgets // Exposer la fonction pour un usage externe si nécessaire
    };
})();