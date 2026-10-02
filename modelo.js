import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { zipSync, strToU8 } from 'fflate';

export const specification = {
  terrace: { width: 3.20, depth: 1.64, height: 2.25, status: 'Medidas registradas' },
  wall: { length: 1.46, height: 2.25, recess: .17, status: '146 cm y sacado de 17 cm: indicación del usuario' },
  left: { length: 1.46, depth: .65, returnLength: 1.30, usefulReturn: 1.20, seatHeight: .43, backHeight: .80, status: '146 cm solicitado; resto propuesto' },
  right: { width: 1.15, depth: .60, seatHeight: .43, backHeight: .80, status: 'Volumen propuesto; sillón derecho sin medidas verificadas' },
  dining: { diameter: .65, height: .74, status: 'Propuesta' },
  picoteo: { width: .78, depth: .48, height: .43, status: 'Propuesta, tablas ampliadas' },
  ninja: { length: 1.35, maxDepth: .65, prepDepth: .35, height: 1.05, status: 'Propuesta; altura de barra y equipo por medir' },
  opening: { width: 1.20, status: 'Apertura nominal registrada; no ancho útil con muebles' },
  assumptions: ['La posición transversal del sacado se dibuja esquemáticamente, no se acota su eje de 29 cm.', 'La diferencia de 1 cm entre 146 + 17 y profundidad de 164 cm no se elimina.', 'La condensadora y Ninja son volúmenes de referencia, no modelos OEM ni encastres comprobados.', 'La geometría es una maqueta de diseño: no valida pasillos, capacidad de barra o ventilación.']
};

export const demos = {
  full: { title: 'Terraza completa', note: 'Dos opciones sobre la misma base. La geometría usa 320 × 164 × 225 cm.', camera: [1.95, 3.7, -4.8], target: [1.6, .72, .85], facts: [['320 × 164 cm', 'Planta registrada'], ['225 cm', 'Altura registrada'], ['120 cm', 'Apertura izquierda, no paso útil']] },
  shell: { title: 'Estructura y acceso', note: 'Piso, antepecho, barandas, ventanal y sacado. Forma del sacado esquemática.', camera: [1.95, 3.9, -4.6], target: [1.6, .8, .8], facts: [['146 cm', 'Pared útil'], ['17 cm', 'Sacado conservado'], ['164 cm', 'Profundidad general']] },
  wall: { title: 'Pared de madera', note: 'El panel termina con el sillón: el pequeño sacado queda fuera del tramo principal.', camera: [2.2, 1.7, -.45], target: [.05, 1.12, .88], facts: [['146 × 225 cm', 'Panel del tramo principal'], ['Plano', 'Sin nicho decorativo'], ['17 cm aparte', 'Encuentro junto al acceso']] },
  left: { title: 'Sillón izquierdo en L', note: 'Base propia sobre el piso. Dos plazas del retorno contando la esquina una sola vez.', camera: [2.45, 1.65, -.90], target: [.65, .42, .87], facts: [['146 cm', 'Tramo solicitado'], ['130 cm', 'Retorno exterior propuesto'], ['65 / 43 cm', 'Fondo / altura de asiento']] },
  right: { title: 'Sillón junto al ventanal', note: 'El respaldo queda junto al paño fijo y el asiento mira hacia el balcón.', camera: [3.85, 1.6, 2.45], target: [2.38, .4, .29], facts: [['115 × 60 cm', 'Volumen ilustrativo, por medir'], ['Hacia el exterior', 'Orientación solicitada'], ['43 cm', 'Altura propuesta de asiento']] },
  dining: { title: 'Mesa central y dos sillas', note: 'La alternativa A mantiene una mesa redonda y dos sillas de perfil ligero.', camera: [3.7, 1.9, 2.6], target: [2.0, .47, .82], facts: [['Ø 65 cm', 'Diámetro propuesto'], ['74 cm', 'Altura propuesta'], ['Dos sillas', 'Sin añadir asientos']] },
  picoteo: { title: 'Dos mesas de picoteo', note: 'Una mesa para cada zona de estar. Ambas tapas se ampliaron y tienen contornos suaves.', camera: [3.8, 2.5, 2.7], target: [1.7, .33, .67], facts: [['78 × 48 cm', 'Cada mesa, propuesta'], ['43 cm', 'Altura propuesta'], ['Dos ambientes', 'Centro y circulación por comprobar']] },
  ninja: { title: 'Mesón lateral y Ninja', note: 'Mesón en la barra derecha, con tabla y condensadora en el sector interior. Soporte conceptual.', camera: [1.65, 1.95, -.10], target: [3.3, .77, .93], facts: [['135 cm', 'Largo propuesto'], ['65 / 35 cm', 'Fondo máximo / preparación'], ['Por medir', 'Altura de barra, equipo y encastre']] }
};

function texture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d'); let seed = 71;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = kind === 'wood' ? '#bd9263' : '#e7e0d4'; ctx.fillRect(0, 0, 512, 512);
  if (kind === 'wood') {
    for (let i = 0; i < 1000; i++) {
      const x = rnd() * 512; ctx.strokeStyle = 'rgba(' + (80 + rnd()*80|0) + ',65,36,' + (.02 + rnd()*.09) + ')'; ctx.lineWidth = .4 + rnd()*1.4; ctx.beginPath(); ctx.moveTo(x, 0);
      for (let y=0; y<=512; y+=32) ctx.lineTo(x + Math.sin(y*.024 + i)*3, y); ctx.stroke();
    }
  } else {
    for (let i=0; i<512; i+=2) { ctx.strokeStyle = i%4 ? '#dad2c7' : '#f2ede4'; ctx.globalAlpha = .3; ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(kind === 'wood' ? 1 : 5, kind === 'wood' ? 1 : 5); return t;
}

export function createStudio(container, onChange) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-label', 'Modelo tridimensional de la terraza. Arrastra para girar y usa la rueda para acercarte.');
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e8e1d4');
  const camera = new THREE.PerspectiveCamera(37, 1, .01, 100);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = .5; controls.maxDistance = 12; controls.maxPolarAngle = Math.PI * .49;
  const pmrem = new THREE.PMREMGenerator(renderer); const env = new RoomEnvironment(); scene.environment = pmrem.fromScene(env, .04).texture; env.dispose(); pmrem.dispose();
  const hemi = new THREE.HemisphereLight('#fff7e8', '#908575', 2.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d0', 3.2); sun.position.set(-1, 6, 4); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.015; scene.add(sun);
  const fill = new THREE.DirectionalLight('#edf5ff', 1.1); fill.position.set(4, 3, -3); scene.add(fill);
  const woodMap = texture('wood'), clothMap = texture('cloth');
  const mat = {
    oak: new THREE.MeshStandardMaterial({ color: '#c09c73', map: woodMap, roughness: .65 }),
    floor: new THREE.MeshStandardMaterial({ color: '#a78363', map: woodMap, roughness: .72 }),
    darkOak: new THREE.MeshStandardMaterial({ color: '#926a44', map: woodMap, roughness: .65 }),
    linen: new THREE.MeshStandardMaterial({ color: '#f2ebdd', map: clothMap, bumpMap: clothMap, bumpScale: .002, roughness: .96 }),
    sage: new THREE.MeshStandardMaterial({ color: '#78836b', map: clothMap, roughness: .97 }),
    clay: new THREE.MeshStandardMaterial({ color: '#b06b48', map: clothMap, roughness: .95 }),
    plaster: new THREE.MeshStandardMaterial({ color: '#d7c8b3', roughness: .94 }),
    porcelain: new THREE.MeshStandardMaterial({ color: '#eee4d2', roughness: .47 }),
    metal: new THREE.MeshStandardMaterial({ color: '#292d2a', metalness: .7, roughness: .42 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b79a58', metalness: .7, roughness: .35 }),
    grill: new THREE.MeshStandardMaterial({ color: '#485054', metalness: .62, roughness: .34 }),
    white: new THREE.MeshStandardMaterial({ color: '#ecece5', roughness: .58 }),
    glow: new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#ffb34f', emissiveIntensity: .6, roughness: .8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#c6d7d0', transparent: true, opacity: .15, roughness: .12, metalness: .05, depthWrite: false }),
    leaf: new THREE.MeshStandardMaterial({ color: '#527354', roughness: .86, side: THREE.DoubleSide })
  };
  Object.values(mat).forEach(m => { if (m.map) m.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); });
  const groups = {}; for (const id of ['shell','wall','left','right','dining','picoteo','ninja']) { groups[id] = new THREE.Group(); groups[id].name=id; groups[id].scale.x=-1; scene.add(groups[id]); }
  const cushionParts = [];
  function box(g,w,h,d,x,y,z,m=mat.oak,round=.012) {
    const geo = round ? new RoundedBoxGeometry(w,h,d,3,Math.min(round,w/4,h/4,d/4)) : new THREE.BoxGeometry(w,h,d);
    const mesh = new THREE.Mesh(geo,m); mesh.position.set(x,y,z); mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh); return mesh;
  }
  function cylinder(g,rt,rb,h,x,y,z,m=mat.oak,segments=48) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh; }
  function rod(g,a,b,r=.008,m=mat.metal) { const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),mesh=cylinder(g,r,r,va.distanceTo(vb),...va.clone().add(vb).multiplyScalar(.5).toArray(),m,12);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return mesh; }
  function cushion(g,w,h,d,x,y,z,m=mat.linen) { const mesh=box(g,w,h,d,x,y,z,m,.045);cushionParts.push({mesh,y});return mesh; }
  function pillow(g,x,y,z,m,rot=0) { const mesh=cushion(g,.27,.29,.105,x,y,z,m);mesh.rotation.z=rot;mesh.rotation.x=-.12;return mesh; }
  function plant(g,x,y,z,size=.20) {
    cylinder(g,size*.35,size*.29,size*.75,x,y+size*.375,z,mat.porcelain,32);
    for(let i=0;i<14;i++){const a=i*2.399,py=y+size*.65+(i%4)*size*.18;rod(g,[x,y+size*.7,z],[x+Math.cos(a)*size*.65,py+size*.2,z+Math.sin(a)*size*.65],.0025,mat.leaf);const leaf=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),mat.leaf);leaf.scale.set(.5,1.7,.22);leaf.position.set(x+Math.cos(a)*size*.65,py+size*.24,z+Math.sin(a)*size*.65);leaf.rotation.set(.5,a,.7);g.add(leaf);}
  }
  function cup(g,x,y,z){cylinder(g,.028,.024,.05,x,y+.025,z,mat.porcelain,24);const ring=new THREE.Mesh(new THREE.TorusGeometry(.015,.004,8,16),mat.porcelain);ring.position.set(x+.029,y+.027,z);g.add(ring);}
  function bowl(g,x,y,z){const bowlMesh=new THREE.Mesh(new THREE.SphereGeometry(.047,24,16,0,Math.PI*2,Math.PI/2,Math.PI/2),mat.sage);bowlMesh.position.set(x,y+.033,z);g.add(bowlMesh);for(let i=0;i<8;i++) {const olive=new THREE.Mesh(new THREE.SphereGeometry(.01,12,8),mat.sage);olive.position.set(x+Math.sin(i*2.4)*.029,y+.036,z+Math.cos(i*2.4)*.029);g.add(olive);}}
  // Shell: roof is intentionally hidden by default for readable cutaway views.
  box(groups.shell,3.2,.08,1.64,1.6,-.04,.82,mat.plaster,0);
  for(let r=0;r<5;r++)for(let col=0;col<6;col++)box(groups.shell,.53,.012,.325,.265+col*.534,.007,.163+r*.328,mat.floor,.004);
  box(groups.shell,3.2,.90,.12,1.6,.45,1.70,mat.plaster,0);
  box(groups.shell,.45,.08,1.70,3.425,-.035,.85,mat.plaster,0);
  box(groups.shell,.10,2.25,1.70,3.70,1.125,.85,mat.plaster,0);
  box(groups.shell,.10,2.25,.17,.01,1.125,.095,mat.plaster,0);
  const glazingStart=groups.shell.children.length;
  box(groups.shell,2,.02,.03,2.2,.015,-.035,mat.metal,0);
  box(groups.shell,2,2.22,.012,2.2,1.125,-.06,mat.glass,0);
  for(const x of [1.2,2.2,3.2])box(groups.shell,.027,2.25,.036,x,1.125,-.055,mat.metal,.002);
  box(groups.shell,3.2,.03,.04,1.6,2.235,-.055,mat.metal,.002);
  const glazingParts=groups.shell.children.slice(glazingStart);
  const roof=box(groups.shell,3.2,.08,1.64,1.6,2.29,.82,mat.plaster,0);roof.visible=false;
  for(const y of [1.03,1.20])box(groups.shell,3.2,.035,.045,1.6,y,1.66,mat.metal,.004);
  for(const x of [.03,.85,1.65,2.45,3.17])box(groups.shell,.025,.27,.025,x,1.13,1.66,mat.metal,.003);
  const meshLines=[];for(let x=0;x<=2.4;x+=.13)meshLines.push(x,1.2,1.66,x+.8,2.24,1.66);for(let x=.8;x<=3.2;x+=.13)meshLines.push(x,1.2,1.66,x-.8,2.24,1.66);
  const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(meshLines,3));const guard=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:'#b4aea1',transparent:true,opacity:.35}));groups.shell.add(guard);
  // Left wall is exactly 1.46 m; the 0.17 m entrance jog is separate.
  box(groups.wall,.10,2.25,1.46,-.05,1.125,.91,mat.plaster,0);
  box(groups.wall,.012,2.25,1.46,.006,1.125,.91,mat.darkOak,0);
  for(let z=.195;z<1.64;z+=.04)box(groups.wall,.017,2.25,.028,.02,1.125,z,mat.oak,.001);
  box(groups.wall,.13,.025,.68,.08,1.36,.90,mat.oak,.004);
  plant(groups.wall,.09,1.375,.70,.12);plant(groups.wall,.09,1.375,1.08,.13);
  for(const z of [.42,1.34]){box(groups.wall,.04,.23,.035,.055,1.69,z,mat.brass,.008);box(groups.wall,.035,.13,.04,.08,1.69,z,mat.glow,.008);}
  // Left sofa: union of two floor-supported branches, corner counted once.
  box(groups.left,.65,.075,1.46,.325,.275,.91,mat.oak,.009);
  box(groups.left,1.30,.075,.65,.65,.275,1.315,mat.oak,.009);
  for(const p of [[.07,.24],[.57,.24],[.07,1.57],[.57,1.57],[1.23,1.57],[1.23,1.06]])box(groups.left,.045,.24,.045,p[0],.12,p[1],mat.oak,.007);
  cushion(groups.left,.555,.12,.79,.3675,.37,.58);
  cushion(groups.left,.59,.12,.53,.395,.37,1.305);cushion(groups.left,.59,.12,.53,.995,.37,1.305);
  cushion(groups.left,.095,.39,1.45,.053,.605,.91);cushion(groups.left,1.21,.39,.095,.695,.605,1.588);
  box(groups.left,.59,.035,.035,.35,.63,.205,mat.oak,.009);box(groups.left,.035,.34,.035,.627,.46,.205,mat.oak,.009);
  pillow(groups.left,.18,.56,.44,mat.sage,-.08);pillow(groups.left,.30,.56,1.48,mat.clay,.08);pillow(groups.left,.96,.56,1.48,mat.sage,-.09);
  const throwLeft=box(groups.left,.35,.025,.38,.42,.445,.39,mat.sage,.008);throwLeft.rotation.z=.025;box(groups.left,.36,.26,.023,.43,.32,.225,mat.sage,.007);
  // Right sofa footprint is a proposal, clearly labelled in the UI.
  box(groups.right,1.15,.09,.60,2.375,.265,.30,mat.oak,.02);
  for(const x of [1.87,2.88])for(const z of [.07,.53])box(groups.right,.045,.22,.045,x,.11,z,mat.oak,.009);
  cushion(groups.right,.495,.12,.46,2.10,.37,.337);cushion(groups.right,.495,.12,.46,2.65,.37,.337);
  cushion(groups.right,1.11,.39,.105,2.375,.605,.065);
  for(const x of [1.83,2.92])box(groups.right,.055,.26,.53,x,.49,.31,mat.oak,.013);
  pillow(groups.right,2.00,.57,.20,mat.sage,.08);pillow(groups.right,2.73,.57,.19,mat.clay,-.12);box(groups.right,.29,.022,.44,2.60,.444,.37,mat.sage,.01);box(groups.right,.29,.24,.02,2.60,.32,.59,mat.sage,.008);
  plant(groups.right,3.05,0,.34,.30);
  function coffee(g,x,z,w,d,m){const top=cylinder(g,.5,.5,.035,x,.4125,z,m);top.scale.set(w,1,d);for(const dx of [-w*.25,w*.25])cylinder(g,.07,.075,.38,x+dx,.19,z,mat.oak,36);cup(g,x-.13,.431,z-.06);bowl(g,x+.13,.431,z+.02);}
  coffee(groups.picoteo,1.17,.50,.78,.48,mat.porcelain);coffee(groups.picoteo,2.33,.94,.78,.48,mat.darkOak);
  cylinder(groups.dining,.325,.325,.035,2.0,.7225,.94,mat.porcelain,80);
  cylinder(groups.dining,.13,.15,.70,2.0,.35,.94,mat.oak,64);
  for(let i=0;i<28;i++){const a=i*Math.PI*2/28;box(groups.dining,.012,.66,.012,2+Math.cos(a)*.146,.35,.94+Math.sin(a)*.146,mat.darkOak,.002);}
  function chair(x,z,angle){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;groups.dining.add(g);cushion(g,.42,.07,.39,0,.445,0);for(const xx of [-.17,.17])for(const zz of [-.15,.15])box(g,.025,.42,.025,xx,.21,zz,mat.oak,.004);const pts=[];for(let i=0;i<=20;i++){const a=Math.PI*i/20;pts.push(new THREE.Vector3(Math.cos(a)*.245,.77,Math.sin(a)*.21-.14));}const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.028,10,false);const back=new THREE.Mesh(geo,mat.oak);g.add(back);for(const xx of [-.215,.215])box(g,.025,.30,.025,xx,.62,-.14,mat.oak,.004);}
  chair(1.53,.79,-Math.PI/2);chair(2.47,.79,Math.PI/2);cup(groups.dining,1.90,.741,.93);cup(groups.dining,2.09,.741,.98);plant(groups.dining,2.0,.742,1.05,.105);
  // Counter: proposed footprint with a narrower preparation section.
  const counterShape=new THREE.Shape();counterShape.moveTo(3.15,.29);counterShape.lineTo(3.50,.29);counterShape.lineTo(3.50,.76);counterShape.lineTo(3.65,.76);counterShape.lineTo(3.65,1.64);counterShape.lineTo(3.0,1.64);counterShape.lineTo(3.0,.76);counterShape.lineTo(3.15,.76);counterShape.closePath();
  const geo=new THREE.ExtrudeGeometry(counterShape,{depth:.028,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,steps:1});geo.rotateX(Math.PI/2);geo.translate(0,1.05,0);
  const counter=new THREE.Mesh(geo,mat.porcelain);counter.castShadow=counter.receiveShadow=true;groups.ninja.add(counter);
  box(groups.ninja,.04,.045,1.35,3.19,1.015,.965,mat.metal,.004);
  for(const z of [.44,.93,1.43]){box(groups.ninja,.045,.13,.055,3.19,1.01,z,mat.metal,.004);rod(groups.ninja,[3.18,.83,z],[3.46,1.015,z],.012);}
  const grillGroup=new THREE.Group();grillGroup.position.set(3.325,1.065,1.34);grillGroup.rotation.y=-Math.PI/2;groups.ninja.add(grillGroup);
  box(grillGroup,.52,.095,.51,0,.0475,0,mat.metal,.045);box(grillGroup,.46,.275,.43,0,.225,0,mat.grill,.10);
  box(grillGroup,.43,.075,.038,0,.078,.26,mat.metal,.007);cylinder(grillGroup,.047,.047,.035,0,.39,0,mat.grill);rod(grillGroup,[-.15,.23,.255],[.15,.23,.255],.011,mat.brass);
  const knob=cylinder(grillGroup,.025,.025,.018,-.15,.105,.287,mat.metal,32);knob.rotation.x=Math.PI/2;
  box(grillGroup,.15,.025,.007,.04,.108,.281,mat.white,.003);
  box(groups.ninja,.27,.024,.22,3.32,1.081,.51,mat.oak,.009);rod(groups.ninja,[3.25,1.102,.46],[3.37,1.102,.55],.005,mat.metal);
  box(groups.ninja,.41,.50,.68,3.45,.51,.42,mat.white,.025);
  const fan=new THREE.Mesh(new THREE.TorusGeometry(.19,.012,12,64),mat.metal);fan.rotation.y=Math.PI/2;fan.position.set(3.239,.51,.42);groups.ninja.add(fan);
  for(let i=0;i<16;i++){const a=i*Math.PI*2/16;rod(groups.ninja,[3.232,.51,.42],[3.232,.51+Math.sin(a)*.175,.42+Math.cos(a)*.175],.003,mat.metal);}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#e8e1d4',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.082;floor.receiveShadow=true;scene.add(floor);
  let mode='full',variant='B',exploded=false,showRoof=false;
  function frameVisible(){
    const bounds=new THREE.Box3();for(const group of Object.values(groups))if(group.visible)bounds.union(new THREE.Box3().setFromObject(group));
    const center=bounds.getCenter(new THREE.Vector3()),direction=camera.position.clone().sub(controls.target).normalize(),right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize(),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));let distance=0;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new THREE.Vector3(x,y,z).sub(center),depth=v.dot(direction);distance=Math.max(distance,depth+Math.abs(v.dot(up))/tan,depth+Math.abs(v.dot(right))/(tan*camera.aspect));}
    camera.position.copy(center).addScaledVector(direction,distance*1.12);controls.target.copy(center);controls.update();
  }
  function select(id, nextVariant=variant){
    if(!demos[id])id='full';mode=id;variant=nextVariant;for(const [key,g]of Object.entries(groups))g.visible=id==='full'?(key!=='dining'&&key!=='picoteo'||key===(variant==='A'?'dining':'picoteo')):key===id||(id==='shell'&&key==='wall');
    glazingParts.forEach(part=>part.visible=id==='shell');roof.visible=showRoof&&groups.shell.visible;
    const d=demos[id];camera.position.set(-d.camera[0],d.camera[1],d.camera[2]);controls.target.set(-d.target[0],d.target[1],d.target[2]);controls.update();frameVisible();onChange?.({mode,variant,demo:d});return d;
  }
  function setExploded(value){exploded=value;for(const part of cushionParts)part.mesh.position.y=part.y+(value?.24:0);}
  function setRoof(value){showRoof=value;roof.visible=value&&groups.shell.visible;}
  function view(name){const positions={general:[1.95,3.7,-4.8],entry:[1.6,1.9,-2.6],outside:[4.4,3.4,4.5],top:[1.6,6,.821]};const position=positions[name]||positions.general;camera.position.set(-position[0],position[1],position[2]);controls.target.set(-1.6,.65,.82);controls.update();frameVisible();}
  function resize(){const r=container.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(container);
  let stopped=false,visible=true;const visibility=new IntersectionObserver(entries=>visible=entries[0].isIntersecting);visibility.observe(container);function tick(){if(stopped)return;if(visible&&!document.hidden){controls.update();renderer.render(scene,camera);}requestAnimationFrame(tick);}resize();select('full','B');tick();
  let exportRenderer;
  async function pngFor(id, v, preserveView=false){
    const prior={mode,variant,exploded,pos:camera.position.clone(),target:controls.target.clone()};select(id,v);setExploded(false);if(preserveView){camera.position.copy(prior.pos);controls.target.copy(prior.target);controls.update();}
    if(!exportRenderer){exportRenderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});exportRenderer.setPixelRatio(1);exportRenderer.setSize(1920,1080);exportRenderer.shadowMap.enabled=true;exportRenderer.shadowMap.type=THREE.PCFSoftShadowMap;exportRenderer.toneMapping=renderer.toneMapping;exportRenderer.toneMappingExposure=renderer.toneMappingExposure;}
    const exportCamera=camera.clone();exportCamera.aspect=16/9;exportCamera.updateProjectionMatrix();exportRenderer.render(scene,exportCamera);
    const blob=await new Promise(resolve=>exportRenderer.domElement.toBlob(resolve,'image/png'));
    select(prior.mode,prior.variant);setExploded(prior.exploded);camera.position.copy(prior.pos);controls.target.copy(prior.target);controls.update();
    if(!blob)throw Error('No se pudo crear el PNG.');return blob;
  }
  async function downloadPng(){const blob=await pngFor(mode,variant,true);await save(blob,'Terraza_'+mode+'_'+variant+'_1920x1080.png');}
  async function downloadKit(progress){
    const pairs=[['full','A'],['full','B'],['shell','B'],['wall','B'],['left','B'],['right','B'],['dining','A'],['picoteo','B'],['ninja','B']];const files={};
    for(let i=0;i<pairs.length;i++){progress?.(i,pairs.length);const [id,v]=pairs[i];const blob=await pngFor(id,v);files['FullHD/'+String(i+1).padStart(2,'0')+'_'+id+'_'+v+'_1920x1080.png']=new Uint8Array(await blob.arrayBuffer());}
    files['Medidas_propuestas.json']=strToU8(JSON.stringify(specification,null,2));files['LEEME.txt']=strToU8('Terraza Santiago · demos de maqueta 3D\n9 imágenes PNG renderizadas directamente en 1920 × 1080 píxeles. No son ampliaciones de los renders IA.\nLas imágenes son demos de geometría de diseño, no modelos OEM ni planos de fabricación. Las medidas propuestas/ilustrativas están en el JSON.\nLos renders IA de ambientación se entregan por separado con su resolución nativa.\n');
    const zip=zipSync(files,{level:0});await save(new Blob([zip],{type:'application/zip'}),'Terraza_Demos_FullHD_1920x1080.zip');progress?.(pairs.length,pairs.length);
  }
  return {select,view,setExploded,setRoof,downloadPng,downloadKit,specification,getState:()=>({mode,variant}),destroy:()=>{stopped=true;observer.disconnect();visibility.disconnect();controls.dispose();renderer.dispose();exportRenderer?.dispose();}};
}

export async function save(blob,name){const previous=document.getElementById('last-export-link');if(previous){URL.revokeObjectURL(previous.href);previous.remove();}const url=URL.createObjectURL(blob),a=document.createElement('a');a.id='last-export-link';a.className='text-link';a.href=url;a.download=name;a.textContent='Volver a descargar: '+name;const status=document.getElementById('export-status');if(status)status.after(a);else document.body.appendChild(a);a.click();}
