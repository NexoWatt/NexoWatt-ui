# Git-Repository – Sicherheitshinweis

Der NexoWatt-EOS-Quellcode ist proprietär. Ein Repository dafür muss **privat** angelegt und vor dem ersten Push nochmals auf die Sichtbarkeit **Private** geprüft werden.

Die Release-ZIP enthält bewusst keinen `.git`-Ordner und führt keine Git-Befehle aus. Vor einem Push sind mindestens zu prüfen:

```text
- Repository-Sichtbarkeit: Private
- node_modules nicht eingecheckt
- .env, .npmrc, Zertifikate und Schlüssel nicht eingecheckt
- git status und git diff vollständig kontrolliert
```

Kein Quellcode darf in ein öffentliches Repository gepusht werden.
