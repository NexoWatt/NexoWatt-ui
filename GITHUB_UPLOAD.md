# GitHub-Upload-Quickstart

1) Neues GitHub-Repo **NexoWatt-UI** (oder dein Wunschname) erstellen.
2) Lokal clonen und pushen:
```
git init
git add .
git commit -m "NexoWatt VIS 0.4.18"
git branch -M main
git remote add origin https://github.com/USER/NexoWatt-UI.git
git push -u origin main
git tag v0.4.18
git push origin v0.4.18
```
Danach kannst du in ioBroker direkt aus deinem GitHub installieren (z. B. über die URL `https://github.com/USER/NexoWatt-UI.git`).
