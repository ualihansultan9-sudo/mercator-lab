import '../dist/math.js';
import assert from 'node:assert/strict';
const M=globalThis.MercatorMath;
const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
for(const [lat,K] of [[0,1],[45,2],[60,4],[75,8+4*Math.sqrt(3)]]){near(M.local(lat).K,K);near(M.local(-lat).K,K);}
assert.ok(M.local(89.999).K>1e9);assert.throws(()=>M.local(90));assert.throws(()=>M.local(NaN));
near(M.local(45,0).K,M.local(45,170).K);near(M.local(0).y,0);
for(const lat of [0,30,60,80])for(const area of [100,1000,100000]){
 const s=M.strip(lat,area);near(M.R**2*(s.lonWidth*M.RAD)*(Math.sin(s.high*M.RAD)-Math.sin(s.low*M.RAD)),area,1e-6);
 assert.ok(s.K>=s.localK-1e-10);const eps=1e-5,p=lat*M.RAD;
 const dy=(M.local(lat+eps).y-M.local(lat-eps).y)/(2*eps*M.RAD*M.R);near(dy,M.local(lat).k,1e-7);
}
// Independent known spherical triangle: three orthogonal unit vectors, area pi/2 R².
// Non-polar octant is a 90-degree rotation of the coordinate octant.
const tri={type:'Polygon',coordinates:[[[0,0],[90,0],[45,Math.atan(Math.SQRT2)*180/Math.PI],[0,0]]]};
// Analytic spherical excess for this triangle via l'Huilier.
const va=p=>[Math.cos(p[1]*M.RAD)*Math.cos(p[0]*M.RAD),Math.cos(p[1]*M.RAD)*Math.sin(p[0]*M.RAD),Math.sin(p[1]*M.RAD)];
const pts=tri.coordinates[0].slice(0,3).map(va), sides=pts.map((p,i)=>Math.acos(p.reduce((s,x,j)=>s+x*pts[(i+1)%3][j],0))), s=sides.reduce((a,b)=>a+b)/2;
const exact=4*Math.atan(Math.sqrt(Math.tan(s/2)*sides.reduce((a,b)=>a*Math.tan((s-b)/2),1)))*M.R**2;
near(M.boundaryAreas(tri,.01).sphere/exact,1,1e-7);
const shifted={type:'Polygon',coordinates:[tri.coordinates[0].map(([x,y])=>[M.wrap(x+160),y])]};
near(M.boundaryAreas(tri,.05).plane/M.boundaryAreas(shifted,.05).plane,1,1e-10);
console.log('PASS: anchor values, symmetry, pole rejection, monotonicity limit, Mercator derivative, equal-area cells, independent spherical excess, antimeridian invariance.');
