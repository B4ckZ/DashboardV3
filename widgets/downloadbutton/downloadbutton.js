/**
 * Widget Download Button avec Traçabilité Hebdomadaire
 * Comportement identique au widget rebootbutton : un clic = popup
 * MaxLink Dashboard v3.0
 */

window.downloadbutton = (function() {
    'use strict';
    
    const API_BASE_URL = 'http://192.168.4.1:5001/api';
    
    let widgetElement;
    let downloadButton;
    let popupElement = null;
    let archivesData = null;
    
    function init(element) {
        widgetElement = element;
        
        // Charger le HTML du widget
        fetch('widgets/downloadbutton/downloadbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                
                // Récupérer le bouton
                downloadButton = widgetElement.querySelector('#download-button');
                
                // Événement sur le bouton (comme rebootbutton)
                if (downloadButton) {
                    downloadButton.addEventListener('click', showDownloadPopup);
                }
                
                console.log('Download button widget initialized');
            })
            .catch(error => {
                console.error('Erreur chargement download button widget:', error);
            });
    }
    
    async function showDownloadPopup() {
        console.log('Opening download popup...');
        
        // Effet visuel sur le bouton (comme rebootbutton)
        if (downloadButton) {
            downloadButton.classList.add('clicked');
            setTimeout(() => downloadButton.classList.remove('clicked'), 150);
        }
        
        // Charger les données d'archives
        await loadArchivesData();
        const currentWeek = await loadCurrentWeek();
        
        // Créer et afficher la popup
        createDownloadPopup(archivesData, currentWeek);
        showPopup();
    }
    
    async function loadArchivesData() {
        try {
            showNotification('Chargement des archives...', 'info');
            
            const response = await fetch(`${API_BASE_URL}/archives`);
            const data = await response.json();
            
            if (data.status === 'success') {
                archivesData = data.archives;
                console.log('Archives loaded:', archivesData);
            } else {
                throw new Error(data.message || 'Erreur chargement archives');
            }
        } catch (error) {
            console.error('Erreur chargement archives:', error);
            showNotification('Erreur de chargement des archives', 'error');
            archivesData = {};
        }
    }
    
    async function loadCurrentWeek() {
        try {
            const response = await fetch(`${API_BASE_URL}/current`);
            const data = await response.json();
            
            if (data.status === 'success') {
                return data.current_week;
            } else {
                throw new Error(data.message || 'Erreur chargement semaine courante');
            }
        } catch (error) {
            console.error('Erreur chargement semaine courante:', error);
            return null;
        }
    }
    
    function createDownloadPopup(archives, currentWeek) {
        // Supprimer l'ancienne popup si elle existe
        if (popupElement) {
            popupElement.remove();
        }
        
        // Créer la nouvelle popup
        popupElement = document.createElement('div');
        popupElement.className = 'download-popup-overlay';
        popupElement.innerHTML = `
            <div class="download-popup">
                <div class="popup-header">
                    <h3>Téléchargement Traçabilité</h3>
                    <button class="popup-close" onclick="downloadbutton.hidePopup()">×</button>
                </div>
                <div class="popup-content">
                    ${createCurrentWeekSection(currentWeek)}
                    ${createArchivesSection(archives)}
                </div>
                <div class="popup-footer">
                    <button class="btn-cancel" onclick="downloadbutton.hidePopup()">Annuler</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popupElement);
    }
    
    function createCurrentWeekSection(currentWeek) {
        if (!currentWeek || !currentWeek.files.length) {
            return `
                <div class="download-section current-week">
                    <h4>Semaine Courante</h4>
                    <p class="no-data">Aucun fichier pour la semaine courante</p>
                </div>
            `;
        }
        
        return `
            <div class="download-section current-week">
                <h4>Semaine Courante - ${currentWeek.week_label} ${currentWeek.year}</h4>
                <div class="download-current">
                    <div class="files-preview">
                        ${currentWeek.files.map(file => `
                            <span class="file-badge">${file.machine}</span>
                        `).join('')}
                    </div>
                    <button class="btn-download current" onclick="downloadbutton.downloadCurrent()">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Télécharger Semaine Courante
                    </button>
                </div>
            </div>
        `;
    }
    
    function createArchivesSection(archives) {
        if (!archives || Object.keys(archives).length === 0) {
            return `
                <div class="download-section archives">
                    <h4>Archives</h4>
                    <p class="no-data">Aucune archive disponible</p>
                </div>
            `;
        }
        
        const years = Object.keys(archives).sort((a, b) => b - a);
        
        return `
            <div class="download-section archives">
                <h4>Archives par Année</h4>
                <div class="years-list">
                    ${years.map(year => createYearSection(year, archives[year])).join('')}
                </div>
            </div>
        `;
    }
    
    function createYearSection(year, yearData) {
        const weeks = Object.keys(yearData).sort((a, b) => {
            const weekA = parseInt(a.substring(1));
            const weekB = parseInt(b.substring(1));
            return weekB - weekA;
        });
        
        return `
            <div class="year-group">
                <h5 class="year-header" onclick="downloadbutton.toggleYear('${year}')">${year} 
                    <span class="toggle-arrow">▼</span>
                </h5>
                <div class="weeks-list" id="weeks-${year}">
                    ${weeks.map(weekLabel => createWeekItem(year, weekLabel, yearData[weekLabel])).join('')}
                </div>
            </div>
        `;
    }
    
    function createWeekItem(year, weekLabel, weekData) {
        const weekNumber = weekData.week_number;
        const filesCount = weekData.files.length;
        
        return `
            <div class="week-item">
                <div class="week-info">
                    <span class="week-label">${weekLabel}</span>
                    <span class="files-count">${filesCount} fichier(s)</span>
                </div>
                <button class="btn-download archive" onclick="downloadbutton.downloadWeek(${year}, ${weekNumber})">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Télécharger
                </button>
            </div>
        `;
    }
    
    function showPopup() {
        if (popupElement) {
            popupElement.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Animation d'apparition
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
    
    function toggleYear(year) {
        const weeksList = document.getElementById(`weeks-${year}`);
        const arrow = document.querySelector(`[onclick="downloadbutton.toggleYear('${year}')"] .toggle-arrow`);
        
        if (weeksList && arrow) {
            if (weeksList.style.display === 'none') {
                weeksList.style.display = 'block';
                arrow.textContent = '▼';
            } else {
                weeksList.style.display = 'none';
                arrow.textContent = '▶';
            }
        }
    }
    
    async function downloadCurrent() {
        try {
            showNotification('Téléchargement en cours...', 'info');
            
            const response = await fetch(`${API_BASE_URL}/download/current`);
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            
            await downloadFile(response, 'tracabilite_courante.zip');
            showNotification('Téléchargement terminé !', 'success');
            hidePopup();
            
        } catch (error) {
            console.error('Erreur téléchargement semaine courante:', error);
            showNotification('Erreur lors du téléchargement', 'error');
        }
    }
    
    async function downloadWeek(year, week) {
        try {
            showNotification(`Téléchargement S${week.toString().padStart(2, '0')}/${year}...`, 'info');
            
            const response = await fetch(`${API_BASE_URL}/download/${year}/${week}`);
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            
            await downloadFile(response, `tracabilite_S${week.toString().padStart(2, '0')}_${year}.zip`);
            showNotification('Téléchargement terminé !', 'success');
            hidePopup();
            
        } catch (error) {
            console.error('Erreur téléchargement archive:', error);
            showNotification('Erreur lors du téléchargement', 'error');
        }
    }
    
    async function downloadFile(response, defaultFilename) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Extraire le nom de fichier des headers si disponible
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
            ? contentDisposition.split('filename=')[1].replace(/"/g, '')
            : defaultFilename;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    function showNotification(message, type = 'info') {
        // Supprimer les notifications existantes
        const existingNotifications = document.querySelectorAll('.download-notification');
        existingNotifications.forEach(notif => notif.remove());
        
        const notification = document.createElement('div');
        notification.className = `download-notification download-notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animation d'apparition
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Suppression automatique
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    function destroy() {
        if (popupElement) {
            popupElement.remove();
            popupElement = null;
        }
        document.body.style.overflow = '';
    }
    
    // Interface publique
    return {
        init: init,
        destroy: destroy,
        hidePopup: hidePopup,
        toggleYear: toggleYear,
        downloadCurrent: downloadCurrent,
        downloadWeek: downloadWeek
    };
})();