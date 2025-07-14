/**
 * Widget Download Button - Version Ultra-Simplifiée PHP
 * Style exact du widget rebootbutton avec backend PHP pur
 * MaxLink Dashboard v3.0 - Solution PHP ultra-simple
 */

window.downloadbutton = (function() {
    'use strict';
    
    let widgetElement;
    let downloadButton;
    let popupElement = null;
    let archivesData = {};
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/downloadbutton/downloadbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer le bouton
                downloadButton = widgetElement.querySelector('#download-button');
                
                // Événement sur le bouton (exactement comme rebootbutton)
                if (downloadButton) {
                    downloadButton.addEventListener('click', showDownloadPopup);
                }
                
                console.log('Download button widget initialized (PHP backend)');
            })
            .catch(error => {
                console.error('Erreur chargement download button widget:', error);
            });
    }
    
    async function showDownloadPopup() {
        console.log('Opening download popup...');
        
        // Effet visuel sur le bouton (exactement comme rebootbutton)
        if (downloadButton) {
            downloadButton.classList.add('clicked');
            setTimeout(() => downloadButton.classList.remove('clicked'), 150);
        }
        
        // Charger la liste des archives
        await loadArchivesList();
        
        // Créer et afficher la popup (style rebootbutton)
        createDownloadPopup();
        showPopup();
    }
    
    async function loadArchivesList() {
        try {
            // Appel direct au script PHP (ultra-simple)
            const response = await fetch('/archives-list.php?' + Date.now());
            
            if (response.ok) {
                archivesData = await response.json();
                console.log('Archives loaded from PHP:', archivesData);
            } else {
                throw new Error('Archives non trouvées (HTTP ' + response.status + ')');
            }
        } catch (error) {
            console.error('Erreur chargement archives:', error);
            // Données de fallback si pas d'archives
            archivesData = {};
            showNotification('Erreur de chargement des archives', 'warning');
        }
    }
    
    function createDownloadPopup() {
        // Supprimer l'ancienne popup si elle existe
        if (popupElement) {
            popupElement.remove();
        }
        
        // Créer la nouvelle popup (EXACTEMENT comme rebootbutton)
        popupElement = document.createElement('div');
        popupElement.className = 'reboot-popup-overlay';  // Utilise les mêmes classes CSS !
        
        popupElement.innerHTML = `
            <div class="reboot-popup">
                <div class="reboot-popup-content">
                    <h3>Téléchargement Archives</h3>
                    <div class="reboot-options">
                        ${createArchivesSelect()}
                        <div class="reboot-buttons">
                            <button class="reboot-btn reboot-btn-cancel" onclick="downloadbutton.hidePopup()">
                                Annuler
                            </button>
                            <button class="reboot-btn reboot-btn-download" onclick="downloadbutton.downloadSelected()">
                                Télécharger
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popupElement);
    }
    
    function createArchivesSelect() {
        const years = Object.keys(archivesData);
        
        if (years.length === 0) {
            return `
                <div class="archive-info">
                    <p>Aucune archive disponible</p>
                </div>
            `;
        }
        
        // Créer un select avec toutes les semaines disponibles
        let options = '<option value="">-- Sélectionner une semaine --</option>';
        
        // Trier par année décroissante (plus récent en premier)
        years.sort((a, b) => b - a).forEach(year => {
            const weeks = archivesData[year];
            
            // Les semaines sont déjà triées par ordre décroissant depuis le PHP
            weeks.forEach(week => {
                const label = `S${week.toString().padStart(2, '0')} ${year}`;
                const value = `${year}-${week}`;
                options += `<option value="${value}">${label}</option>`;
            });
        });
        
        return `
            <div class="archive-info">
                <p>Sélectionnez une semaine à télécharger :</p>
            </div>
            <div class="archive-select-container">
                <select id="archive-select" class="archive-select">
                    ${options}
                </select>
            </div>
        `;
    }
    
    function showPopup() {
        if (popupElement) {
            popupElement.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Animation d'apparition (comme rebootbutton)
            setTimeout(() => {
                popupElement.classList.add('show');
            }, 10);
        }
    }
    
    function hidePopup() {
        if (popupElement) {
            popupElement.classList.remove('show');
            document.body.style.overflow = '';
            
            setTimeout(() => {
                if (popupElement) {
                    popupElement.remove();
                    popupElement = null;
                }
            }, 300);
        }
    }
    
    function downloadSelected() {
        const select = document.getElementById('archive-select');
        
        if (!select || !select.value) {
            showNotification('Veuillez sélectionner une semaine', 'warning');
            return;
        }
        
        const [year, week] = select.value.split('-');
        const weekPadded = week.padStart(2, '0');
        
        // URL de téléchargement directe vers le script PHP
        const downloadUrl = `/download-archive.php?year=${year}&week=${week}`;
        
        showNotification(`Téléchargement S${weekPadded}/${year}...`, 'info');
        
        // Télécharger le fichier
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `MaxLink_S${weekPadded}_${year}_Archives.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Fermer la popup après téléchargement
        setTimeout(() => {
            hidePopup();
            showNotification('Téléchargement terminé !', 'success');
        }, 1000);
    }
    
    function showNotification(message, type = 'info') {
        // Utilise le système de notifications du dashboard (si disponible)
        if (window.notifications && typeof window.notifications.show === 'function') {
            window.notifications.show(message, type);
        } else {
            // Fallback console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // API publique
    return {
        init: init,
        hidePopup: hidePopup,
        downloadSelected: downloadSelected
    };
})();