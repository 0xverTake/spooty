import os
import sys
import platform
from pathlib import Path
from flask import Flask, render_template, jsonify, request, send_from_directory
import threading
import yt_dlp
import uuid
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
load_dotenv()

def get_ffmpeg_path():
    ffmpeg_path = r'C:\ffmpeg\bin\ffmpeg.exe'
    print(f'Vérification de FFmpeg à: {ffmpeg_path}')
    
    if not os.path.exists(ffmpeg_path):
        print(f'FFmpeg non trouvé à: {ffmpeg_path}')
        # Essayer de trouver FFmpeg dans le PATH
        import shutil
        ffmpeg_in_path = shutil.which('ffmpeg')
        if ffmpeg_in_path:
            print(f'FFmpeg trouvé dans le PATH: {ffmpeg_in_path}')
            return ffmpeg_in_path
        else:
            raise Exception('FFmpeg n\'est pas installé ou n\'est pas dans le PATH')
    
    # Vérifier les permissions
    try:
        with open(ffmpeg_path, 'rb') as f:
            pass
        print(f'FFmpeg est accessible en lecture')
        return ffmpeg_path
    except Exception as e:
        print(f'Erreur d\'accès à FFmpeg: {str(e)}')
        raise Exception(f'FFmpeg existe mais n\'est pas accessible: {str(e)}')

def get_music_directory():
    # Obtenir le chemin de base selon le système
    if platform.system().lower() == 'windows':
        base_dir = os.path.join(os.path.expanduser('~'), 'Downloads', 'Music')
    elif platform.system().lower() == 'darwin':  # macOS
        base_dir = os.path.expanduser('~/Downloads/Music')
    elif os.path.exists('/storage/emulated/0'):  # Android
        base_dir = '/storage/emulated/0/Music'
    else:  # Linux ou autre
        base_dir = os.path.expanduser('~/Downloads/Music')
    
    # Créer le dossier s'il n'existe pas
    os.makedirs(base_dir, exist_ok=True)
    print(f'Dossier de musique: {base_dir}')
    return base_dir

app = Flask(__name__, static_folder='static')
downloads = {}

class Download:
    def __init__(self, config):
        self.url = config.get('url')
        self.service = config.get('service', 'youtube')
        self.format = config.get('format', 'mp3')
        self.quality = config.get('quality', '320')
        self.status = 'Pending'
        self.progress = 0
        self.error = None
        self.title = None
        self.artist = None
        
        # Vérifier la configuration
        if not self.url:
            raise ValueError('URL manquante')
        
        if not self.service:
            raise ValueError('Service manquant')
        
        if self.format not in ['mp3', 'wav', 'aac']:
            raise ValueError('Format audio non supporté')
        
        if not self.quality.isdigit() or int(self.quality) <= 0:
            raise ValueError('Qualité audio invalide')
        
        # Utiliser le dossier de base du projet
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.directory = os.path.join(base_dir, 'downloads')
        # Créer le dossier s'il n'existe pas
        os.makedirs(self.directory, exist_ok=True)
        self.id = str(uuid.uuid4())
        downloads[self.id] = self

    def start(self):
        thread = threading.Thread(target=self._download)
        thread.start()

    def _download(self):
        try:
            print(f'Démarrage du téléchargement: {self.url}')
            self.status = 'Downloading'
            
            # Vérifier si c'est une URL Spotify
            if 'spotify.com' in self.url:
                # Extraire l'ID de la piste
                track_id = self.url.split('/')[-1].split('?')[0]
                
                # Configurer Spotify
                sp = spotipy.Spotify(client_credentials_manager=SpotifyClientCredentials(
                    client_id=os.getenv('SPOTIFY_CLIENT_ID'),
                    client_secret=os.getenv('SPOTIFY_CLIENT_SECRET')
                ))
                
                # Récupérer les informations de la piste
                track = sp.track(track_id)
                search_query = f'{track["name"]} {track["artists"][0]["name"]}'
                self.title = track['name']
                self.artist = track['artists'][0]['name']
                
                # Rechercher sur YouTube
                print(f'Recherche YouTube pour: {search_query}')
                
                # Configuration de yt-dlp
                format_spec = f'bestaudio/best[abr<={self.quality}]'
                print(f'Format: {format_spec}, Qualité: {self.quality}kbps')
                
                # Vérifier si FFmpeg est disponible
                ffmpeg_path = r'C:\ffmpeg\bin\ffmpeg.exe'
                if not os.path.exists(ffmpeg_path):
                    raise Exception('FFmpeg n\'est pas installé. Veuillez installer FFmpeg dans C:\ffmpeg')
                print(f'Utilisation de FFmpeg: {ffmpeg_path}')
                
                # Options de téléchargement
                ydl_opts = {
                    'format': format_spec,
                    'progress_hooks': [self._progress_hook],
                    'outtmpl': os.path.join(self.directory, '%(title)s.%(ext)s'),
                    'quiet': True,
                    'no_warnings': True,
                    'writethumbnail': True,
                    'ffmpeg_location': ffmpeg_path,
                    'postprocessors': [
                        {
                            'key': 'FFmpegExtractAudio',
                            'preferredcodec': self.format,
                            'preferredquality': self.quality,
                        },
                        {
                            'key': 'EmbedThumbnail',
                        },
                        {
                            'key': 'FFmpegMetadata',
                            'add_metadata': True,
                        }
                    ],
                    'nooverwrites': False,
                    'keepvideo': False,
                }
                
                # Rechercher et télécharger depuis YouTube
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    result = ydl.extract_info(f'ytsearch:{search_query}', download=True)
                    self.status = 'Completed'
                    return True
            else:
                # Pour les autres services, télécharger directement
                # Vérifier si FFmpeg est disponible
                ffmpeg_path = r'C:\ffmpeg\bin\ffmpeg.exe'
                if not os.path.exists(ffmpeg_path):
                    raise Exception('FFmpeg n\'est pas installé. Veuillez installer FFmpeg dans C:\ffmpeg')
                print(f'Utilisation de FFmpeg: {ffmpeg_path}')

                ydl_opts = {
                    'format': 'bestaudio/best',
                    'progress_hooks': [self._progress_hook],
                    'outtmpl': os.path.join(self.directory, '%(title)s.%(ext)s'),
                    'quiet': True,
                    'no_warnings': True,
                    'writethumbnail': True,
                    'ffmpeg_location': ffmpeg_path,
                    'postprocessors': [
                        {
                            'key': 'FFmpegExtractAudio',
                            'preferredcodec': self.format,
                            'preferredquality': self.quality,
                        },
                        {
                            'key': 'EmbedThumbnail',
                        },
                        {
                            'key': 'FFmpegMetadata',
                            'add_metadata': True,
                        }
                    ],
                    'nooverwrites': False,
                    'keepvideo': False,
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([self.url])
                    self.status = 'Completed'
                    return True
                    
        except Exception as e:
            self.error = str(e)
            self.status = 'Failed'
            print('==================================================\nERREUR DE TÉLÉCHARGEMENT:')
            print(f'URL: {self.url}')
            print(f'Service: {self.service}')
            print(f'Message d\'erreur: {str(e)}')
            print('==================================================')
            return False

    def _progress_hook(self, d):
        if d['status'] == 'downloading':
            try:
                self.progress = int(d['_percent_str'].replace('%', ''))
            except:
                pass

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_download_url', methods=['POST'])
def get_download_url():
    try:
        data = request.get_json()
        url = data.get('url')
        service = data.get('service')
        
        if not url or not service:
            return jsonify({
                'success': False,
                'error': 'URL et service requis'
            }), 400

        # Créer un objet Download temporaire pour utiliser sa logique
        download = Download({
            'url': url,
            'service': service,
            'format': 'mp3',
            'quality': '320'
        })

        # Lancer le téléchargement
        success = download._download()

        if not success:
            raise Exception(download.error or 'Erreur inconnue')

        return jsonify({
            'success': True,
            'title': download.title,
            'artist': download.artist
        })

    except Exception as e:
        print(f'Erreur lors de la récupération de l\'URL: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/download/spotify', methods=['POST'])
def download_spotify():
    try:
        url = request.json.get('url')
        if not url:
            return jsonify({'success': False, 'error': 'URL manquante'})
        
        # Extraire l'ID de la piste Spotify de l'URL
        track_id = url.split('/')[-1].split('?')[0]
        
        # Configurer le téléchargement
        config = {
            'url': url,
            'service': 'spotify',
            'directory': 'downloads',
            'format': 'mp3',
            'quality': '320'
        }
        
        # Créer et démarrer le téléchargement
        download = Download(config)
        download.start()
        
        return jsonify({
            'success': True,
            'download_id': download.id
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/download/youtube', methods=['POST'])
def download_youtube():
    try:
        url = request.json.get('url')
        if not url:
            return jsonify({'success': False, 'error': 'URL manquante'})

        config = {
            'url': url,
            'service': 'youtube',
            'format': request.json.get('format', 'mp3'),
            'quality': request.json.get('quality', '320')
        }

        download = Download(config)
        download.start()

        return jsonify({
            'success': True,
            'id': download.id
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/download/soundcloud', methods=['POST'])
def download_soundcloud():
    try:
        url = request.json.get('url')
        if not url:
            return jsonify({'success': False, 'error': 'URL manquante'})

        config = {
            'url': url,
            'service': 'soundcloud',
            'format': request.json.get('format', 'mp3'),
            'quality': request.json.get('quality', '320')
        }

        download = Download(config)
        download.start()

        return jsonify({
            'success': True,
            'id': download.id
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/download/deezer', methods=['POST'])
def download_deezer():
    try:
        url = request.json.get('url')
        if not url:
            return jsonify({'success': False, 'error': 'URL manquante'})

        config = {
            'url': url,
            'service': 'deezer',
            'format': request.json.get('format', 'mp3'),
            'quality': request.json.get('quality', '320')
        }

        download = Download(config)
        download.start()

        return jsonify({
            'success': True,
            'id': download.id
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/library')
def get_library():
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        downloads_dir = os.path.join(base_dir, 'downloads')
        print(f'Recherche de fichiers dans: {downloads_dir}')
        files = []
        
        # Vérifier si le dossier downloads existe
        if not os.path.exists(downloads_dir):
            print(f'Le dossier downloads n\'existe pas: {downloads_dir}')
            return jsonify({'success': True, 'files': []})
        
        # Parcourir récursivement le dossier downloads
        print('Début du parcours des fichiers...')
        for root, dirs, filenames in os.walk(downloads_dir):
            print(f'Dossier en cours: {root}')
            print(f'Fichiers trouvés: {filenames}')
            for file in filenames:
                if file.endswith('.mp3'):
                    file_path = os.path.join(root, file)
                    print(f'Fichier MP3 trouvé: {file_path}')
                    title = os.path.splitext(file)[0]
                    artist = 'Artiste inconnu'
                    
                    # Essayer d'extraire l'artiste du nom de fichier
                    if ' - ' in title:
                        artist, title = title.split(' - ', 1)
                        print(f'Artiste extrait: {artist}, Titre: {title}')
                    
                    # Obtenir le chemin relatif pour l'URL
                    rel_path = os.path.relpath(file_path, downloads_dir)
                    rel_path = rel_path.replace('\\', '/')
                    print(f'Chemin relatif: {rel_path}')
                    
                    files.append({
                        'id': file,
                        'name': title,
                        'artist': artist,
                        'path': f'/audio/{rel_path}',
                        'status': 'completed'
                    })
                    print('Fichier ajouté à la liste')
        print(f'Nombre total de fichiers trouvés: {len(files)}')
        
        # Ajouter les téléchargements en cours
        for id, download in downloads.items():
            if download.status != 'Completed':
                files.append({
                    'id': id,
                    'name': download.title or 'En cours...',
                    'artist': download.artist or 'Chargement...',
                    'service': download.service,
                    'status': download.status
                })
                
        return jsonify({'success': True, 'files': files})
    except Exception as e:
        print(f'ERREUR lors de la récupération de la bibliothèque: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Erreur lors de la récupération de la bibliothèque: {str(e)}'
        })

@app.route('/status/<item_id>')
def get_status(item_id):
    try:
        print(f'Vérification du statut pour ID: {item_id}')
        print(f'Téléchargements actifs: {list(downloads.keys())}')
        
        if item_id not in downloads:
            print(f'ERREUR: ID {item_id} non trouvé dans les téléchargements actifs')
            return jsonify({
                'success': False,
                'status': 'Failed',
                'error': 'Téléchargement non trouvé'
            })
        
        download = downloads[item_id]
        print(f'Statut actuel: {download.status}, Progression: {download.progress}%')
        
        response = {
            'success': True,
            'status': download.status,
            'progress': download.progress,
            'title': getattr(download, 'title', ''),
            'error': getattr(download, 'error', '')
        }
        
        # Si le téléchargement est terminé (succès ou échec), on le supprime
        if download.status in ['Completed', 'Failed']:
            del downloads[item_id]
            print(f'Téléchargement {item_id} supprimé de la liste active')
        
        return jsonify(response)
    except Exception as e:
        print(f'ERREUR lors de la vérification du statut: {str(e)}')
        return jsonify({
            'success': False,
            'error': f'Erreur lors de la vérification du statut: {str(e)}'
        })

# Configuration de l'application
app.config.update(
    ENV='production',
    DEBUG=False,
    TESTING=False,
    PREFERRED_URL_SCHEME='http',
    JSON_SORT_KEYS=False,  # Optimisation des performances
    MAX_CONTENT_LENGTH=16 * 1024 * 1024  # Limite de 16MB pour les uploads
)

# Configuration des headers de sécurité
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com fonts.googleapis.com fonts.gstatic.com; img-src 'self' https: data:; media-src 'self' https: data:; style-src 'self' 'unsafe-inline' fonts.googleapis.com cdnjs.cloudflare.com; font-src 'self' fonts.gstatic.com cdnjs.cloudflare.com"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

@app.route('/audio/<path:filename>')
def serve_audio(filename):
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        downloads_dir = os.path.join(base_dir, 'downloads')
        
        # Convertir les séparateurs de chemin
        filename = filename.replace('/', os.path.sep)
        file_path = os.path.join(downloads_dir, filename)
        
        print(f'Tentative de lecture du fichier: {file_path}')
        
        if os.path.exists(file_path):
            # Sécurité : vérifier que le fichier est bien dans le dossier downloads
            if not os.path.commonpath([file_path]).startswith(os.path.commonpath([downloads_dir])):
                print(f'Tentative d\'accès non autorisée: {file_path}')
                return '', 403
            
            # Obtenir le dossier contenant le fichier
            dir_path = os.path.dirname(file_path)
            base_name = os.path.basename(file_path)
            
            return send_from_directory(dir_path, base_name)
        else:
            print(f'Fichier non trouvé: {file_path}')
            return '', 404
    except Exception as e:
        print(f'Erreur lors de la lecture du fichier audio: {str(e)}')
        return '', 404

if __name__ == '__main__':
    try:
        print('Démarrage du serveur en mode production...')
        app.config.update(
            ENV='production',
            DEBUG=False,
            TESTING=False,
            PROPAGATE_EXCEPTIONS=False
        )
        
        from waitress import serve
        print('Serveur accessible sur : http://0.0.0.0:5000')
        serve(app, host='0.0.0.0', port=5000, threads=4, url_scheme='http')
    except Exception as e:
        print(f'ERREUR au démarrage du serveur: {str(e)}')
        import traceback
        traceback.print_exc()
