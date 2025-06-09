#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installation de OnTheSpot sur Raspberry Pi ===${NC}"

# Vérifier si on est sur un Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    echo -e "${RED}Ce script doit être exécuté sur un Raspberry Pi${NC}"
    exit 1
fi

# Vérifier les privilèges root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Ce script doit être exécuté en tant que root (sudo)${NC}"
    exit 1
fi

# Définir le dossier d'installation
INSTALL_DIR="/opt/onthespot"
SERVICE_NAME="onthespot"
USER="pi"

echo -e "${BLUE}1. Mise à jour du système...${NC}"
apt update && apt upgrade -y

echo -e "${BLUE}2. Installation des dépendances système...${NC}"
apt install -y python3-pip python3-venv ffmpeg git

echo -e "${BLUE}3. Création du dossier d'installation...${NC}"
mkdir -p $INSTALL_DIR
chown $USER:$USER $INSTALL_DIR

echo -e "${BLUE}4. Clonage du projet...${NC}"
cd $INSTALL_DIR
sudo -u $USER git clone https://github.com/0xverTake/spooty.git

echo -e "${BLUE}5. Création de l'environnement virtuel...${NC}"
sudo -u $USER python3 -m venv venv
source venv/bin/activate

echo -e "${BLUE}6. Installation des dépendances Python...${NC}"
sudo -u $USER venv/bin/pip install -r requirements.txt

# Création du service systemd
echo -e "${BLUE}7. Création du service systemd...${NC}"
cat > /etc/systemd/system/$SERVICE_NAME.service << EOL
[Unit]
Description=OnTheSpot Music Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment=PATH=$INSTALL_DIR/venv/bin:$PATH
ExecStart=$INSTALL_DIR/venv/bin/python src/web_app.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOL

# Configuration des permissions
echo -e "${BLUE}8. Configuration des permissions...${NC}"
chown -R $USER:$USER $INSTALL_DIR
chmod 755 $INSTALL_DIR

# Activation et démarrage du service
echo -e "${BLUE}9. Activation du service...${NC}"
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

# Création du dossier de téléchargement avec les bonnes permissions
echo -e "${BLUE}10. Création du dossier de téléchargement...${NC}"
mkdir -p $INSTALL_DIR/downloads
chown -R $USER:$USER $INSTALL_DIR/downloads
chmod 755 $INSTALL_DIR/downloads

# Vérification du service
echo -e "${BLUE}11. Vérification du statut du service...${NC}"
systemctl status $SERVICE_NAME

# Obtenir l'adresse IP
IP_ADDRESS=$(hostname -I | cut -d' ' -f1)

echo -e "\n${GREEN}=== Installation terminée ! ===${NC}"
echo -e "${GREEN}OnTheSpot est maintenant installé et configuré sur votre Raspberry Pi${NC}"
echo -e "${GREEN}Vous pouvez y accéder à l'adresse : http://$IP_ADDRESS:5000${NC}"
echo -e "\nCommandes utiles :"
echo -e "${BLUE}- Voir les logs :${NC} sudo journalctl -u $SERVICE_NAME -f"
echo -e "${BLUE}- Redémarrer le service :${NC} sudo systemctl restart $SERVICE_NAME"
echo -e "${BLUE}- Arrêter le service :${NC} sudo systemctl stop $SERVICE_NAME"
echo -e "${BLUE}- Voir le statut :${NC} sudo systemctl status $SERVICE_NAME"
