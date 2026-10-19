# TLH Quiz Room · actualización a 40 preguntas

Descomprimí este ZIP dentro de `F:\Descargas\Quiz Trivia`, aceptando reemplazar los archivos de la app. Luego subí los cambios al mismo repositorio de GitHub Pages.

El ZIP contiene los cinco archivos actualizados (`index.html`, `styles.css`, `config.js`, `core.js`, `app.js`) y estas instrucciones. Conservá las carpetas `Quiz` e `Images` que ya tenés: no se incluyen ni se reemplazan sus archivos.

## Partidas

- Cada desafío contiene 40 preguntas: 15 fáciles, 10 regulares, 5 difíciles, 5 muy difíciles y 5 imposibles.
- Cada intento presenta 8 preguntas: 3 fáciles, 2 regulares, 1 difícil, 1 muy difícil y 1 imposible, en ese orden.
- Hay cinco intentos por desafío. Las preguntas se mezclan una vez por nivel, se guardan en el navegador y no se repiten entre intentos.
- Una partida en curso se puede retomar después de cerrar o recargar la página. Las preguntas asignadas quedan reservadas desde que comienza la partida.
- «Limpiar historial» reinicia las dos modalidades. No modifica datos de otros sitios o aplicaciones.
- El historial antiguo de partidas de 5 preguntas no se reutiliza: esta actualización comienza en cero.

## Aproximación

Se ingresa una respuesta numérica y se confirma. Se admite coma o punto decimal, sin separadores de miles. La app respeta el número de decimales y los límites declarados en cada pregunta.

La respuesta de cada personaje es `respuesta_correcta + desvio_respuesta[personaje]`. Se compara el error absoluto respecto de la respuesta correcta. Una victoria corresponde a quedar en primer lugar, solo o empatado, frente a los 12 personajes.

El resultado final muestra victorias sobre 8 y, por separado, respuestas exactas. Se puede desplegar la comparación de las 13 respuestas, incluida la del jugador, durante la partida y en la revisión final.

## Archivos e iconos

Se esperan estos JSON dentro de `Quiz/` y estos PNG dentro de `Images/`. Los nombres y mayúsculas deben coincidir exactamente.

| JSON | Icono PNG |
| --- | --- |
| trivia_mamiferos_01.json | trivia_zebra.png |
| trivia_monstruos_marinos_reales_01.json | trivia_jellyfish.png |
| trivia_insectos_01.json | trivia_butterfly.png |
| trivia_bebidas_alcoholicas_01.json | trivia_alcohol.png |
| trivia_geografia_01.json | trivia_earth.png |
| trivia_cine_01.json | trivia_clapperboard.png |
| trivia_literatura_01.json | trivia_little_prince_no_title.png |
| trivia_quimica_01.json | trivia_periodic_table.png |
| aproximacion_alturas_edificios_monumentos_01.json | aprox_pisa.png |
| aproximacion_astronomia_01.json | aprox_saturn.png |
| aproximacion_cine_01.json | aprox_clapperboard.png |
| aproximacion_epidemias_pestes_01.json | aprox_virus.png |
| aproximacion_geografia_01.json | aprox_earth.png |
| aproximacion_guerras_conflictos_belicos_01.json | aprox_t34.png |
| aproximacion_juegos_olimpicos_01.json | aprox_olympics.png |
| aproximacion_literatura_01.json | aprox_books.png |

Las rutas son relativas y funcionan en GitHub Pages dentro de la carpeta del repositorio. No abras `index.html` mediante doble clic para probar la carga de JSON: usá GitHub Pages o un servidor local.

Se mantiene el diseño blanco, gris y negro, con adaptación a pantallas pequeñas. Si un icono falta, se muestra una inicial; si un JSON falta o tiene una estructura incorrecta, la tarjeta informa el problema sin bloquear los demás desafíos.


## Clasificación final de los 13 jugadores

Después de responder las ocho preguntas aparece tu puesto y la tabla de los doce personajes más vos.

En trivias, se ordena por respuestas correctas. Los aciertos de cada personaje se simulan a partir de `probabilidad_acierto` y quedan determinados por la partida: recargar o revisar no vuelve a sortearlos. Los empates comparten puesto (por ejemplo, 1.º, 1.º, 3.º). Se trata de una simulación, no de respuestas de otros usuarios reales.

En aproximación, primero se cuentan las victorias por cercanía, incluidos los empates en primer lugar. Si hay igual cantidad de victorias, se desempata por menor error relativo medio: para cada pregunta, error absoluto dividido por el valor absoluto de la respuesta correcta. Si esa respuesta es 0, se divide por 1. Se promedian los ocho valores. La tabla muestra ese promedio como porcentaje, redondeado solo para visualizar; los cálculos usan mayor precisión.

Esta actualización conserva el historial de la versión de ocho preguntas y calcula también las clasificaciones de sus partidas anteriores. No es necesario limpiar el historial. Conservá tus carpetas Quiz e Images y reemplazá los archivos de la app del ZIP.
