# Installation sur Raspberry Pi

Ce guide explique comment installer OnTheSpot sur votre Raspberry Pi.

## Prérequis

- Un Raspberry Pi 4 (2GB RAM minimum recommandé)
- Raspberry Pi OS installé et configuré
- Accès Internet
- Accès SSH ou terminal direct au Raspberry Pi

## Installation automatique

1. Copiez les fichiers sur votre Raspberry Pi :
   ```bash
   # Sur votre PC Windows, compressez le dossier onthespot en ZIP
   
   # Sur le Raspberry Pi
   mkdir ~/onthespot
   cd ~/onthespot
   # Copiez le fichier ZIP ici et décompressez-le
   ```

2. Rendez le script d'installation exécutable :
   ```bash
   chmod +x install_raspberry.sh
   ```

3. Exécutez le script d'installation :
   ```bash
   sudo ./install_raspberry.sh
   ```

4. Le script va :
   - Mettre à jour le système
   - Installer toutes les dépendances nécessaires
   - Configurer l'environnement Python
   - Créer et démarrer le service systemd
   - Configurer les permissions
   - Afficher l'URL d'accès

## Utilisation

Une fois installé :

1. Accédez à l'interface web depuis n'importe quel appareil sur votre réseau :
   ```
   http://<ip-raspberry>:5000
   ```

2. Le service démarre automatiquement avec votre Raspberry Pi

## Commandes utiles

- Voir les logs en temps réel :
  ```bash
  sudo journalctl -u onthespot -f
  ```

- Redémarrer le service :
  ```bash
  sudo systemctl restart onthespot
  ```

- Arrêter le service :
  ```bash
  sudo systemctl stop onthespot
  ```

- Voir le statut :
  ```bash
  sudo systemctl status onthespot
  ```

## Dossiers importants

- Application : `/opt/onthespot`
- Téléchargements : `/opt/onthespot/downloads`
- Logs : `journalctl -u onthespot`

## Mise à jour

Pour mettre à jour l'application :

```bash
cd /opt/onthespot
sudo -u pi git pull
sudo systemctl restart onthespot
```

## Dépannage

1. Si le service ne démarre pas :
   ```bash
   sudo journalctl -u onthespot -n 50
   ```

2. Vérifier les permissions :
   ```bash
   ls -la /opt/onthespot
   ```

3. Vérifier que FFmpeg est installé :
   ```bash
   ffmpeg -version
   ```

4. Redémarrer le Raspberry Pi :
   ```bash
   sudo reboot
   ```
