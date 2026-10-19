# TLH Quiz Room · aproximación probabilística

Descomprimí este ZIP dentro de `F:\Descargas\Quiz Trivia`, aceptando reemplazar los archivos de la app. Después subí los cambios al mismo repositorio de GitHub Pages.

El paquete contiene la app, estas instrucciones y los ocho JSON de aproximación con sufijo `_fixed`, dentro de `Quiz/`. Conservá los JSON de trivia y los iconos que ya tenés en `Quiz/` e `Images/`: no se incluyen ni se borran. Los JSON anteriores de aproximación pueden permanecer en la carpeta, pero esta configuración utiliza únicamente los `_fixed`.

## Qué cambió

- `core.js`: interpreta el nuevo modelo, valida los intervalos y sortea las respuestas rivales.
- `app.js`: guarda los sorteos y utiliza las mismas respuestas para comparar, puntuar y mostrar la clasificación.
- `config.js`: carga los ocho JSON `_fixed`.
- `index.html`: actualiza la versión de los recursos para renovar la carga en el navegador.
- `styles.css`: se incluye el diseño existente, con adaptación a móviles.

## Cómo responden los rivales

Al comenzar una partida se sortean y guardan las respuestas de los 12 personajes para sus ocho preguntas:

1. Se sortea el acierto exacto con `probabilidad_acierto[personaje]`, expresada como porcentaje numérico.
2. Si acierta, responde `respuesta_correcta`.
3. Si falla, se consulta `nivel_error_si_falla[personaje]` y se elige un desvío no nulo de `intervalos_desvio_si_falla[nivel]`.
4. La respuesta es la suma de la respuesta correcta y ese desvío.

Se elige uniformemente entre todos los valores permitidos. Si un intervalo contiene más valores que otro, recibe una proporción mayor del sorteo; no se sortean los intervalos con igual peso. Los límites son inclusivos. Se respeta el paso indicado en cada pregunta o, en su ausencia, el paso del modelo: por ejemplo, centésimas, cuartos o millares. El cálculo usa unidades enteras del paso para evitar residuos de coma flotante.

Los sorteos no dependen de lo que responda el jugador. Solo se realizan al crear la partida y se guardan como números en `rivalAnswers` dentro del historial de esa partida. Recargar, volver al menú, continuar o revisar resultados no cambia las respuestas rivales. Una nueva partida realiza nuevos sorteos.

La app también admite el formato anterior de desvíos fijos, si se vuelve a configurar un JSON de ese tipo.

## Partidas y clasificación

Cada desafío conserva sus 40 preguntas y cinco partidas sin repetir. Cada partida presenta 3 fáciles, 2 regulares, 1 difícil, 1 muy difícil y 1 imposible, en ese orden.

En aproximación, una victoria corresponde a tener el menor error absoluto en una pregunta; los primeros puestos compartidos también cuentan. La clasificación final ordena por victorias sobre ocho. A igualdad de victorias, gana el menor error relativo medio: el error absoluto dividido por el valor absoluto de la respuesta correcta, con divisor 1 si esta es cero. Se promedian las ocho preguntas. Los empates de ambas métricas comparten puesto.

La clasificación, la comparación por pregunta y la puntuación del menú usan las mismas respuestas guardadas. La clasificación de trivias mantiene su funcionamiento anterior.

## Historial

Se conserva el historial de las trivias de ocho preguntas. Las aproximaciones comienzan con historial nuevo porque ahora usan archivos con otros nombres y un modelo distinto. El historial anterior no se mezcla con los nuevos sorteos.

El botón «Limpiar historial» reinicia todos los desafíos, incluidas las partidas y los sorteos. No borra datos de otras aplicaciones.

## Archivos e iconos de aproximación

| JSON dentro de Quiz/ | PNG existente dentro de Images/ |
| --- | --- |
| aproximacion_alturas_edificios_monumentos_01_fixed.json | aprox_pisa.png |
| aproximacion_astronomia_01_fixed.json | aprox_saturn.png |
| aproximacion_cine_01_fixed.json | aprox_clapperboard.png |
| aproximacion_epidemias_pestes_01_fixed.json | aprox_virus.png |
| aproximacion_geografia_01_fixed.json | aprox_earth.png |
| aproximacion_guerras_conflictos_belicos_01_fixed.json | aprox_t34.png |
| aproximacion_juegos_olimpicos_01_fixed.json | aprox_olympics.png |
| aproximacion_literatura_01_fixed.json | aprox_books.png |

Las ocho rutas de trivia y todos los nombres de iconos se mantienen. GitHub Pages distingue mayúsculas y minúsculas. Las rutas son relativas, de modo que funcionan dentro del subdirectorio del repositorio.

Publicá la carpeta en GitHub Pages o usá un servidor local; abrir index.html por doble clic no permite cargar los JSON correctamente. No se necesitan instalación de dependencias ni compilación. Si el navegador conserva la versión anterior, recargá con Ctrl + F5.

## Verificación realizada

Se probaron cinco partidas por cada una de las 16 categorías, las cuotas por dificultad, la ausencia de repeticiones, el ranking, la conservación del historial de trivia y la persistencia de sorteos tras recargar. También se verificaron los casos de respuesta cero, límites, decimales, pasos de 0,25 y 1000, intervalos asimétricos y una prueba estadística de 20.000 sorteos. Las pruebas de interfaz automatizada cubrieron entradas inválidas, coma decimal, las tablas de 13 jugadores, revisión de resultados y limpieza del historial.
