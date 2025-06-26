// === THREE.JS DÜNYA ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3.5);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 3, 5);
scene.add(dir);

const geo = new THREE.SphereGeometry(1, 64, 64);
const loader = new THREE.TextureLoader();

const earthTexture = loader.load("https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg");
const cloudTexture = loader.load("https://raw.githubusercontent.com/turban/webgl-earth/master/images/fair_clouds_4k.png");

const earthMat = new THREE.MeshPhongMaterial({
  map: earthTexture,
  specular: new THREE.Color("white"),
  shininess: 30,
});
const earth = new THREE.Mesh(geo, earthMat);
scene.add(earth);

const cloudMat = new THREE.MeshPhongMaterial({
  map: cloudTexture,
  transparent: true,
  opacity: 0.4,
});
const clouds = new THREE.Mesh(geo.clone(), cloudMat);
clouds.scale.set(1.02, 1.02, 1.02);
clouds.renderOrder = 1;
scene.add(clouds);

let speed = 0.08;
let animating = true;
const mapContainer = document.getElementById("map-container");
const resetButton = document.getElementById("reset");

function animate() {
  requestAnimationFrame(animate);
  if (animating) {
    speed *= 0.985;
    earth.rotation.y += speed;
    clouds.rotation.y += speed * 1.1;
    if (speed < 0.001) {
      speed = 0;
      const currentRotation = (earth.rotation.y % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const targetRotation = 4.72;
      if (Math.abs(currentRotation - targetRotation) < 0.1) {
        animating = false;
        mapContainer.classList.add("open");
        initMap();
      } else {
        earth.rotation.y = targetRotation;
        animating = false;
        mapContainer.classList.add("open");
        initMap();
      }
    }
  }
  renderer.render(scene, camera);
}
animate();

resetButton.onclick = () => {
  earth.rotation.y = 0;
  speed = 0.08;
  animating = true;
  mapContainer.classList.remove("open");
  document.getElementById("message").style.display = "none";
};

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// === OpenTripMap API key ===
const apiKey = "5ae2e3f221c38a28845f05b62b9976b13cad50396fd954080675060c";

// OpenTripMap'den gezilecek yerleri çek
async function fetchPlaces(lat, lon, radius = 10000) {
  const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("API isteği başarısız");
    const data = await res.json();
    return data.features.map(f => f.properties.name).filter(n => n);
  } catch (e) {
    console.error(e);
    return [];
  }
}

// === LEAFLET HARİTA ===
function initMap() {
  const cities = {
    "Ankara": [39.93, 32.85],
    "Istanbul": [41.0082, 28.9784],
    "Izmir": [38.4237, 27.1428],
    "Kayseri": [38.7312, 35.4787],
    "Antalya": [36.8841, 30.7056],
    "Trabzon": [41.0027, 39.7178],
    "Gaziantep": [37.0662, 37.3833],
    "Van": [38.4952, 43.3839],
    "Diyarbakir": [37.9144, 40.2306],
    "Bursa": [40.1958, 29.06]
  };

  const start = document.getElementById("start");
  const end = document.getElementById("end");
  const message = document.getElementById("message");
  const startMoveBtn = document.getElementById("startMove");

  const routeInfo = document.getElementById("routeInfo");
  const infoStart = document.getElementById("infoStart");
  const infoEnd = document.getElementById("infoEnd");
  const infoDuration = document.getElementById("infoDuration");
  const poiList = document.getElementById("poiList");
  const closePopup = document.getElementById("closePopup");

  Object.keys(cities).forEach(city => {
    const opt1 = new Option(city, city);
    const opt2 = new Option(city, city);
    start.add(opt1);
    end.add(opt2);
  });

  const map = L.map('map').setView([39.0, 35.0], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  let routeControl;
  let marker;
  let latlngs = [];
  let i = 0;
  let animationId;
  let routeDuration = 0; // saniye cinsinden
  let selectedStart = "";
  let selectedEnd = "";

  function animateMarker() {
    if (i >= latlngs.length) {
      message.style.display = 'block';
      setTimeout(() => message.style.display = 'none', 3000);
      startMoveBtn.disabled = true;
      return;
    }
    marker.setLatLng(latlngs[i]);
    i += 2;
    animationId = requestAnimationFrame(animateMarker);
  }

  function showRoute() {
    if (start.value === end.value) {
      startMoveBtn.disabled = true;
      return;
    }
    if (routeControl) map.removeControl(routeControl);
    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
    cancelAnimationFrame(animationId);
    i = 0;
    latlngs = [];
    startMoveBtn.disabled = true;
    routeDuration = 0;

    const carIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/1048/1048315.png",
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const startIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
      iconSize: [30, 40],
      iconAnchor: [15, 40]
    });

    const endIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252031.png",
      iconSize: [30, 40],
      iconAnchor: [15, 40]
    });

    routeControl = L.Routing.control({
      waypoints: [
        L.latLng(...cities[start.value]),
        L.latLng(...cities[end.value])
      ],
      createMarker: (index, wp) => {
        if (index === 0) return L.marker(wp.latLng, { icon: startIcon });
        if (index === 1) return L.marker(wp.latLng, { icon: endIcon });
        return L.marker(wp.latLng);
      },
      addWaypoints: false,
      show: false,
      fitSelectedRoutes: true
    }).addTo(map).on('routesfound', e => {
      latlngs = e.routes[0].coordinates.map(c => [c.lat, c.lng]);
      routeDuration = e.routes[0].summary.totalTime; // saniye
      selectedStart = start.value;
      selectedEnd = end.value;

      marker = L.marker(latlngs[0], { icon: carIcon }).addTo(map);
      startMoveBtn.disabled = false;
    });
  }

  start.onchange = showRoute;
  end.onchange = showRoute;

  startMoveBtn.onclick = async () => {
    if (!marker || latlngs.length === 0) return;
    startMoveBtn.disabled = true;
    animateMarker();

    infoStart.textContent = selectedStart;
    infoEnd.textContent = selectedEnd;
    infoDuration.textContent = (routeDuration / 3600).toFixed(2);

    poiList.innerHTML = "<li>Yükleniyor...</li>";
    routeInfo.style.display = "block";

    const startCoords = cities[selectedStart];
    const endCoords = cities[selectedEnd];

    const [startPlaces, endPlaces] = await Promise.all([
      fetchPlaces(startCoords[0], startCoords[1]),
      fetchPlaces(endCoords[0], endCoords[1]),
    ]);

    poiList.innerHTML = "";
    const allPlaces = [...new Set([...startPlaces, ...endPlaces])];
    if (allPlaces.length === 0) {
      poiList.innerHTML = "<li>Yakın çevrede gezilecek yer bulunamadı.</li>";
    } else {
      allPlaces.forEach(place => {
        const li = document.createElement("li");
        li.textContent = place;
        poiList.appendChild(li);
      });
    }
  };

  closePopup.onclick = () => {
    routeInfo.style.display = "none";
  };
}
