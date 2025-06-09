document.addEventListener('DOMContentLoaded', function() {
    // Initialisation du lecteur audio
    const player = document.querySelector('.player');
    const audioPlayer = document.getElementById('audio-player');
    const playBtn = document.querySelector('.play-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progressContainer = document.querySelector('.player-progress');
    const playerTime = document.querySelector('.player-time');
    const playerTitle = document.querySelector('.player-title');
    const playerArtist = document.querySelector('.player-artist');
    const libraryBtn = document.querySelector('.library-btn');
    const libraryPanel = document.querySelector('.library-panel');
    const libraryClose = document.querySelector('.library-close');
    const libraryContent = document.querySelector('.library-content');

    let playlist = [];
    let currentTrackIndex = 0;
    let isPlaying = false;

    // Mettre à jour la progression du lecteur
    function updateProgress() {
        if (!audioPlayer) return;

        const currentTime = audioPlayer.currentTime;
        const duration = audioPlayer.duration;
        
        if (duration && !isNaN(duration) && !isNaN(currentTime)) {
            const progress = (currentTime / duration) * 100;
            if (isFinite(progress)) {
                progressBar.style.width = `${progress}%`;
                
                // Mettre à jour le temps
                const minutes = Math.floor(currentTime / 60);
                const seconds = Math.floor(currentTime % 60);
                playerTime.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            }
        }
    }
    const modal = document.getElementById('download-modal');
    const closeModal = document.querySelector('.close-modal');
    const downloadUrl = document.getElementById('download-url');
    const downloadDir = document.getElementById('download-dir');
    const format = document.getElementById('format');
    const quality = document.getElementById('quality');
    const startDownload = document.getElementById('start-download');
    const spotifyBtn = document.getElementById('spotify-btn');
    const youtubeBtn = document.getElementById('youtube-btn');
    const soundcloudBtn = document.getElementById('soundcloud-btn');
    const spotifyStatus = document.getElementById('spotify-status');
    const youtubeStatus = document.getElementById('youtube-status');
    const soundcloudStatus = document.getElementById('soundcloud-status');
    const libraryDiv = document.getElementById('library');

    let currentService = null;

    function openModal(service) {
        currentService = service;
        modal.classList.add('show');
        downloadUrl.value = '';
        const serviceName = service === 'spotify' ? 'Spotify' : service === 'youtube' ? 'YouTube' : service === 'soundcloud' ? 'SoundCloud' : 'Deezer';
        document.getElementById('modal-title').textContent = `Téléchargement depuis ${serviceName}`;
        downloadUrl.placeholder = `Collez l'URL ${serviceName} ici`;
    }

    spotifyBtn.addEventListener('click', () => openModal('spotify'));
    youtubeBtn.addEventListener('click', () => openModal('youtube'));
    soundcloudBtn.addEventListener('click', () => openModal('soundcloud'));

    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    startDownload.addEventListener('click', () => {
        const url = downloadUrl.value;
        const dir = downloadDir.value;
        const fmt = format.value;
        const qual = quality.value;

        if (!url) {
            showNotification('Veuillez entrer une URL', 'error');
            return;
        }

        const config = {
            url: url,
            directory: dir,
            format: fmt,
            quality: qual
        };

        if (currentService === 'spotify') {
            downloadSpotify(config);
        } else if (currentService === 'soundcloud') {
            downloadSoundcloud(config);
        } else if (currentService === 'deezer') {
            downloadDeezer(config);
        } else {
            downloadYoutube(config);
        }

        modal.classList.remove('show');
    });

    async function downloadSpotify(config) {
        const startButton = document.getElementById('start-download');
        try {
            // Vérification de la configuration
            if (!config || !config.url || !config.url.trim()) {
                throw new Error('URL Spotify manquante');
            }

            // Vérification du format de l'URL
            if (!config.url.includes('spotify.com')) {
                throw new Error('URL Spotify invalide');
            }

            // Désactiver le bouton pendant le téléchargement
            if (startButton) startButton.disabled = true;

            // Obtenir l'URL directe
            const response = await fetch('/get_download_url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: config.url,
                    service: 'spotify'
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Erreur lors du téléchargement');
            }

            // Créer un lien temporaire pour le téléchargement
            const a = document.createElement('a');
            a.href = data.download_url;
            a.download = `${data.title} - ${data.artist}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            showNotification('Téléchargement démarré', 'success');

        } catch (error) {
            console.error('Erreur:', error);
            showNotification(error.message || 'Erreur lors du téléchargement', 'error');
        } finally {
            if (startButton) startButton.disabled = false;
        }
    }

    async function downloadYoutube(config) {
        try {
            // Vérification de la configuration
            if (!config) {
                throw new Error('Configuration manquante');
            }

            // Vérification de l'URL
            if (!config.url || !config.url.trim()) {
                throw new Error('URL YouTube manquante');
            }

            // Vérification du format de l'URL
            if (!config.url.includes('youtube.com') && !config.url.includes('youtu.be')) {
                throw new Error('URL YouTube invalide');
            }

            console.log('Configuration YouTube:', config); // Debug

            // Désactiver le bouton pendant le téléchargement
            const startButton = document.getElementById('start-download');
            if (startButton) startButton.disabled = true;

            // Faire la requête
            const response = await fetch('/download/youtube', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });

            // Vérifier la réponse HTTP
            if (!response.ok) {
                throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
            }

            // Parser la réponse JSON
            const data = await response.json();
            console.log('Réponse serveur YouTube:', data); // Debug

            // Vérifier les données
            if (!data) {
                throw new Error('Réponse vide du serveur');
            }

            // Vérifier le succès et l'ID
            if (!data.success) {
                throw new Error(data.error || 'Le serveur a signalé une erreur');
            }

            const downloadId = data.download_id || data.id;
            if (!downloadId) {
                throw new Error('ID de téléchargement manquant dans la réponse');
            }

            // Tout est bon, démarrer le suivi
            showNotification('Téléchargement YouTube démarré', 'success');
            trackDownload(downloadId);

        } catch (error) {
            // Log détaillé de l'erreur
            console.error('Erreur détaillée YouTube:', {
                message: error.message,
                stack: error.stack,
                config: config
            });

            // Notification utilisateur
            showNotification(error.message || 'Erreur lors du téléchargement', 'error');

            // Réactiver le bouton
            const startButton = document.getElementById('start-download');
            if (startButton) startButton.disabled = false;
        }
    }

    function trackDownload(id) {
        if (!id) {
            showNotification('ID de téléchargement manquant', 'error');
            return;
        }

        // S'assurer que les éléments de progression existent
        let progressDiv = document.querySelector('.download-progress');
        let progressStatus = document.querySelector('.progress-status');
        let progressPercentage = document.querySelector('.progress-percentage');
        let progressBarFill = document.querySelector('.progress-bar-fill');
        const startButton = document.getElementById('start-download');

        // Créer les éléments s'ils n'existent pas
        if (!progressDiv) {
            progressDiv = document.createElement('div');
            progressDiv.className = 'download-progress';
            progressDiv.style.margin = '20px 0';
            document.querySelector('.modal-content').appendChild(progressDiv);
        }

        if (!progressStatus) {
            progressStatus = document.createElement('div');
            progressStatus.className = 'progress-status';
            progressDiv.appendChild(progressStatus);
        }

        if (!progressPercentage) {
            progressPercentage = document.createElement('div');
            progressPercentage.className = 'progress-percentage';
            progressDiv.appendChild(progressPercentage);
        }

        if (!progressBarFill) {
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.width = '100%';
            progressBar.style.height = '20px';
            progressBar.style.backgroundColor = '#eee';
            progressBar.style.borderRadius = '10px';
            progressBar.style.overflow = 'hidden';
            
            progressBarFill = document.createElement('div');
            progressBarFill.className = 'progress-bar-fill';
            progressBarFill.style.width = '0%';
            progressBarFill.style.height = '100%';
            progressBarFill.style.backgroundColor = '#4CAF50';
            progressBarFill.style.transition = 'width 0.3s';
            
            progressBar.appendChild(progressBarFill);
            progressDiv.appendChild(progressBar);
        }

        if (!startButton) {
            console.error('Bouton de démarrage manquant');
            showNotification('Erreur lors de l\'initialisation du suivi', 'error');
            return;
        }

        // Réinitialiser l'état initial
        progressStatus.textContent = 'Démarrage...';
        progressPercentage.textContent = '0%';
        progressBarFill.style.width = '0%';
        progressDiv.style.display = 'block';
        startButton.disabled = true;

        let retryCount = 0;
        const maxRetries = 3;

        const checkStatus = () => {
            console.log(`Vérification du statut pour l'ID: ${id}`);
            fetch(`/status/${id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Réponse du statut:', data);
                if (!data) {
                    throw new Error('Données de statut invalides');
                }

                // Réinitialiser le compteur de tentatives en cas de succès
                retryCount = 0;

                if (data.success) {
                    // Mettre à jour la progression
                    const progress = parseInt(data.progress) || 0;
                    const status = data.status || 'En cours...';
                    const title = data.title || '';
                    
                    console.log(`Progression: ${progress}%, Statut: ${status}, Titre: ${title}`);
                    
                    progressStatus.textContent = status;
                    progressPercentage.textContent = `${progress}%`;
                    progressBarFill.style.width = `${progress}%`;

                    if (status === 'Completed') {
                        const message = title ? `Téléchargement terminé: ${title}` : 'Téléchargement terminé !';
                        showNotification(message, 'success');
                        console.log('Téléchargement terminé avec succès');
                        
                        setTimeout(() => {
                            modal.classList.remove('show');
                            progressDiv.style.display = 'none';
                            startButton.disabled = false;
                            updateLibrary(); // Mettre à jour la bibliothèque
                        }, 1500);
                    } else if (status === 'Failed') {
                        const errorMsg = data.error || 'Téléchargement échoué';
                        console.error('Téléchargement échoué:', errorMsg);
                        throw new Error(errorMsg);
                    } else {
                        // Continuer la vérification
                        setTimeout(checkStatus, 1000);
                    }
                } else {
                    const errorMsg = data.error || 'Erreur lors du suivi';
                    console.error('Erreur de suivi:', errorMsg);
                    throw new Error(errorMsg);
                }
            })
            .catch(error => {
                console.error('Erreur lors du suivi:', error);

                // Gérer les tentatives de reconnexion
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Tentative ${retryCount}/${maxRetries}...`);
                    setTimeout(checkStatus, 2000 * retryCount); // Délai croissant entre les tentatives
                } else {
                    showNotification('Erreur lors du suivi du téléchargement', 'error');
                    progressDiv.style.display = 'none';
                    startButton.disabled = false;
                }
            });
        };

        // Démarrer le suivi
        checkStatus();
    }

    function updateLibrary() {
        fetch('/library')
        .then(response => response.json())
        .then(data => {
            const libraryContent = document.getElementById('library');
            if (!libraryContent) return;

            libraryContent.innerHTML = ''; // Vider le contenu actuel

            // Vérifier si nous avons des fichiers
            const files = data.files || [];

            if (files.length === 0) {
                libraryContent.innerHTML = '<p class="empty-message">Aucun fichier dans la bibliothèque</p>';
                return;
            }

            // Mettre à jour la playlist avec les fichiers terminés
            playlist = files
                .filter(file => file.status === 'completed')
                .map(file => ({
                    id: file.id,
                    title: file.name || 'Sans titre',
                    artist: file.artist || 'Artiste inconnu',
                    path: `/audio/${file.id}`
                }));

            // Créer les éléments de la bibliothèque
            files.forEach(file => {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'library-item';
                if (playlist[currentTrackIndex] && playlist[currentTrackIndex].id === file.id) {
                    fileDiv.classList.add('playing');
                }

                fileDiv.innerHTML = `
                    <p class="title">${file.name || 'Sans titre'}</p>
                    <p class="artist">${file.artist || 'Artiste inconnu'}</p>
                `;
                
                // Ajouter le gestionnaire d'événements pour la lecture si le fichier est terminé
                if (file.status === 'completed') {
                    fileDiv.addEventListener('click', () => {
                        const playlistIndex = playlist.findIndex(p => p.id === file.id);
                        if (playlistIndex !== -1) {
                            // Retirer la classe 'playing' de l'élément précédent
                            const previousPlaying = libraryContent.querySelector('.playing');
                            if (previousPlaying) {
                                previousPlaying.classList.remove('playing');
                            }
                            
                            // Ajouter la classe 'playing' au nouvel élément
                            fileDiv.classList.add('playing');
                            
                            currentTrackIndex = playlistIndex;
                            playTrack(playlist[playlistIndex]);
                        }
                    });
                }
                
                libraryContent.appendChild(fileDiv);
            });
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour de la bibliothèque:', error);
            showNotification('Erreur lors de la mise à jour de la bibliothèque', 'error');
        });
    }

    async function playTrack(track) {
        try {
            if (!track || !track.path) {
                throw new Error('Piste invalide');
            }

            // Mettre à jour les informations de la piste
            playerTitle.textContent = track.title || 'Sans titre';
            playerArtist.textContent = track.artist || 'Artiste inconnu';
            
            // Arrêter la lecture en cours si nécessaire
            if (audioPlayer.src) {
                audioPlayer.pause();
                try {
                    audioPlayer.currentTime = 0;
                } catch (e) {
                    console.warn('Impossible de réinitialiser currentTime:', e);
                }
            }
            
            // Vérifier si le fichier existe avant de le charger
            const response = await fetch(track.path, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`Fichier non trouvé (${response.status})`);
            }
            
            // Charger la nouvelle piste
            audioPlayer.src = track.path;
            
            // Attendre que l'audio soit chargé
            await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('Délai de chargement dépassé'));
                }, 10000); // 10 secondes de timeout

                audioPlayer.oncanplay = () => {
                    clearTimeout(timeoutId);
                    resolve();
                };
                
                audioPlayer.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(new Error('Erreur de chargement de l\'audio'));
                };
            });
            
            // Démarrer la lecture
            await audioPlayer.play();
            
            // Mettre à jour l'interface
            playBtn.querySelector('i').classList.remove('fa-play');
            playBtn.querySelector('i').classList.add('fa-pause');
            isPlaying = true;
        } catch (error) {
            console.error('Erreur lors de la lecture:', error);
            showNotification(`Erreur lors de la lecture: ${error.message}`, 'error');
            // Réinitialiser l'interface
            playBtn.querySelector('i').classList.remove('fa-pause');
            playBtn.querySelector('i').classList.add('fa-play');
            isPlaying = false;
        }
    }

    async function togglePlay() {
        try {
            if (!audioPlayer.src) {
                return; // Ne rien faire s'il n'y a pas de source audio
            }

            if (isPlaying) {
                await audioPlayer.pause();
                playBtn.querySelector('i').classList.remove('fa-pause');
                playBtn.querySelector('i').classList.add('fa-play');
                isPlaying = false;
            } else {
                // Vérifier si l'audio est chargé
                if (audioPlayer.readyState < 2) { // HAVE_CURRENT_DATA
                    await new Promise((resolve, reject) => {
                        audioPlayer.oncanplay = resolve;
                        audioPlayer.onerror = reject;
                    });
                }

                await audioPlayer.play();
                playBtn.querySelector('i').classList.remove('fa-play');
                playBtn.querySelector('i').classList.add('fa-pause');
                isPlaying = true;
            }
        } catch (error) {
            console.error('Erreur lors de la lecture/pause:', error);
            showNotification('Erreur lors de la lecture/pause', 'error');
            // Réinitialiser l'interface en cas d'erreur
            playBtn.querySelector('i').classList.remove('fa-pause');
            playBtn.querySelector('i').classList.add('fa-play');
            isPlaying = false;
        }
    }

    playBtn.addEventListener('click', togglePlay);

    prevBtn.addEventListener('click', () => {
        if (playlist.length > 0) {
            currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
            playTrack(playlist[currentTrackIndex]);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (playlist.length > 0) {
            currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
            playTrack(playlist[currentTrackIndex]);
        }
    });

// Boutons de contrôle de la bibliothèque
const playAllBtn = document.getElementById('play-all');
if (playAllBtn) {
    playAllBtn.addEventListener('click', () => {
        if (playlist.length > 0) {
            currentTrackIndex = 0;
            playTrack(playlist[currentTrackIndex]);
        }
    });
}

    // Gestionnaire d'événements pour la barre de progression
    progressContainer.addEventListener('click', (e) => {
        if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
            const clickPosition = e.offsetX / progressContainer.offsetWidth;
            const newTime = clickPosition * audioPlayer.duration;
            if (isFinite(newTime)) {
                audioPlayer.currentTime = newTime;
            }
        }
    });

    // Mettre à jour la progression pendant la lecture
    audioPlayer.addEventListener('timeupdate', updateProgress);

    // Gestionnaire d'événements pour la fin de la piste
    audioPlayer.addEventListener('ended', () => {
        if (currentTrackIndex < playlist.length - 1) {
            currentTrackIndex++;
            playTrack(playlist[currentTrackIndex]);
        } else {
            currentTrackIndex = 0;
            playBtn.querySelector('i').classList.remove('fa-pause');
            playBtn.querySelector('i').classList.add('fa-play');
            isPlaying = false;
        }
    });
    // Gestionnaires d'événements pour la bibliothèque
    libraryBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Empêcher la propagation pour éviter la fermeture immédiate
        if (!libraryPanel.classList.contains('open')) {
            libraryPanel.classList.add('open');
            // Mettre à jour la bibliothèque quand on l'ouvre
            updateLibrary();
        }
    });

    libraryClose.addEventListener('click', (e) => {
        e.stopPropagation(); // Empêcher la propagation
        libraryPanel.classList.remove('open');
    });

    // Fermer la bibliothèque en cliquant en dehors
    document.addEventListener('click', (e) => {
        if (libraryPanel.classList.contains('open') &&
            !libraryPanel.contains(e.target) &&
            !libraryBtn.contains(e.target)) {
            libraryPanel.classList.remove('open');
        }
    });

    // Fonction pour mélanger la playlist
    function shufflePlaylist() {
        for (let i = playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
        }
        currentTrackIndex = 0;
        playTrack(playlist[currentTrackIndex]);
    }

    // Gestionnaire d'événements pour Deezer
    const deezerBtn = document.getElementById('deezer-btn');
    if (deezerBtn) {
        deezerBtn.addEventListener('click', () => openModal('deezer'));
    }



    // Gestionnaire d'événements pour le bouton shuffle
    const shuffleBtn = document.getElementById('shuffle');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            if (playlist.length > 0) {
                shufflePlaylist();
            }
        });
    }

    function updateLibraryView(files) {
        const libraryContent = document.querySelector('#library-content');
        if (files.length === 0) {
            libraryContent.innerHTML = '<p>Aucun fichier dans la bibliothèque</p>';
            return;
        }

        libraryContent.innerHTML = files.map(file => {
            const downloadButton = file.status === 'Completed' ? 
                `<a href="/download/${file.service}/${file.id}" download class="btn-small">
                    <i class="fas fa-download"></i>
                </a>` : '';

            return `
            <div class="library-item ${file.status === 'Failed' ? 'failed' : ''}">
                <div>
                    <strong>${file.name}</strong>
                    <span>${file.artist}</span>
                    ${file.status !== 'Completed' ? `<span class="status">${file.status}</span>` : ''}
                </div>
                <div class="library-item-actions">
                    ${file.status === 'Completed' ? `
                        <button onclick="playFile('${file.id}')" class="btn-small">
                            <i class="fas fa-play"></i>
                        </button>
                    ` : ''}
                    ${downloadButton}
                    <button onclick="deleteFile('${file.id}')" class="btn-small">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    // Fonction pour afficher les notifications
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
});
