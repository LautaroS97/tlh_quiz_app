# TLH · Quiz Room

Mini app estática en HTML, CSS y JavaScript. Sin instalación, dependencias, cuentas ni backend.

## Preparación

Descomprimí **el contenido** del ZIP directamente en `F:\Descargas\Quiz Trivia`.
Los archivos `index.html`, `styles.css`, `app.js`, `core.js` y `config.js` deben quedar al mismo nivel que tus carpetas existentes `Quiz` e `Images`. El ZIP no incluye ni reemplaza tus JSON o iconos.

Rutas esperadas, tomadas de las capturas:

| JSON dentro de Quiz | PNG dentro de Images |
| --- | --- |
| trivia_mamiferos_01.json | trivia_zebra.png |
| trivia_monstruos_marinos_reales_02.json | trivia_jellyfish.png |
| trivia_insectos_03.json | trivia_butterfly.png |
| trivia_bebidas_alcoholicas_04.json | trivia_alcohol.png |
| trivia_geografia_05.json | trivia_earth.png |
| trivia_cine_06.json | trivia_clapperboard.png |
| trivia_literatura_07.json | trivia_little_prince_no_title.png |
| trivia_quimica_08.json | trivia_periodic_table.png |

Windows puede ocultar las extensiones: verificá que sean `.json` y `.png`, sin extensiones duplicadas. GitHub distingue mayúsculas de minúsculas. Si algún archivo difiere, cambiá únicamente su nombre en `config.js`.

## Publicación

1. Subí los archivos de la raíz y las carpetas completas `Quiz` e `Images` a tu repositorio de GitHub, conservando los nombres.
2. Activá GitHub Pages para publicar la carpeta raíz de la rama elegida.
3. Entrá a la URL de GitHub Pages, no a la vista de archivos del repositorio.

Las rutas relativas funcionan aunque la página viva en `usuario.github.io/repositorio/`. Se incluye `.nojekyll` para servir los archivos estáticos.

Para probar localmente, podés usar Live Server de VS Code o, si tenés Python, ejecutar `python -m http.server 8000` desde la carpeta y entrar a `http://localhost:8000`. El doble clic sobre `index.html` no es compatible con la carga de JSON y los módulos JavaScript.

## Funcionamiento

- Cada partida sirve **cinco preguntas en total: una de cada nivel**, presentadas de fácil a imposible.
- Cada nivel tiene cinco preguntas. Se baraja su orden una vez y se asigna una a cada partida. Por eso las cinco partidas recorren las 25 preguntas sin repeticiones.
- La primera partida se reserva al tocar Comenzar. Si volvés al menú o recargás, podés continuarla; no consume otra partida ni cambia las preguntas.
- Seleccionar una respuesta la confirma y guarda inmediatamente. Se muestra si fue correcta y luego se habilita Siguiente.
- Al terminar se muestra un resultado como **4/5** y la revisión de las cinco respuestas. Podés consultar las partidas previas desde los resultados; al agotar las cinco, la tarjeta ofrece Ver resultados.
- Limpiar historial pide confirmación y borra exclusivamente los datos de esta app, incluidas las partidas en curso. Luego vuelven a estar disponibles cinco partidas por trivia.
- Se guardan preguntas asignadas, respuestas y resultados en `localStorage`. El progreso pertenece al navegador y a la dirección de la página; no se sincroniza entre dispositivos. Borrar los datos del sitio también lo elimina.
- La app permite retomar, pero no cambiar una respuesta confirmada. Cuando el navegador lo admite, coordina las escrituras entre pestañas con Web Locks.
- Si cambia el contenido de un JSON, se genera un nuevo conjunto de partidas para esa trivia al volver a comenzar. Las demás mantienen su historial.
- Los porcentajes de acierto de los participantes y los premios de TLH permanecen en los JSON, pero este visor evalúa las respuestas del usuario; no simula a los participantes.

## Formato de preguntas

Cada JSON debe tener `preguntas`, con 25 elementos, cinco por cada `dificultad` entera de 1 a 5. Cada pregunta necesita `texto`, `opciones` con A, B, C y D, y `respuesta_correcta` con una de esas letras. Se usa su `id` o, si falta, un identificador derivado de su posición. Los otros campos son compatibles y no se modifican.

## Verificación de esta entrega

Se comprobaron la sintaxis JavaScript, las rutas del catálogo según las capturas y la lógica de selección, puntuación, persistencia y reinicio mediante pruebas automatizadas con los ocho JSON de trabajo. No se verificó visualmente en un navegador ni se accedió a tu disco F:. Los JSON y PNG reales se cargarán desde tus carpetas al publicar.
