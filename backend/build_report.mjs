import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {evaluatePrediction,CATEGORY} from '../dist/evaluation.js';
import {detectPlan} from '../dist/detector.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const prediction=read('dist/data/plano-prediction.json'),reference=read('dist/data/plano-reference.json');
const pixels=gunzipSync(readFileSync(resolve(root,'tests/fixtures/plano.rgba.gz')));
const baseline={...detectPlan({width:724,height:424,data:pixels}),imageSha256:reference.imageSha256,objects:[]};
const result=evaluatePrediction(prediction,reference,.35),geometric=evaluatePrediction(baseline,reference,.35);
const report={...result,baselineWallIou:geometric.wallIou,imageSha256:reference.imageSha256,referenceStatus:reference.provenance.status,modelProvenance:prediction.provenance};
writeFileSync(resolve(root,'dist/data/plano-evaluation.json'),JSON.stringify(report,null,2)+'\n');
const pct=value=>value===null?'—':`${(value*100).toFixed(1)} %`;
mkdirSync(resolve(root,'reports'),{recursive:true});
writeFileSync(resolve(root,'reports/plano-evaluacion.md'),`# Ensayo 02 · plano.jpeg

Referencia manual inicial de un único plano, pendiente de revisión independiente. No se utilizó para entrenar ni completar las predicciones. Los resultados no estiman precisión sobre planos nuevos.

- Puntuación mínima: 0,35. Superposición de cajas requerida: IoU ≥ 0,50.
- Puertas y ventanas: caja de la huella de la abertura, excluyendo arcos de giro. Muebles: huella exterior del símbolo.
- Arquitectura: CubiCasa5K hourglass + YOLOv8 de símbolos, sin ajuste con este plano.
- Huella del archivo: ${reference.imageSha256}.

| Categoría | Referencia | Detectados | Correctos | Omitidos | Sobrantes | Precisión | Cobertura |
|---|---:|---:|---:|---:|---:|---:|---:|
${result.rows.map(r=>`| ${CATEGORY[r.category].label} | ${r.expected} | ${r.predicted} | ${r.tp} | ${r.fn} | ${r.fp} | ${pct(r.precision)} | ${pct(r.recall)} |`).join('\n')}

Precisión agregada de las cinco clases: ${pct(result.totals.precision)}. Cobertura: ${pct(result.totals.recall)}. Otras categorías son propuestas auxiliares y no se incluyen en estas métricas.

Muros, IoU por área de máscara: IA ${pct(result.wallIou)}; detector geométrico anterior ${pct(geometric.wallIou)}. El segmentador recupera estructura y aberturas, pero su máscara es más irregular y amplia que la anotación; la geometría anterior conserva mejor coincidencia de área en este ejemplo. No se declara una mejora general de precisión.

El primer segmentador probado (Yytsi ResNet34-UNet) produjo cero regiones de muro. Se registra en dist/data/model-experiments.json y se sustituyó por CubiCasa5K.

Persisten errores de clase entre bañeras, sofás y armarios; omisiones de camas; regiones de abertura fragmentadas; y espesor de muro irregular. Las alturas y la orientación del catálogo 3D son supuestas. El próximo ajuste debe validarse sobre más planos reservados para evaluación.
`,'utf8');
console.log(JSON.stringify({wallIou:result.wallIou,baselineWallIou:geometric.wallIou,totals:result.totals}));
