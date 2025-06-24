// 1. Sahne ve Kamera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3.5);

// 2. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 3. Işıklandırma
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 3, 5);
scene.add(dir);

// 4. Küre (Dünya)
const geo = new THREE.SphereGeometry(1, 64, 64);
const loader = new THREE.TextureLoader();
const earthMat = new THREE.MeshPhongMaterial({
  map: loader.load('https://upload.wikimedia.org/wikipedia/commons/8/82/Earthmap1000x500.png'),
  specular: new THREE.Color('grey'),
  shininess: 10
});
const earth = new THREE.Mesh(geo, earthMat);
scene.add(earth);

// 5. Bulut Katmanı
const cloudMat = new THREE.MeshPhongMaterial({
  map: loader.load('https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/earthcloudmaptrans.jpg'),
  transparent: true,
  opacity: 0.4
});
const clouds = new THREE.Mesh(geo.clone(), cloudMat);
clouds.scale.set(1.01, 1.01, 1.01);
scene.add(clouds);

// 6. Dönme Animasyonu
let speed = 0.03;
let animating = true;

function animate() {
  requestAnimationFrame(animate);
  if (animating) {
    speed *= 0.99;
    earth.rotation.y += speed;
    clouds.rotation.y += speed * 1.1;

    // Türkiye yaklaşık 4.13 radian -> yavaşlayınca dur
    if (speed < 0.0005 && Math.abs((earth.rotation.y % (2*Math.PI)) - 4.13) < 0.02) {
      animating = false;
    }
  }
  renderer.render(scene, camera);
}
animate();

// 7. Yeniden Başlat İşlevi
document.getElementById('reset').onclick = () => {
  earth.rotation.y = 0;
  speed = 0.1; // hızlı başlah
  animating = true;
};

// 8. Yeniden boyutlandırma
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
