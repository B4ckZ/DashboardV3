// Logo Widget
window.logo = (function() {
    let widgetElement;
    
    function toggleWidgets() {
        const esp32Widget = document.getElementById('esp32stats');
        const testWidget = document.getElementById('test');
        
        if (!esp32Widget || !testWidget) return;
        
        esp32Widget.style.transition = 'opacity 0.3s ease-out';
        testWidget.style.transition = 'opacity 0.3s ease-out';
        esp32Widget.style.opacity = '0';
        
        setTimeout(() => {
            esp32Widget.style.display = 'none';
            testWidget.style.display = 'flex';
            testWidget.style.opacity = '0';
            void testWidget.offsetWidth;
            testWidget.style.opacity = '1';
        }, 300);
        
        // Animation logo
        const logoImg = widgetElement.querySelector('.logo-image');
        if (logoImg) {
            logoImg.style.transform = 'scale(0.95)';
            setTimeout(() => logoImg.style.transform = 'scale(1)', 200);
        }
    }
    
    function init(element) {
        widgetElement = element;
        
        fetch('widgets/logo/logo.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                widgetElement.style.cursor = 'pointer';
                widgetElement.addEventListener('click', toggleWidgets);
                
                setTimeout(() => {
                    const testWidget = document.getElementById('test');
                    if (testWidget) {
                        testWidget.style.display = 'none';
                        testWidget.style.opacity = '0';
                    }
                }, 100);
            });
    }
    
    function destroy() {
        if (widgetElement) {
            widgetElement.removeEventListener('click', toggleWidgets);
        }
    }
    
    return { init, destroy };
})();