from web_app import app

if __name__ == "__main__":
    # Configuration production
    app.config['ENV'] = 'production'
    app.config['DEBUG'] = False
    app.config['TESTING'] = False
    app.config['PREFERRED_URL_SCHEME'] = 'http'
    
    # Démarrage du serveur
    from waitress import serve
    serve(app, host='0.0.0.0', port=5000, threads=4)
