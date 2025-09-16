# Dernier-Metro

API REST simulant les horaires du dernier métro parisien.

## 1) Description

Cette API aide les usagers à savoir s'ils peuvent attraper le dernier métro. Elle fournit les prochains horaires et indique si c'est la dernière rame.

## 2) Installation

```bash
# Cloner le projet
git clone https://github.com/AV-13/Dernier-Metro.git
cd Dernier-Metro

# Installer les dépendances
npm install
```
### Local

```bash
# Démarrage normal
node server.js

# Avec heure simulée pour tests
$env:MOCK_TIME="01:58"; node server.js # WINDOWS
```

### Avec Docker

```bash
# Construire l'image
docker build -t metro-api .

# Lancer le conteneur
docker run -p 3000:3000 metro-api

# Avec heure simulée
docker run -p 3000:3000 -e MOCK_TIME=00:50 metro-api
```

## 3) Endpoints
- `GET /health`  
  Vérifie que le service est opérationnel.  
  Réponse: `200 OK`  
  ```json
  { "status": "ok" }
  ```
- `GET /next-metro?station=NAME`
    Fournit le prochain métro pour la station donnée.  
    Paramètres:
    - `station` (obligatoire): nom de la station (ex: Chatelet).  
    Réponses:
    - `200 OK` avec JSON:
        ```json
        {
        "station": "Chatelet",
        "line": "M1",
        "headwayMin": 3,
        "nextArrival": "12:34",
        "isLast": false,
        "tz": "Europe/Paris"
        }
        ```
    - `400 Bad Request` si `station` manquante:
        ```json
        { "error": "missing station" }
        ```
    - `404 Not Found` pour autres routes:
        ```json
        { "error": "not found" }
        ```