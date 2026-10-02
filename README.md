# Terraza Santiago

Estudio final de terraza cozy con dos alternativas, ocho demos 3D interactivos, ocho planos vectoriales, ocho imágenes de ambientación y nueve vistas de maqueta Full HD.

**Abrir online:** https://josetomasayalams-rgb.github.io/terraza-santiago/

## Móvil

Diseño adaptable. Arrastrar con un dedo para girar y pellizcar con dos dedos para acercarse. Controles táctiles, planos ampliables y descargas de originales. Se requiere un navegador con WebGL para el visor interactivo; los PNG y SVG están disponibles independientemente del visor.

## Calidad y medidas

Los nueve demos de maqueta son PNG nativos de 1920 × 1080. Los ocho renders IA de ambientación conservan sus 1672 × 941 píxeles. Ver Entrega_y_calidad.md y Registro_calidad.json. Las cotas registradas se distinguen de dimensiones propuestas; estos archivos no certifican fabricación ni montaje.

## Desarrollo

El sitio se sirve estáticamente con GitHub Pages. El bundle y los recursos se incluyen, sin CDN ni servidor de aplicación.

```sh
npm ci
npm run build
npm run serve
```

Abrir http://127.0.0.1:8771/. index.html y Estudio_terraza.html muestran el mismo estudio. La copia original y las revisiones anteriores se conservan fuera de este repositorio.

Three.js y fflate conservan sus licencias en vendor/.
