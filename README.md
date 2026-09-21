# Flores amarillas · Para Nicol, de Jairo

Una dedicatoria interactiva: once girasoles protagonistas, acompañados por diez margaritas blancas y amarillas y cuatro lirios, luz de primavera, polen suspendido y cuatro mensajes que aparecen letra a letra.

## Ejecutar este proyecto

Requiere Node.js 24 y npm. Desde esta carpeta:

```powershell
npm ci
npm run dev
```

Abre la dirección que indica Vite. No abras `index.html` con doble clic: el proyecto necesita el servidor de Vite o un alojamiento HTTP.

```powershell
npm run build
npm run preview
```

`dist/` contiene la versión de producción. `package-lock.json` fija las versiones usadas y `npm ci` permite reproducirlas.

## Comandos para crear el proyecto desde cero

Estos comandos son para una **carpeta nueva**. En el proyecto entregado basta con `npm ci`.

```powershell
npm create vite@9.2.1 flores-amarillas -- --template react --no-interactive
cd flores-amarillas
npm install react@18.3.1 react-dom@18.3.1 three@0.170.0 @react-three/fiber@8.18.0 @react-three/drei@9.122.0 framer-motion@11.18.2
npm install -D tailwindcss@3.4.17 postcss@8 autoprefixer@10 @types/react@18 @types/react-dom@18
```

Después copia los componentes, `config.json`, los archivos de configuración, `index.html` y `public/` de esta entrega. El generador de Vite usa React 19 por defecto; por eso el segundo comando de instalación fija explícitamente React 18. Fiber 8 corresponde a React 18. No actualices Fiber a 9 sin migrar React.

## Archivos y responsabilidades

```text
config.json                 Todo el contenido, nombres, colores, audio y tiempos
config.original.json        Copia sin cambios del archivo de E:\Primavera
src/
  App.jsx                   Estados de apertura, carga diferida y coordinación
  Scene3D.jsx               Canvas, iluminación, polen y cámara con parallax
  SunModel.jsx              Sol procedural, halo y aparición sincronizada
  FlowerModel.jsx           Geometría matemática, instancias, floración y shader
  CompanionFlowers.jsx     Margaritas en capas y lirios de seis pétalos con estambres
  GardenControls.jsx       Arrastre, captura de puntero, teclado y reinicio de vista
  OverlayUI.jsx             UI Tailwind, Framer Motion y typewriter
  interaction.js            Audio HTML5, permiso iOS, mouse, touch y orientación
  text.js                   Interpolación de {receiverName} y {senderName}
  index.css                 Dirección visual y adaptación responsive
  main.jsx                  React 18 con StrictMode
public/
  primavera.wav             Música ambiental original incluida
  favicon.svg               Icono del regalo
scripts/create-ambient.mjs   Generador reproducible del audio original
netlify.toml                Configuración de publicación
```

## Tu configuración

Se conservan la estructura de tu JSON, los nombres **Nicol/Jairo**, la fecha, el botón, los cuatro mensajes y tus cuatro colores originales. Se retiraron del diseño las etiquetas “Flores amarillas”, “Hecho para Nicol” y “Hay detalles que se quedan”. La configuración inicial se conserva en `config.original.json`; `config.json` contiene la versión ampliada que usa la experiencia.

El `config.json` del proyecto amplía `ui` con todos los textos auxiliares, etiquetas accesibles y metadatos; también añade colores de iluminación y del ambiente primaveral. `backgroundSpring` permanece como base oscura; `springLight`, `springMist` y `springEdge` forman la capa luminosa de la transición. No hay mensajes o etiquetas visibles escritos directamente en los componentes.

Las claves principales siguen tu estructura:

```json
{
  "settings": { "receiverName": "Nicol", "senderName": "Jairo" },
  "messages": { "typewriterLines": ["Tu primer mensaje", "Tu segundo mensaje"] },
  "audio": { "filename": "primavera.wav", "volume": 0.5 },
  "animation": { "bloomDuration": 3.6, "characterDelay": 40, "punctuationPause": 250, "linePause": 850 }
}
```

Este fragmento ilustra las claves: edita el archivo completo entregado, no lo reemplaces por este fragmento. Los tiempos del texto están en milisegundos y `bloomDuration` en segundos. Si añades muchos mensajes, el panel dispone de desplazamiento vertical. Después de editar el JSON, vuelve a compilar antes de publicar.

## Audio

Tu config indicaba `flores-amarillas-lofi.mp3`, pero ese archivo no estaba en la carpeta. Para entregar una experiencia con sonido funcional, se incluye `primavera.wav`: un bucle ambiental original de 24 segundos, sin muestras de terceros. No es la canción de Floricienta. La selección original queda registrada en `audio.requestedFilename` y en `config.original.json`.

Para usar tu canción:

1. Copia el MP3 a `public/flores-amarillas-lofi.mp3`.
2. Cambia `audio.filename` a `flores-amarillas-lofi.mp3` en `config.json`.
3. Ejecuta `npm run build` de nuevo.

`interaction.js` construye siempre una ruta absoluta: `/flores-amarillas-lofi.mp3`, nunca `/public/...`. El botón inicial llama a `audio.play()` dentro del gesto del usuario. El permiso de orientación se solicita en ese mismo gesto, sin esperar su resultado para reproducir. HTML5 Audio no requiere crear un `AudioContext` de Web Audio adicional.

El sonido se pausa al ocultar la pestaña. Se puede reactivar con el botón de audio; un archivo ausente o un bloqueo de reproducción muestra su estado sin impedir leer el regalo.

## Jardín y detalle de los modelos

El jardín contiene **once girasoles** distribuidos en profundidad. Todas sus posiciones, alturas, tamaños de cabeza, inclinaciones, fases de viento y retrasos de apertura están en `garden.plants` dentro de `config.json`. Comparten geometrías y materiales; no se cargan modelos GLB/GLTF, fotografías ni HDR externos.

Cada girasol tiene **72 pétalos**, en dos coronas largas de 34 y 26 y una corona interior corta de 12. La forma matemática se muestrea con 23 × 9 vértices en primer plano y 15 × 5 en los modelos secundarios. El perfil base es:

`w(t) = 0.143 · sin(πt)^0.86 · (0.9 + 0.1t) + 0.002`

El ancho incorpora pequeñas irregularidades; la superficie suma curvatura transversal, nervaduras y una punta que se vuelve hacia atrás. Un shader de fragmentos añade vetas longitudinales finas y variaciones sutiles de color. El tinte pasa de ámbar en la base a amarillo en la punta; cada pétalo tiene además su propia variación de pigmentación, apertura y longitud.

Los discos centrales son más anchos y tienen **987 floretes tubulares en los modelos detallados** y **377 floretes simplificados en los secundarios**. Se distribuyen con la espiral de Vogel:

`θᵢ = i · π(3 − √5)`

`rᵢ = 0.445 · √((i + 0.5) / N)`

Los floretes se orientan radialmente y siguen una cúpula, con variación de pigmento y una franja de polen dorado hacia el borde; su color evoluciona de un corazón oscuro a un borde dorado. Dos capas de **26 brácteas verdes** rodean un receptáculo posterior texturizado; el tallo se une por detrás de la cabeza. Los pétalos tienen dos superficies unidas por el borde, con espesor fino para conservar volumen de perfil y desde atrás.

Las hojas tienen una geometría independiente, de perfil ovalado, bordes dentados, pliegue central y puntas caídas. Dos texturas de 128 × 128 píxeles generadas matemáticamente aportan pigmentación irregular y microrrelieve; se comparten entre todas las plantas y no descargan imágenes. Las plantas detalladas muestran nervaduras centrales y laterales que siguen exactamente su superficie. Cada tallo recorre una curva Catmull–Rom y se estrecha hacia la flor. La base añade un pequeño montículo y **240 briznas de hierba instanciadas en escritorio**, o **130 en móvil**.

### Floración y viento

Cada planta abre sus pétalos con su propio retraso y mantiene una oscilación suave, con una fase distinta a la de sus vecinas. La dedicatoria espera a la última apertura antes de revelarse. La opción “Otra vez” reinicia todas las flores y el texto.

`MeshStandardMaterial.onBeforeCompile` desplaza cada pétalo con:

`z += uWind · 0.023 · y² · sin(1.25 · uTime + 2.4 · y)`

El factor `y²` fija su base. También se corrigen las normales con la derivada de la deformación para mantener la iluminación. El tiempo se actualiza una sola vez por frame en el material compartido; las matrices de pétalos dejan de subirse cuando termina la floración.

### Flores de acompañamiento

`garden.companions` configura diez margaritas y cuatro lirios, de menor tamaño y altura que los girasoles. Se distribuyen por la base y los laterales para dejar despejadas las cabezas grandes. Cada entrada define posición, altura, escala, inclinación y retraso de floración. Los colores están en `ui.colors` (`companionWhite`, `companionGold`, `companionCenter`, `lilyPetal`, `lilyThroat`, `lilyBlush`, `lilyPollen`).

Las margaritas blancas tienen dos coronas de pétalos redondeados; las amarillas, tres. Sus centros dorados siguen una espiral de Vogel con 155 floretes por flor (85 en móvil). Los lirios tienen seis tépalos puntiagudos: la superficie sube como una trompeta y se curva hacia atrás en la punta; seis filamentos rematan en anteras alargadas, alrededor de un pistilo central. Un gradiente verde marfil y un matiz rosado recorren sus pétalos.

Todo se genera en código. Las catorce flores comparten ocho llamadas de dibujo: siete grupos de instancias y los tallos fusionados. Las matrices solo se actualizan durante la apertura; el viento continúa mediante el shader compartido de pétalos. La floración se reinicia con “Otra vez” y respeta la preferencia de movimiento reducido.

### Sol en la esquina

Un sol procedural aparece en la esquina superior derecha mientras florece el jardín. Su disco luminoso y resplandor atmosférico se dibujan en un único plano mediante shader, sin texturas ni postprocesado. El sol ocupa ampliamente la esquina y queda parcialmente fuera del encuadre. Combina un núcleo casi blanco, granulación sutil, borde dorado, corona de filamentos y haces de diferentes longitudes que se disuelven en el ambiente. Un destello alargado realza el borde. Tres haces amplios apuntan hacia el jardín y pequeños reflejos ópticos acompañan su eje. El brillo crece una vez durante la apertura y se asienta suavemente. El plano tiene más extensión para los rayos, conservando una sola llamada de dibujo. Los rayos se despliegan durante la floración y su intensidad varía lentamente; no giran como un icono. Añade una luz direccional cálida que gana intensidad con la misma transición.

`sun.desktopSize`, `sun.mobileSize` y los pares `desktopInset` / `mobileInset` controlan su tamaño y márgenes en píxeles; los márgenes indican derecha y arriba. `sun.rayStrength` controla la presencia de los rayos y la corona (valor inicial: 1.05). `sun.rayLength` controla su alcance (1.65); `sun.beamStrength`, los haces amplios (0.5); y `sun.flareStrength`, los reflejos ópticos (0.35). Los colores están en `ui.colors.sunCore`, `sunEdge` y `sunHalo`. La aparición comparte `animation.bloomDuration` con los girasoles y se reinicia al pulsar “Otra vez”. Con movimiento reducido, el sol aparece directamente y la variación de luz se detiene.

## Rendimiento y accesibilidad

- `Canvas dpr={[1, 2]}`; límite adicional de 1.6 en móvil. En móvil solo el girasol protagonista utiliza la geometría de mayor detalle; se conservan las once plantas.
- Una llamada de dibujo para todos los pétalos de cada planta y otra por su disco de floretes; la hierba usa un solo InstancedMesh. Las matrices dejan de subirse al terminar la apertura; el viento continúa en GPU.
- `Environment` de 128 px generado con `Lightformer`, capturado una sola vez. No descarga HDR.
- 30 partículas en móvil y 55 en escritorio; sin sombras dinámicas ni postprocesado costoso.
- La escena 3D se carga con `React.lazy`; la interfaz se entrega en el paquete inicial.
- El render se detiene al ocultar la pestaña. Los listeners y timers tienen limpieza para React StrictMode.
- Parallax amortiguado en `useFrame`, con límites pequeños y sin actualizar estado React por cada movimiento.
- `prefers-reduced-motion` desactiva viento, polen y parallax; revela el texto completo y abre la flor sin animación prolongada.
- Botones semánticos, foco visible, tamaños táctiles y una versión continua de la dedicatoria para lectores de pantalla.
- Si WebGL falla, el regalo mantiene los mensajes y muestra una explicación visual.

Las fuentes usan Google Fonts con fallback local a Georgia/sans-serif. Si el dispositivo no tiene conexión a Google Fonts, el regalo sigue funcionando.

## Netlify en pocos pasos

### Publicación manual

1. Ejecuta `npm ci` y `npm run build`.
2. Abre https://app.netlify.com/drop e inicia sesión en tu cuenta.
3. Arrastra la carpeta **`dist`**, no la carpeta `src` ni el proyecto sin compilar.
4. Usa la URL HTTPS resultante para compartir el regalo.

La entrega incluye también `netlify-dist.zip`: descomprímelo y arrastra la carpeta que contiene `index.html` a Netlify Drop. Esa versión corresponde al config de esta entrega.

### Publicación desde Git

1. Sube el proyecto a un repositorio, incluyendo `package-lock.json`, `config.json` y `public/`.
2. En Netlify, crea un proyecto importando ese repositorio.
3. Build command: `npm run build`. Publish directory: `dist`. Node: `24`.
4. `netlify.toml` ya declara estos valores. Si el proyecto está dentro de otra carpeta del repositorio, selecciona esa carpeta como base.

No hace falta configurar redirects SPA: esta experiencia tiene una sola ruta. No requiere servidor, funciones, claves ni variables de entorno.

El permiso de orientación necesita HTTPS en dispositivos compatibles. En iOS aparece al tocar el botón inicial. Si se deniega, la interacción por touch continúa. La comprobación final del sensor debe hacerse en un teléfono físico; la vista responsive de escritorio no reproduce ese permiso de Safari.

## Fuentes técnicas

- Compatibilidad React 18/Fiber 8: https://r3f.docs.pmnd.rs/getting-started/installation
- Environment y captura de un frame: https://drei.docs.pmnd.rs/staging/environment
- Lightformer: https://drei.docs.pmnd.rs/staging/lightformer
- Permiso y activación del usuario en iOS: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static
- Vite en Netlify: https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/



## Explorar el jardín en 3D

Arrastra sobre las flores para girar el jardín 360° sobre su eje vertical. Un arrastre vertical inclina ligeramente la vista, con límites de ±0.22 radianes. El sol y la dedicatoria mantienen su posición. El giro se conserva al soltar; “Centrar vista” y “Otra vez” recuperan el frente. El giro también funciona con ratón, con las flechas del teclado y con Inicio para centrar.

`interaction.dragSensitivity` controla la sensibilidad horizontal y `interaction.maxTilt` limita la inclinación. La zona táctil usa captura de puntero y `touch-action: none`; el mensaje y los botones quedan fuera del gesto. El parallax se atenúa durante el arrastre. La preferencia de movimiento reducido conserva el control manual directo, sin interpolación de giro. Al pasar de frente a perfil se reduce suavemente la escala para mantener el jardín encuadrado en móvil.
## Luz viva y detalles orgánicos

El sol tiene una pulsación continua de 4.2 segundos, con amplitud 0.85, con una segunda cresta suave. Afecta al halo, la corona y el alcance de los rayos; el disco mantiene su tamaño. Los haces oscilan de forma visible, cambian de longitud y varían de intensidad por separado. Una onda difusa viaja desde el borde del sol hacia fuera y el halo aumenta su radio durante cada latido. La animación conserva su ritmo en dispositivos que renderizan por debajo de 20 fps. La luz sobre las flores acompaña el pulso con una variación pequeña. `sun.pulsePeriod` y `sun.pulseStrength` controlan el ciclo y su amplitud. Con movimiento reducido, tanto el pulso como el movimiento de los rayos se detienen.

Los pétalos de girasol son más estrechos y cóncavos, con variaciones de longitud, inclinación y curvatura. El shader aproxima una transmisión tenue de la luz existente a través de los pétalos. Cuatro pecíolos curvos conectan las hojas al tallo; se fusionan en su misma geometría para mantener una llamada de dibujo por tallo.