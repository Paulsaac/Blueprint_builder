# Blueprint Builder — contexto para el próximo agente

Actualizado el **25 de octubre de 2026**, zona horaria America/Santiago.

## 1. Objetivo y decisiones del usuario

Construir una herramienta web donde el usuario cargue una imagen de un plano arquitectónico y el sistema reconozca automáticamente sus componentes, incluyendo mobiliario, y genere el levantamiento 3D alineado sobre la misma imagen.

La prioridad es **el reconocimiento y levantamiento automático**, no crear un editor CAD ni dedicar esfuerzo a la edición manual del 3D. Three.js fue elegido como base del visor, aprovechando experiencia previa del usuario con JavaScript y entornos 3D.

El usuario entregó dos imágenes: `plano.jpeg`, elegida para el desarrollo, y `diseño.jpeg`, referencia de acabado. En este repositorio se conservan como `dist/assets/plano.jpeg` y `dist/assets/referencia.jpeg`. La imagen de acabado nunca debe presentarse como un resultado generado.

El usuario autorizó este entregable: **detección 2D por categorías, comparación con anotaciones del plano y levantamiento 3D correspondiente**. Después pidió conectar este proyecto a `https://github.com/Paulsaac/Blueprint_builder`, documentar el progreso y hacer push.

## 2. Estado real del proyecto

Existe una aplicación funcional, buildless, con dos formas de ejecución:

| Forma | Qué funciona |
|---|---|
| Sitio estático / GitHub Pages | Ensayo precalculado de una inferencia real sobre el archivo `plano.jpeg`, revisión, métricas, catálogo 3D, calibración y exportaciones. Para otras imágenes solo funciona el detector geométrico anterior. |
| Servicio Python local | Sirve la misma interfaz y ejecuta los modelos CPU sobre imágenes nuevas; todo ocurre en el equipo del usuario. |

**No existe todavía inferencia de IA en la nube.** GitHub Pages sirve archivos estáticos y no ejecuta el backend Python. Iniciar el motor local no transforma la URL publicada en un servicio de IA: para usarlo hay que abrir `http://127.0.0.1:4173`.

El usuario pidió eliminar la publicación de Sites y confirmó su eliminación permanente; se eliminó y luego eligió GitHub Pages. **No recrear Sites sin una nueva solicitud del usuario.** El modelador se publica en [GitHub Pages](https://paulsaac.github.io/Blueprint_builder/).

El código estaba inicialmente en la subcarpeta local `app`, que es la raíz de trabajo de Sites. La importación inicial a GitHub se realiza como una instantánea pública revisada, porque Git CLI no tenía una credencial de escritura válida. El historial y la configuración privada de Sites permanecen en el checkout original. Un clon independiente de GitHub se conserva en la carpeta local `Blueprint_builder`, junto a `app`; en el clon los archivos operativos están directamente en la raíz, sin otra carpeta `app` dentro.

GitHub Pages usa la rama `main`, carpeta `/ (root)`. Inicialmente mostraba el README porque faltaba un `index.html` en la raíz. Ahora ese archivo redirige a `./dist/`, conservando parámetros y fragmentos, con enlace y redirección HTML de respaldo. `.nojekyll` evita procesar el repositorio con Jekyll. Todas las dependencias de la aplicación usan rutas relativas; no mover ni duplicar los archivos de `dist/` para publicar. Los pushes a `main` actualizan Pages. La configuración privada de hosting anterior no se publica en GitHub; tampoco se debe subir el historial privado original sin revisar sus metadatos.

## 3. Progreso cronológico

### Fase inicial: definición

Se separaron tres problemas: interpretar píxeles, reconstruir geometría y visualizarla en 3D. Se descartó hacer del trazado manual o la edición 3D el flujo principal. La escala real y las alturas requieren datos de referencia o valores configurados; no se pueden recuperar con certeza si faltan en la imagen.

### Prototipo 01: geometría automática

Se desarrolló un detector JavaScript para planos ortogonales de doble línea o trama:

- Lectura de intensidad y búsqueda de pares de bordes paralelos.
- Dos pasadas de contraste, descarte de duplicados y filtrado de líneas cortas aisladas.
- Tramos de muro y huecos candidatos entre tramos colineales.
- Ejecución en Web Worker para mantener la interfaz disponible.
- Levantamiento automático Three.js sobre la imagen, vista superior/axonométrica, capas y calibración con dos puntos.
- Carga JPEG/PNG/WEBP y exportación JSON/PNG.

Este detector **no es IA entrenada**. Conservamos `dist/detector.js` y `dist/worker.js` como baseline y alternativa explícita. Se hicieron ajustes de contraste, longitud mínima y conexión al revisar el ejemplo. No hay coordenadas de muros del ejemplo codificadas dentro del detector.

### Ensayo 02: reconocimiento, anotaciones y comparación

1. Se preparó una referencia manual inicial separada de los modelos.
2. Se instaló un entorno Python CPU local y se evaluaron modelos públicos.
3. Se probó `Yytsi/floorplan-to-3d-walls`, ResNet34-UNet: **cero regiones de muro** sobre este JPEG, incluso tras contrastar el preprocesamiento con su código. No se presentó como una detección correcta; quedó registrado en `dist/data/model-experiments.json`.
4. Se evaluó el modelo original CubiCasa5K hourglass, con entrada RGB normalizada a `[-1, 1]`, salida de 44 canales y separación `[21 heatmaps, 12 clases de espacios, 11 iconos]`. Sí recuperó muros y aberturas.
5. Se integró un YOLOv8 de símbolos de planos del proyecto `REIkd/FYP-Floorplan` para mobiliario.
6. Se añadió fusión de resultados, extracción de contornos con huecos y un catálogo paramétrico de objetos Three.js.
7. Se implementaron vistas por categoría, referencia manual, aciertos/omisiones/sobrantes y una tabla de evaluación.
8. Se añadió API CPU local, preparación del entorno, verificación de hashes y documentación de reproducción.
9. Se publicó el ensayo 02 y se comprobó que funcionaba en el sitio privado.

## 4. Arquitectura y archivos clave

```text
Imagen JPEG/PNG/WEBP
  ├─ Inferencia local Python
  │    ├─ CubiCasa5K → muros, aberturas y equipamiento
  │    ├─ YOLOv8 → mobiliario y otras propuestas
  │    └─ Fusión y contornos → JSON con procedencia
  ├─ Detector geométrico JS → baseline de muros/huecos
  └─ Interfaz
       ├─ Detección 2D y filtros
       ├─ Comparación contra referencia manual del mismo archivo
       └─ Three.js → levantamiento y objetos de catálogo
```

| Archivo | Responsabilidad |
|---|---|
| `dist/app.js` | Carga, hash del archivo, elección de fuente, llamadas a API, vistas, calibración, escena y exportaciones. |
| `dist/components.js` | Camas, sofás, mesas, sillas, aberturas y equipamiento paramétricos. Alturas/orientación aproximadas. |
| `dist/evaluation.js` | Catálogo de categorías, IoU de cajas, emparejamiento uno a uno y rasterización/IoU de muros. |
| `dist/detector.js`, `dist/worker.js` | Baseline geométrico anterior. |
| `dist/data/plano-prediction.json` | Resultado real precalculado; conserva objetos originales y procedencia. |
| `dist/data/plano-reference.json` | Referencia manual inicial; exclusivamente inspección y evaluación. |
| `dist/data/plano-evaluation.json` | Informe numérico reproducible con procedencia. |
| `dist/data/model-experiments.json` | Registro de modelos probados, incluido el resultado negativo. |
| `backend/inference.py` | Carga restringida de pesos, inferencia CPU, máscaras, componentes y fusión. No lee anotaciones manuales. |
| `backend/cubicasa_model.py` | Arquitectura adaptada de CubiCasa5K, con atribución y licencia. Se retiró su bootstrap de pose humana no utilizado. |
| `backend/server.py` | Servidor HTTP de interfaz y API local en `127.0.0.1:4173`. |
| `backend/model-manifest.json` | Origen, tamaño y SHA-256 de los pesos. |
| `backend/create_reference.py` | Genera las anotaciones manuales, separadas de la inferencia. |
| `backend/build_report.mjs` | Recalcula el informe y la comparación de muros con el baseline. |
| `backend/probe_cubicasa.py` | Prueba aislada del segmentador original; genera diagnósticos en `models/`. |
| `server.mjs` | Servidor estático, sin inferencia. |
| `setup-local.ps1`, `start-local.cmd` | Preparación y arranque local Windows. |
| `tests/` | Pruebas Node y fixture RGBA comprimido de la imagen real. |
| `reports/plano-evaluacion.md` | Resultados actuales y limitaciones. |
| `docs/images/` | Capturas del progreso y de la comparación. |

El esquema de predicción usa píxeles de la imagen de análisis: `width`, `height`, `wallPolygons` (`outer` y `holes`), `objects` (`category`, `bbox`, `confidence`, `source`), `structuralRegions`, `rawObjectDetections` y `provenance`. El esquema anterior de muros usa `axis`, `c`, `from`, `to` y `thickness`. Las coordenadas del mundo se obtienen con la escala configurada; Y representa altura.

La fusión actual toma aberturas y equipamiento de CubiCasa, y mobiliario de YOLO. Suprime determinadas propuestas YOLO superpuestas a equipamiento segmentado con puntuación suficiente. Son reglas explícitas, no un sistema de confianza calibrado. Los datos originales quedan en `rawObjectDetections` para inspección.

Si la IA produce cero regiones de muro, la interfaz permite un resultado híbrido con el detector geométrico; se identifica mediante `provenance.structureFallback`. En el ejemplo publicado se utiliza CubiCasa, que sí genera contornos.

## 5. Referencia y métricas actuales

Archivo original: 724 × 424 px.

SHA-256:

```text
1eaaa77811f87c7a623468c69f533e6f1221fea1f1112e60d2ca82315ed78f90
```

Referencia manual: **43 tramos de muro y 76 componentes**. Se revisaron visualmente, entre otros, el número de camas (7), sofás (4), las puertas y la definición de sus cajas. La referencia sigue pendiente de revisión independiente.

Cinco clases evaluadas, puntuación mínima 0,35, IoU de caja ≥ 0,50:

| Clase | Referencia | Detectados | Correctos | Omitidos | Sobrantes |
|---|---:|---:|---:|---:|---:|
| Puertas | 12 | 13 | 10 | 2 | 3 |
| Ventanas | 16 | 21 | 12 | 4 | 9 |
| Camas | 7 | 4 | 4 | 3 | 0 |
| Sofás | 4 | 8 | 3 | 1 | 5 |
| Mesas | 4 | 6 | 2 | 2 | 4 |

- Agregado: 31 aciertos, 21 sobrantes, 12 omisiones.
- Precisión: **59,6 %**; cobertura/recall: **72,1 %**.
- Muros: **57,3 % IoU** de la IA frente a **70,5 % IoU** del detector geométrico anterior.
- Resultado del ejemplo: 35 regiones de muro y 92 componentes propuestos con puntuación ≥ 0,35; las métricas agregadas anteriores solo incluyen las cinco clases evaluadas, no esos 92 componentes completos.

**No declarar una mejora general de precisión ni un modelo listo para producción.** El nuevo segmentador recupera estructura y categorías, pero su máscara tiene espesor irregular y menor coincidencia de área que el baseline en este plano. Persisten muebles mal clasificados, aberturas fragmentadas y omisiones. La elección y revisión se hicieron sobre el mismo ejemplo; no es un conjunto de prueba independiente.

Las cajas de puertas/ventanas representan la **huella de la abertura**, excluyendo arcos de giro; las de muebles, la huella exterior del símbolo. No comparar cajas con otra definición sin adaptar las anotaciones y reportarlo. Sillas y equipamiento son propuestas/anotaciones auxiliares, excluidas de las métricas iniciales. La puntuación del modelo no equivale a una probabilidad calibrada.

## 6. Ejecutar y reproducir

Desde la raíz del repositorio:

```powershell
# Vista estática: Node.js 20+; no necesita npm install.
npm start

# Preparación de IA en otro equipo: Python 3.12, Node.js y Windows.
.\setup-local.ps1

# IA local (detener el servidor estático antes; usan el mismo puerto).
.\start-local.cmd
# Alternativa:
npm run start:ai
```

Abrir `http://127.0.0.1:4173`. `index.html` no debe abrirse con `file://`: utiliza módulos y Web Worker. En la máquina original ya se instalaron el entorno y los pesos, pero **no forman parte del repositorio**. Para otro clon, ejecutar el instalador.

```powershell
npm test
.\.venv\Scripts\python.exe backend/inference.py --image dist/assets/plano.jpeg --output dist/data/plano-prediction.json
node backend/build_report.mjs
```

Solo regenerar `plano-reference.json` con `python backend/create_reference.py` cuando se cambien/revisen sus anotaciones. Nunca tratar ese script como un detector ni entrenar/evaluar sobre la misma imagen declarando generalización.

La escala inicial supone un ancho total de imagen de 24 m. Calibrar con dos puntos y una medida conocida; la cota superior del ejemplo indica 20,96 m. Altura de muro inicial 2,70 m; puerta 2,10 m; antepecho 0,90 m; ventana 1,20 m, con límites según la altura de muro. Son supuestos de reconstrucción, igual que la orientación y altura de los muebles.

## 7. Verificaciones completadas

- **10 pruebas Node**, todas aprobadas: imagen vacía/transparente, tramos H/V, líneas aisladas, huecos, hitos del plano real, IoU de cajas, duplicados, huecos en polígonos, identidad del archivo y separación entre predicción y referencia.
- Sintaxis de JavaScript y compilación de fuentes Python comprobadas.
- Inferencia CPU real ejecutada por CLI y mediante la interfaz/API; orden de 1–2 segundos de inferencia sobre este ejemplo después de cargar modelos. No es un benchmark de latencia general ni incluye el arranque.
- `GET /api/health` y `POST /api/analyze` comprobados; origen externo rechazado con HTTP 403.
- Carga, capas, calibración, altura, fuentes separadas, puntuación, filtros, exportaciones JSON/PNG y descarga de métricas comprobadas en navegador durante el desarrollo.
- Imagen blanca distinta, también llamada `plano.jpeg`: la versión estática desactivó IA/referencia y no reutilizó datos del ejemplo. La comparación se vincula al hash, nunca al nombre.
- Vista estática y publicación privada revisadas; evaluación visible y sin errores de consola en la última revisión.
- Los servidores temporales de QA se detuvieron al terminar; no asumir que siguen funcionando.

## 8. Límites operativos y de publicación

- No hay detección de habitaciones integrada en la interfaz, OCR de cotas, BIM/IFC, techos ni acabados automáticos.
- No hay persistencia/importación de proyectos; recargar vuelve al ejemplo. La exportación JSON sí conserva geometría, referencia, procedencia y supuestos.
- JPEG/PNG/WEBP, límite de carga 20 MB; motor Python con límite de 25 millones de píxeles y reducción del lado mayor a 1.400 px. Revisar dimensiones originales frente a coordenadas de análisis.
- Visor WebGL 2; fallback 2D si falla su creación.
- Las alturas de puertas/ventanas y colocación de catálogo son aproximadas. Las cajas y contornos no son geometría CAD validada.
- API local con el mismo origen, enlazada a `127.0.0.1`; no está diseñada para exponerla directamente a Internet.
- Los pesos se comprueban por SHA-256 antes de cargar. CubiCasa usa `torch.load(..., weights_only=True)`; YOLO restringe los globals a clases neuronales permitidas. **No sustituir esto por `weights_only=False`.**
- `.venv/`, `models/`, `third_party/`, cachés, credenciales y archivos de runtime están excluidos. No subirlos al repositorio ni al paquete estático.
- Three.js y OrbitControls están vendorizados, versión 0.180.0, con licencia MIT. Las fuentes web son opcionales y tienen fallback del sistema.

Para mantener la publicación, trabajar en el clon GitHub cuyo `origin` apunta a `Paulsaac/Blueprint_builder` y comprobar el despliegue de Pages tras el push. El checkout original `app` conserva el historial anterior y los modelos locales; no confundirlo con el clon GitHub. Las credenciales se mantienen en memoria/stdin, nunca en archivos o commits. No forzar un push ni mezclar el historial privado anterior con el público.

## 9. Modelos, atribución y derechos

- Estructura: https://github.com/CubiCasa/CubiCasa5k. Arquitectura adaptada y atribuida en `backend/cubicasa_model.py`; licencia CC BY-NC 4.0 en `backend/licenses/cubicasa-license.txt`.
- Símbolos: https://github.com/REIkd/FYP-Floorplan. Se obtuvo el checkpoint público; no se encontró una licencia explícita de esos pesos. El repositorio y el sitio no incluyen los pesos; el instalador local los descarga de su origen.
- Experimento descartado: https://huggingface.co/Yytsi/floorplan-to-3d-walls.
- Los enlaces, tamaños y hashes exactos de los modelos seleccionados están en `backend/model-manifest.json`.
- Antes de convertir esta prueba en producto comercial, resolver licencias de modelos/datos y revisar el código derivado. No añadir una licencia permisiva global que ignore la licencia del código de terceros.

## 10. Próximos pasos recomendados

1. **Revisar la referencia con una segunda persona**, fijar categorías y completar anotaciones coherentes. Crear un conjunto de planos adicionales reservados para evaluación antes de ajustar umbrales/modelos.
2. Mejorar muros: espesor, contornos, continuidad y conexiones; contrastar IoU y conectividad con el baseline, evitando optimizar solo el aspecto del ejemplo.
3. Mejorar mobiliario: confusiones entre sofás, bañeras y armarios; tres camas omitidas; clasificación y orientación. Evaluar modelos alternativos o ajuste con símbolos anotados, con separación entrenamiento/validación/prueba.
4. Revisar fusión y duplicados, especialmente regiones fragmentadas de puertas/ventanas. Medir cada cambio por clase; conservar salidas originales y comparar antes/después.
5. Asociar cada abertura con su muro; reconstruir antepechos y dinteles con supuestos explícitos, en lugar de colocar paneles solo a partir de cajas.
6. Si el usuario quiere IA para cualquier imagen desde la URL publicada, definir un backend de inferencia desplegable o estudiar ONNX/WebGPU. Hoy no está implementado; no prometerlo por el mero hecho de publicar el frontend.
7. Después: persistencia/importación de proyectos, manejo de planos inclinados/fotografiados, OCR de cotas y métricas de conectividad. Mantener el foco en reconocimiento/levantamiento, sin convertir la edición 3D en prioridad.

## 11. Primeros minutos del próximo agente

1. Leer este documento, `README.md` y `reports/plano-evaluacion.md`.
2. Inspeccionar `git status`, ramas y remotos; conservar cambios del usuario y la configuración de GitHub Pages. La publicación de Sites fue eliminada por solicitud expresa.
3. Ejecutar `npm test` y abrir la vista estática. Iniciar el servicio local solo si el trabajo necesita inferencia.
4. Confirmar el problema concreto que se va a mejorar y guardar una medición antes de cambiar algoritmos.
5. Mantener anotación manual, predicción y baseline separados. Nunca completar una predicción con las anotaciones para aparentar mayor precisión.
