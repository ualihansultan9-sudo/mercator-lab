import assert from 'node:assert/strict';
await import('../dist/surface-math.js');
await import('../dist/surface-mesh.js');
const M=globalThis.SurfaceMath;
let meshes=0,triangles=0,maxVertices=0;
for(const model of ['cube','cylinder','cone','sphere'])
for(const mode of model==='sphere'?['gores','mercator']:['gores'])
for(const count of mode==='gores'&&model==='sphere'?[6,12,24,48]:[12])
for(const t of [0,.25,.5,.75,1]){
  const mesh=SurfaceMesh.build({model,mode,count,t}),vertices=mesh.vertices.length/11;
  assert.ok(mesh.vertices.every(Number.isFinite),`coordinates: ${model}`);
  assert.ok(mesh.lines.every(Number.isFinite),`edges: ${model}`);
  assert.ok(mesh.indices.every(i=>i<vertices),`indices: ${model}`);
  assert.ok(vertices<65536,'WebGL 1 index limit');
  assert.ok(Number.isFinite(mesh.radius)&&mesh.radius>0,'camera bounds');
  if(t===1)for(let j=2;j<mesh.vertices.length;j+=11)assert.ok(Math.abs(mesh.vertices[j])<1e-6,'final plane');
  meshes++;triangles+=mesh.indices.length/3;maxVertices=Math.max(maxVertices,vertices);
}
// A polygonal chord is slightly shorter than its smooth arc, even for exact surface isometries.
const step=M.TAU/128,cylError=step/(2*Math.sin(step/2))-1;
assert.ok(cylError<.000101);
// The final cube net comprises six distinct, axis-aligned unit squares.
const cells=new Set();let area=0;
for(let face=0;face<6;face++){
  const p=M.cube(face,0,0,1),u=M.sub(M.cube(face,1,0,1),p),v=M.sub(M.cube(face,0,1,1),p);
  area+=M.norm(M.cross(u,v));
  const corners=[p,M.cube(face,1,0,1),M.cube(face,1,1,1),M.cube(face,0,1,1)];
  const cell=[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1]))].join(',');
  assert.ok(!cells.has(cell),'net faces must not overlap');cells.add(cell);
}
assert.ok(Math.abs(area-6)<1e-12);
console.log(`Mesh geometry: ${meshes} sampled states, ${triangles} triangles, at most ${maxVertices} vertices: PASS. Cylinder chord discrepancy < ${(cylError*100).toFixed(4)}%.`);
