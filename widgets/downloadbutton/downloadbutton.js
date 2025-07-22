/**
 * Widget Download Button - Téléchargement d'archives CSV
 */

window.downloadbutton = (function() {
    'use strict';
	const widgetId = 'Bouton DL archives CSV';

    let widgetElement;
    let elements = {};
    let isAnimating = false;
    let state = {
        isLoading: false,
        archivesData: null,
        selectedYear: null,
        selectedWeek: null,
        isPopupOpen: false
    };

    const CONFIG = {
        API_ENDPOINTS: {
            LIST: '/archives-list.php',
            DOWNLOAD: '/download-archive.php'
        }
    };

    /**
     * Initialisation du widget
     */
    function init(element) {
		console.log(`✅​️ ${widgetId} initialisé.​`);
        widgetElement = element;
        
        fetch('widgets/downloadbutton/downloadbutton.html')
            .then(response => response.text())
            .then(html => {
                widgetElement.innerHTML = html;
                cacheElements();
                bindEvents();
                
                if (window.orchestrator) {
                    window.orchestrator.registerWidget('downloadbutton', {
                        update: () => {}
                    }, []);
                }
            })
            .catch(error => {
                console.error('[DownloadWidget] Erreur chargement HTML:', error);
                widgetElement.innerHTML = '<div style="padding: 20px; color: var(--nord11);">Erreur chargement widget</div>';
            });
    }

    /**
     * Cache des éléments DOM
     */
    function cacheElements() {
        elements = {
            button: widgetElement.querySelector('#download-button'),
            overlay: widgetElement.querySelector('#download-overlay'),
            modal: widgetElement.querySelector('.download-modal'),
            cancelBtn: widgetElement.querySelector('#download-cancel-btn'),
            confirmBtn: widgetElement.querySelector('#download-confirm-btn'),
            yearSelect: widgetElement.querySelector('#downloadYearSelect'),
            weekSelect: widgetElement.querySelector('#downloadWeekSelect'),
            selectionInfo: widgetElement.querySelector('#downloadSelectionInfo'),
            selectionTitle: widgetElement.querySelector('#downloadSelectionTitle'),
            selectionPeriod: widgetElement.querySelector('#downloadSelectionPeriod'),
            fileCount: widgetElement.querySelector('#downloadFileCount'),
            fileSize: widgetElement.querySelector('#downloadFileSize'),
            progressContainer: widgetElement.querySelector('#downloadProgressContainer'),
            progressFill: widgetElement.querySelector('#downloadProgressFill'),
            progressText: widgetElement.querySelector('#downloadProgressText')
        };
    }

    /**
     * Liaison des événements
     */
    function bindEvents() {
        if (elements.button) {
            elements.button.addEventListener('click', showDownloadModal);
        }
        
        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', hideDownloadModal);
        }
        
        if (elements.confirmBtn) {
            elements.confirmBtn.addEventListener('click', executeDownload);
        }
        
        if (elements.overlay) {
            elements.overlay.addEventListener('click', function(e) {
                if (e.target === elements.overlay) {
                    hideDownloadModal();
                }
            });
        }
        
        if (elements.yearSelect) {
            elements.yearSelect.addEventListener('change', handleYearChange);
        }
        
        if (elements.weekSelect) {
            elements.weekSelect.addEventListener('change', handleWeekChange);
        }
        
        document.addEventListener('keydown', handleGlobalKeyPress);
        loadArchivesData();
    }

    /**
     * Affichage de la modal
     */
    function showDownloadModal() {
		console.log(`⚙️ ​️Ouverture PopUp de téléchargement.​`);
        
        if (elements.overlay && !isAnimating) {
            isAnimating = true;
            document.body.classList.add('modal-open');
            elements.overlay.style.display = 'flex';
            resetModalState();
            elements.overlay.offsetHeight;
            
            setTimeout(() => {
                elements.overlay.classList.add('show');
                isAnimating = false;
                state.isPopupOpen = true;
            }, 10);
        }
    }

    /**
     * Fermeture de la modal
     */
    function hideDownloadModal() {
		console.log(`⚙️ Fermeture PopUp de téléchargement.​`);
        
        if (elements.overlay && elements.modal && !isAnimating) {
            isAnimating = true;
            elements.overlay.classList.remove('show');
            
            setTimeout(() => {
                elements.overlay.style.display = 'none';
                document.body.classList.remove('modal-open');
                isAnimating = false;
                state.isPopupOpen = false;
                hideProgressContainer();
            }, 300);
        }
    }

    /**
     * Reset de l'état de la modal
     */
    function resetModalState() {
        if (elements.yearSelect) elements.yearSelect.value = '';
        if (elements.weekSelect) {
            elements.weekSelect.value = '';
            elements.weekSelect.disabled = true;
        }
        if (elements.confirmBtn) elements.confirmBtn.disabled = true;
        if (elements.selectionInfo) elements.selectionInfo.style.display = 'none';
        hideProgressContainer();
    }

    /**
     * Gestion des touches globales
     */
    function handleGlobalKeyPress(e) {
        if (state.isPopupOpen) {
            if (e.key === 'Escape') {
                e.preventDefault();
                hideDownloadModal();
            }
        }
    }

    /**
     * Changement d'année
     */
    function handleYearChange() {
        const selectedYear = elements.yearSelect.value;
        
        if (selectedYear && state.archivesData && state.archivesData[selectedYear]) {
            elements.weekSelect.disabled = false;
            elements.weekSelect.innerHTML = '<option value="">Choisir une semaine</option>';
            
            const weeksArray = state.archivesData[selectedYear];
            weeksArray.sort((a, b) => b.week - a.week);
            
            weeksArray.forEach(weekData => {
                const option = document.createElement('option');
                option.value = weekData.week;
                option.textContent = `Semaine ${weekData.week}`;
                option.setAttribute('data-week-data', JSON.stringify(weekData));
                elements.weekSelect.appendChild(option);
            });
            
            state.selectedYear = selectedYear;
        } else {
            elements.weekSelect.disabled = true;
            elements.weekSelect.innerHTML = '<option value="">Sélectionner d\'abord une année...</option>';
            state.selectedYear = null;
        }
        
        state.selectedWeek = null;
        elements.confirmBtn.disabled = true;
        elements.selectionInfo.style.display = 'none';
    }

    /**
     * Changement de semaine
     */
    function handleWeekChange() {
        const selectedWeek = elements.weekSelect.value;
        
        if (selectedWeek && state.selectedYear) {
            const selectedOption = elements.weekSelect.querySelector(`option[value="${selectedWeek}"]`);
            const weekData = JSON.parse(selectedOption.getAttribute('data-week-data'));
            
            state.selectedWeek = selectedWeek;
            updateSelectionInfo(weekData);
            elements.selectionInfo.style.display = 'block';
            elements.confirmBtn.disabled = false;
        } else {
            state.selectedWeek = null;
            elements.selectionInfo.style.display = 'none';
            elements.confirmBtn.disabled = true;
        }
    }

    /**
     * Mise à jour des informations de sélection
     */
    function updateSelectionInfo(weekData) {
        const startDate = getWeekStart(state.selectedYear, weekData.week);
        const endDate = getWeekEnd(state.selectedYear, weekData.week);
        
        elements.selectionTitle.textContent = `Semaine ${weekData.week} - Année ${state.selectedYear}`;
        elements.selectionPeriod.textContent = `Période: du ${startDate} au ${endDate}`;
        
        // Mise à jour avec icônes SVG intégrées
        elements.fileCount.innerHTML = `
            <img src="assets/icons/file-text.svg" class="info-icon" alt="Fichiers">
            ${weekData.fileCount} fichiers
        `;
        elements.fileSize.innerHTML = `
            <img src="assets/icons/save.svg" class="info-icon" alt="Taille">
            ${weekData.totalSizeFormatted}
        `;
    }

    /**
     * Formatage de la taille des fichiers
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Exécution du téléchargement
     */
    function executeDownload() {
        if (!state.selectedYear || !state.selectedWeek) {
            console.error('[DownloadWidget] Aucune sélection valide pour le téléchargement');
            return;
        }
        
		console.log(`⚙️ Début du téléchargement - Année: ${state.selectedYear}, Semaine: ${state.selectedWeek}`);
        
        showProgressContainer();
        elements.confirmBtn.disabled = true;
        
        const yearData = state.archivesData[state.selectedYear];
        const weekData = yearData.find(week => week.week == state.selectedWeek);
        
        if (!weekData || !weekData.files || weekData.files.length === 0) {
            alert('Aucun fichier trouvé pour cette semaine');
            elements.confirmBtn.disabled = false;
            hideProgressContainer();
            return;
        }
        
		console.log(`⚙️ ${weekData.files.length} fichiers à télécharger.`);
        
        let downloadedCount = 0;
        const totalFiles = weekData.files.length;
        
        weekData.files.forEach((file, index) => {
            setTimeout(() => {
                downloadSingleFilePost(file.filename, state.selectedYear);
                downloadedCount++;
                
                const progress = (downloadedCount / totalFiles) * 100;
                if (elements.progressFill) {
                    elements.progressFill.style.width = progress + '%';
                }
                if (elements.progressText) {
                    elements.progressText.textContent = Math.round(progress) + '%';
                }
                
                if (downloadedCount === totalFiles) {
                    setTimeout(() => {
						console.log(`✅ ${widgetId} Téléchargement terminé avec succès.`);
                        
                        if (window.orchestrator) {
                            const now = new Date();
                            const downloadInfo = {
                                date: now.toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                }),
                                week: state.selectedWeek
                            };
                            
                            window.orchestrator.distribute('download.info', downloadInfo);
                        }
                        
                        hideDownloadModal();
                    }, 1000);
                }
            }, index * 500);
        });
    }

    /**
     * Téléchargement d'un fichier individuel
     */
    function downloadSingleFilePost(filename, year) {
        const url = `${CONFIG.API_ENDPOINTS.DOWNLOAD}`;
        const formData = new FormData();
        formData.append('file', filename);
        formData.append('year', year);
        
        fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        })
        .catch(error => {
            console.error(`[DownloadWidget] Erreur téléchargement ${filename}:`, error);
        });
    }

    /**
     * Affichage du conteneur de progression
     */
    function showProgressContainer() {
        if (elements.progressContainer) {
            elements.progressContainer.style.display = 'block';
            elements.progressFill.style.width = '0%';
            elements.progressText.textContent = '0%';
        }
    }

    /**
     * Masquage du conteneur de progression
     */
    function hideProgressContainer() {
        if (elements.progressContainer) {
            elements.progressContainer.style.display = 'none';
        }
        if (elements.confirmBtn) {
            elements.confirmBtn.disabled = (state.selectedYear && state.selectedWeek) ? false : true;
        }
    }

    /**
     * Chargement des données d'archives
     */
    function loadArchivesData() {
		console.log(`✅​️ ${widgetId} Chargement des données d\'archives.​`);
        
        fetch(CONFIG.API_ENDPOINTS.LIST)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                state.archivesData = data;
                populateYearSelector();
				console.log(`✅​️ ${widgetId} Données d\'archives chargées avec succès.​`);
            })
            .catch(error => {
                console.error('[DownloadWidget] Erreur lors du chargement des archives:', error);
                state.archivesData = generateFallbackData();
                populateYearSelector();
            });
    }

    /**
     * Remplissage du sélecteur d'année
     */
    function populateYearSelector() {
        if (!elements.yearSelect || !state.archivesData) return;
        
        elements.yearSelect.innerHTML = '<option value="">Choisir une année</option>';
        
        const years = Object.keys(state.archivesData).sort().reverse();
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            elements.yearSelect.appendChild(option);
        });
    }

    /**
     * Génération de données de fallback pour les tests
     */
    function generateFallbackData() {
        const fallbackData = {};
        const currentYear = new Date().getFullYear();
        
        for (let year = currentYear - 1; year <= currentYear; year++) {
            fallbackData[year] = [];
            for (let week = 1; week <= 52; week++) {
                fallbackData[year].push({
                    week: week,
                    files: [],
                    totalSize: Math.floor(Math.random() * 10000000) + 1000000,
                    fileCount: Math.floor(Math.random() * 50) + 10,
                    totalSizeFormatted: formatFileSize(Math.floor(Math.random() * 10000000) + 1000000)
                });
            }
        }
        
        return fallbackData;
    }

    /**
     * Calcul du début d'une semaine selon la norme ISO 8601
     */
    function getWeekStart(year, week) {
        const jan4 = new Date(year, 0, 4);
        const jan4DayOfWeek = (jan4.getDay() + 6) % 7;
        const mondayOfWeek1 = new Date(jan4.getTime() - jan4DayOfWeek * 24 * 60 * 60 * 1000);
        const weekStart = new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
        
        return weekStart.toLocaleDateString('fr-FR');
    }

    /**
     * Calcul de la fin d'une semaine selon la norme ISO 8601
     */
    function getWeekEnd(year, week) {
        const jan4 = new Date(year, 0, 4);
        const jan4DayOfWeek = (jan4.getDay() + 6) % 7;
        const mondayOfWeek1 = new Date(jan4.getTime() - jan4DayOfWeek * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000 + 6 * 24 * 60 * 60 * 1000);
        
        return weekEnd.toLocaleDateString('fr-FR');
    }

    return {
        init: init
    };

})();