// Rutas de las capturas; GitHub Pages distingue mayúsculas.
export const QUIZZES = [
['trivia_mamiferos_01.json','Mamíferos','trivia_zebra.png'],
['trivia_monstruos_marinos_reales_01.json','Monstruos marinos reales','trivia_jellyfish.png'],
['trivia_insectos_01.json','Insectos','trivia_butterfly.png'],
['trivia_bebidas_alcoholicas_01.json','Bebidas alcohólicas','trivia_alcohol.png'],
['trivia_geografia_01.json','Geografía','trivia_earth.png'],
['trivia_cine_01.json','Cine','trivia_clapperboard.png'],
['trivia_literatura_01.json','Literatura','trivia_little_prince_no_title.png'],
['trivia_quimica_01.json','Química','trivia_periodic_table.png'],
['aproximacion_alturas_edificios_monumentos_01.json','Edificios y monumentos','aprox_pisa.png'],
['aproximacion_astronomia_01.json','Astronomía','aprox_saturn.png'],
['aproximacion_cine_01.json','Cine','aprox_clapperboard.png'],
['aproximacion_epidemias_pestes_01.json','Epidemias y pestes','aprox_virus.png'],
['aproximacion_geografia_01.json','Geografía','aprox_earth.png'],
['aproximacion_guerras_conflictos_belicos_01.json','Guerras y conflictos bélicos','aprox_t34.png'],
['aproximacion_juegos_olimpicos_01.json','Juegos Olímpicos','aprox_olympics.png'],
['aproximacion_literatura_01.json','Literatura','aprox_books.png']
].map(([file,title,icon])=>({file,title,icon,mode:file.startsWith('aproximacion_')?'aproximacion':'trivia'}));
