# Snake Retro (Web)

Juego **Snake** con estilo retro en Canvas, configurador con botones (nombre, dificultad, tema, nivel y volumen) y **Top 10** (duración / puntos) persistido en `localStorage`.

## Estructura
```
snake-web/
├─ index.html
├─ style.css
├─ snake.js
└─ assets/
   └─ music.ogg (o music.mp3)  ← coloca aquí la pista de música
```

## Música (dominio público)
Para evitar problemas de derechos, usa **grabaciones de dominio público** (no solo obras en dominio público). Lugares recomendados:
- **Musopen** (mira pistas con “Public Domain”).
- **Wikimedia Commons** (bandas militares de EE. UU. suelen ser dominio público).
- Archivos de instituciones **gubernamentales** de EE. UU. (US Navy Band, US Marine Band).

### Sugerencias con mucho movimiento
- *Flight of the Bumblebee* — Rimsky-Korsakov (rápida y enérgica).
- *In the Hall of the Mountain King* — Grieg.
- *William Tell Overture (Finale)* — Rossini.
- *Hungarian Dance No. 5* — Brahms.

> Asegúrate de que **la grabación** elegida sea dominio público o con licencia que permita uso en web sin restricciones comerciales. Si usas una licencia con atribución, añade el crédito en el footer (`index.html`) y en este README.

## Cómo correr en local
Abre `index.html` en tu navegador. La música sonará tras pulsar **Start** (política de autoplay).

## Subir a GitHub
```bash
git init
git add .
git commit -m "Snake web: UI, niveles, música, TOP"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/snake-web.git
git push -u origin main
```

## Desplegar en Render (Static Site)
1. En Render → **New** → **Static Site**.
2. Conecta tu repo `snake-web`.
3. **Build Command**: *(vacío)*.
4. **Publish Directory**: `/`.
5. Deploy.

## Créditos / Licencias
- Código: MIT (puedes cambiarlo).
- Música: dominio público (o según licencia indicada por la fuente). Agrega aquí el **crédito** si se requiere.
