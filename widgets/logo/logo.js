// widgets/logo/logo.js - Widget Logo V3 avec système de toggle
// ===========================================================

window.logo = (function() {
    let widgetElement;
    
    /**
     * Bascule l'affichage entre esp32stats et test
     */
    function toggleWidgets() {
        const esp32Widget = document.getElementById('esp32stats');
        const testWidget = document.getElementById('test');
        
        if (!esp32Widget || !testWidget) {
            console.warn('[logo] Un des widgets à basculer n\'est pas trouvé');
            return;
        }
        
        // Animation de fadeOut/fadeIn
        esp32Widget.style.transition = 'opacity 0.3s ease-out';
        testWidget.style.transition = 'opacity 0.3s ease-out';
        
        // Cacher esp32stats avec animation
        esp32Widget.style.opacity = '0';
        
        setTimeout(() => {
            esp32Widget.style.display = 'none';
            testWidget.style.display = 'flex';
            testWidget.style.opacity = '0';
            
            // Forcer le reflow pour l'animation
            void testWidget.offsetWidth;
            
            // Afficher test avec animation
            testWidget.style.opacity = '1';
        }, 300);
        
        console.log('[logo] Basculé vers widget TEST');
        
        // Effet visuel sur le logo lors du clic
        if (widgetElement) {
            const logoImg = widgetElement.querySelector('.logo-image');
            if (logoImg) {
                logoImg.style.transition = 'transform 0.2s ease';
                logoImg.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    logoImg.style.transform = 'scale(1)';
                }, 200);
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
                        testWidget.style.opacity = '0';
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
        destroy: destroy
    };
})();