"use strict";

(() => {
  const canvas = document.querySelector("#webgl");
  const boot = document.querySelector("#boot");
  const bootValue = document.querySelector("#boot-value");
  const meter = document.querySelector("#scroll-meter-fill");
  const stateOutput = document.querySelector("#telemetry-state");
  const tag = document.querySelector("#component-tag-text");
  const soundToggle = document.querySelector("#sound-toggle");
  const soundLabel = document.querySelector("#sound-label");
  const chapters = [...document.querySelectorAll("[data-chapter]")];
  const chapterLinks = [...document.querySelectorAll(".chapter-nav a")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");

  const states = [
    { label: "Unified chassis", focus: "body" },
    { label: "Optical interface", focus: "screen" },
    { label: "Layered energy cell", focus: "battery" },
    { label: "Stabilized optical array", focus: "camera" },
    { label: "Multi-layer logic plane", focus: "board" },
    { label: "Central compute die", focus: "chip" },
    { label: "System resolved", focus: "body" }
  ];

  let currentChapter = 0;
  let targetProgress = 0;
  let smoothProgress = 0;
  let soundEnabled = false;
  let audioContext;

  const updateScroll = () => {
    const scrollRange = document.documentElement.scrollHeight - innerHeight;
    targetProgress = scrollRange > 0 ? Math.min(1, Math.max(0, scrollY / scrollRange)) : 0;
    meter.style.transform = `scaleX(${targetProgress})`;
  };

  const setChapter = (index) => {
    if (index === currentChapter && chapters[index]?.classList.contains("is-active")) return;
    currentChapter = index;
    chapters.forEach((chapter, chapterIndex) => chapter.classList.toggle("is-active", chapterIndex === index));
    chapterLinks.forEach((link, linkIndex) => {
      link.classList.toggle("is-active", linkIndex === index);
      if (linkIndex === index) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    stateOutput.textContent = chapters[index]?.dataset.state || "System online";
    tag.textContent = states[index]?.label || "Unified chassis";
    if (soundEnabled) playTone(index);
  };

  const chapterObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setChapter(Number(visible.target.dataset.chapter));
  }, { rootMargin: "-28% 0px -28%", threshold: [0.15, 0.4, 0.7] });

  chapters.forEach((chapter) => chapterObserver.observe(chapter));
  addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();
  setChapter(0);

  const playTone = (index) => {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 5 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(92 + index * 34, now);
    oscillator.frequency.exponentialRampToValueAtTime(184 + index * 26, now + .16);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.045, now + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .24);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + .25);
  };

  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    soundLabel.textContent = soundEnabled ? "Sound on" : "Sound off";
    if (soundEnabled) playTone(currentChapter);
  });

  if (!window.THREE || !canvas) {
    boot.querySelector("span").textContent = "WebGL unavailable — text mode active";
    bootValue.textContent = "TXT";
    setTimeout(() => {
      boot.classList.add("is-complete");
      document.body.classList.add("is-ready");
    }, 700);
    return;
  }

  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarsePointer.matches, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer.matches ? 1.25 : 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !coarsePointer.matches;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07090a, .055);
  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 100);
  camera.position.set(2.8, .2, 11.4);

  const rig = new THREE.Group();
  const phone = new THREE.Group();
  rig.add(phone);
  scene.add(rig);

  const roundedGeometry = (width, height, depth, radius = .32) => {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .045, bevelThickness: .045, curveSegments: 10 });
    geometry.center();
    return geometry;
  };

  const materials = {
    frame: new THREE.MeshPhysicalMaterial({ color: 0xe96f2e, metalness: .82, roughness: .24, clearcoat: .62, clearcoatRoughness: .2 }),
    back: new THREE.MeshPhysicalMaterial({ color: 0xf18547, metalness: .38, roughness: .3, clearcoat: .82, clearcoatRoughness: .22 }),
    plateau: new THREE.MeshPhysicalMaterial({ color: 0xde6427, metalness: .72, roughness: .22, clearcoat: .56 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x091315, metalness: .02, roughness: .05, transmission: .82, transparent: true, opacity: .3, thickness: .16, clearcoat: 1 }),
    display: new THREE.MeshStandardMaterial({ color: 0x091116, emissive: 0x164b5c, emissiveIntensity: .66, metalness: .1, roughness: .22 }),
    battery: new THREE.MeshPhysicalMaterial({ color: 0x282d30, metalness: .68, roughness: .32, clearcoat: .28 }),
    board: new THREE.MeshStandardMaterial({ color: 0x183f36, metalness: .48, roughness: .4 }),
    chip: new THREE.MeshPhysicalMaterial({ color: 0x0b0c0d, metalness: .75, roughness: .2, clearcoat: 1 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xd98a48, metalness: .84, roughness: .22 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x03070d, metalness: .34, roughness: .055, transmission: .32, transparent: true, opacity: .96, clearcoat: 1 }),
    lensCoating: new THREE.MeshPhysicalMaterial({ color: 0x173454, emissive: 0x071426, emissiveIntensity: .48, metalness: .16, roughness: .04, transmission: .44, transparent: true, opacity: .88, clearcoat: 1 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x111315, metalness: .78, roughness: .18, clearcoat: .72 }),
    flash: new THREE.MeshBasicMaterial({ color: 0xfff3d5, toneMapped: false }),
    glow: new THREE.MeshBasicMaterial({ color: 0xff9a54, transparent: true, opacity: .66, blending: THREE.AdditiveBlending, depthWrite: false })
  };

  const parts = {};
  const addPart = (name, mesh, z, offset) => {
    mesh.position.z = z;
    mesh.userData.baseZ = z;
    mesh.userData.basePosition = mesh.position.clone();
    mesh.userData.offset = new THREE.Vector3(...offset);
    mesh.userData.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    phone.add(mesh);
    parts[name] = mesh;
    return mesh;
  };

  const bodyAssembly = new THREE.Group();
  const unibody = new THREE.Mesh(roundedGeometry(3.24, 6.78, .42, .45), materials.frame);
  const backPanel = new THREE.Mesh(roundedGeometry(3.02, 4.86, .055, .34), materials.back);
  backPanel.position.set(0, -.72, .235);
  const cameraPlateau = new THREE.Mesh(roundedGeometry(3.08, 1.7, .17, .34), materials.plateau);
  cameraPlateau.position.set(0, 2.43, .3);
  bodyAssembly.add(unibody, backPanel, cameraPlateau);

  const logoShape = new THREE.Shape();
  logoShape.moveTo(0, -.42);
  logoShape.bezierCurveTo(-.34, -.45, -.52, -.15, -.5, .12);
  logoShape.bezierCurveTo(-.47, .42, -.26, .58, -.06, .5);
  logoShape.bezierCurveTo(.08, .44, .14, .44, .28, .5);
  logoShape.bezierCurveTo(.5, .58, .62, .34, .55, .08);
  logoShape.bezierCurveTo(.5, -.16, .34, -.4, 0, -.42);
  const logoBite = new THREE.Path();
  logoBite.absellipse(.45, .28, .16, .16, 0, Math.PI * 2, false, 0);
  logoShape.holes.push(logoBite);
  const logo = new THREE.Mesh(new THREE.ShapeGeometry(logoShape, 18), materials.black);
  logo.scale.set(.58, .58, .58);
  logo.position.set(0, -.7, .345);
  const logoLeaf = new THREE.Mesh(new THREE.CircleGeometry(.12, 20), materials.black);
  logoLeaf.scale.set(.52, 1, 1);
  logoLeaf.rotation.z = -.58;
  logoLeaf.position.set(.14, -.2, .346);
  bodyAssembly.add(logo, logoLeaf);

  const addSideButton = (width, height, x, y) => {
    const button = new THREE.Mesh(new THREE.BoxGeometry(width, height, .12), materials.plateau);
    button.position.set(x, y, 0);
    bodyAssembly.add(button);
  };
  addSideButton(.09, .6, -1.66, 1.2);
  addSideButton(.09, .86, -1.66, .24);
  addSideButton(.09, .86, -1.66, -.76);
  addSideButton(.09, 1.12, 1.66, .52);
  addSideButton(.09, .74, 1.66, -.92);

  addPart("body", bodyAssembly, -.18, [0, 0, -2.1]);
  const battery = addPart("battery", new THREE.Mesh(roundedGeometry(2.52, 4.18, .2, .26), materials.battery), -.02, [.62, -.2, -.92]);
  battery.position.y = -.45;
  battery.userData.basePosition = battery.position.clone();
  const vaporChamber = new THREE.Mesh(roundedGeometry(2.36, 1.66, .06, .18), materials.copper);
  vaporChamber.position.set(0, 1.78, .12);
  battery.add(vaporChamber);
  addPart("board", new THREE.Mesh(roundedGeometry(2.58, 1.34, .18, .18), materials.board), .12, [-.78, 1.84, .28]);
  const screen = addPart("screen", new THREE.Mesh(roundedGeometry(3.1, 6.55, .09, .42), materials.display), -.4, [-.16, .12, 2.35]);
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 512;
  screenCanvas.height = 1024;
  const screenContext = screenCanvas.getContext("2d");
  const screenGradient = screenContext.createLinearGradient(0, 0, 512, 1024);
  screenGradient.addColorStop(0, "#184d6b");
  screenGradient.addColorStop(.44, "#0a1725");
  screenGradient.addColorStop(1, "#281426");
  screenContext.fillStyle = screenGradient;
  screenContext.fillRect(0, 0, 512, 1024);
  screenContext.strokeStyle = "rgba(255,150,84,.82)";
  screenContext.lineWidth = 3;
  for (let ring = 0; ring < 5; ring += 1) {
    screenContext.beginPath();
    screenContext.ellipse(340, 430, 95 + ring * 35, 180 + ring * 55, -.48, 0, Math.PI * 2);
    screenContext.stroke();
  }
  screenContext.fillStyle = "rgba(241,239,232,.72)";
  screenContext.font = "700 18px monospace";
  screenContext.letterSpacing = "4px";
  screenContext.fillText("17 PRO MAX", 38, 72);
  screenContext.fillStyle = "#050608";
  screenContext.beginPath();
  screenContext.roundRect(176, 32, 160, 46, 23);
  screenContext.fill();
  screenContext.fillStyle = "#ff9a54";
  screenContext.fillRect(38, 920, 136, 4);
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screenSurface = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 6.18), new THREE.MeshBasicMaterial({ map: screenTexture, transparent: true, opacity: .82 }));
  screenSurface.position.z = .11;
  screen.add(screenSurface);
  addPart("glass", new THREE.Mesh(roundedGeometry(3.16, 6.62, .065, .44), materials.glass), -.52, [-.3, .2, 3.28]);

  const chip = addPart("chip", new THREE.Mesh(roundedGeometry(.82, .82, .13, .08), materials.chip), .25, [1.15, 1.55, 1.4]);
  chip.position.set(.3, 1.9, .25);
  chip.userData.basePosition = chip.position.clone();
  const chipCore = new THREE.Mesh(new THREE.BoxGeometry(.54, .54, .04), materials.glow);
  chipCore.position.z = .09;
  chip.add(chipCore);

  const cameraArray = new THREE.Group();
  cameraArray.position.set(-.62, 2.47, .49);
  cameraArray.userData.baseZ = .49;
  cameraArray.userData.basePosition = cameraArray.position.clone();
  cameraArray.userData.offset = new THREE.Vector3(-1.15, .9, 2.55);
  cameraArray.userData.name = "camera";
  [[-.34, .32], [.39, .32], [0, -.38]].forEach(([x, y], index) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.35, .38, .24, 48), materials.black);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(x, y, 0);
    barrel.castShadow = true;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .27, 48), materials.lens);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, y, .15);
    const coating = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .29, 48), materials.lensCoating);
    coating.rotation.x = Math.PI / 2;
    coating.position.set(x, y, .19);
    const iris = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .3, 32), materials.black);
    iris.rotation.x = Math.PI / 2;
    iris.position.set(x, y, .22);
    cameraArray.add(barrel, lens, coating, iris);
  });
  const flash = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .06, 32), materials.flash);
  flash.rotation.x = Math.PI / 2;
  flash.position.set(1.22, .34, .12);
  const lidar = new THREE.Mesh(new THREE.CylinderGeometry(.115, .115, .07, 32), materials.lens);
  lidar.rotation.x = Math.PI / 2;
  lidar.position.set(1.2, -.36, .12);
  const microphone = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .08, 20), materials.black);
  microphone.rotation.x = Math.PI / 2;
  microphone.position.set(.82, 0, .12);
  cameraArray.add(flash, lidar, microphone);
  phone.add(cameraArray);
  parts.camera = cameraArray;

  for (let i = 0; i < 16; i += 1) {
    const trace = new THREE.Mesh(new THREE.BoxGeometry(.06 + Math.random() * .2, .028, .025), materials.copper);
    trace.position.set((Math.random() - .5) * 2.1, 1.9 + (Math.random() - .5) * .8, .2);
    phone.add(trace);
  }

  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.7, .012, 8, 160), materials.glow);
  halo.rotation.x = Math.PI / 2;
  halo.position.z = -1.4;
  scene.add(halo);

  const particleCount = coarsePointer.matches ? 220 : 520;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const radius = 4 + Math.random() * 12;
    const angle = Math.random() * Math.PI * 2;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = (Math.random() - .5) * 12;
    particlePositions[index * 3 + 2] = Math.sin(angle) * radius - 3;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xb9d8cb, size: .018, transparent: true, opacity: .48, depthWrite: false }));
  scene.add(particles);

  scene.add(new THREE.HemisphereLight(0xcdefff, 0x172017, 1.8));
  const frontLight = new THREE.PointLight(0xf4fff9, 19, 24, 1.6);
  frontLight.position.set(4, 6, 9);
  scene.add(frontLight);
  const keyLight = new THREE.SpotLight(0xe5fff5, 90, 32, .52, .8, 1.3);
  keyLight.position.set(7, 8, 8);
  keyLight.castShadow = !coarsePointer.matches;
  scene.add(keyLight);
  const acidLight = new THREE.PointLight(0xff7d34, 42, 18, 2);
  acidLight.position.set(-5, -1, 4);
  scene.add(acidLight);
  const rimLight = new THREE.PointLight(0x4fc8ff, 28, 15, 2);
  rimLight.position.set(4, -5, 1);
  scene.add(rimLight);

  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const smoothstep = (start, end, value) => {
    const x = clamp01((value - start) / (end - start));
    return x * x * (3 - 2 * x);
  };

  const animateParts = (progress, time) => {
    const explodeIn = smoothstep(.08, .65, progress);
    const rebuild = smoothstep(.76, .96, progress);
    const explode = explodeIn * (1 - rebuild);
    const focusName = states[currentChapter]?.focus;

    Object.entries(parts).forEach(([name, part], index) => {
      const emphasis = name === focusName ? 1 : 0;
      const offset = part.userData.offset || new THREE.Vector3();
      const basePosition = part.userData.basePosition || new THREE.Vector3(part.position.x, part.position.y, part.userData.baseZ || 0);
      const drift = Math.sin(time * .00065 + index * 1.4) * .035 * explode;
      const targetX = basePosition.x + offset.x * explode + emphasis * Math.sin(time * .001) * .06;
      const targetY = basePosition.y + offset.y * explode + drift;
      const targetZ = (part.userData.baseZ || basePosition.z) + offset.z * explode + emphasis * .36;
      part.position.x += (targetX - part.position.x) * .075;
      part.position.y += (targetY - part.position.y) * .075;
      part.position.z += (targetZ - part.position.z) * .075;
      const scale = 1 + emphasis * .045;
      part.scale.lerp(new THREE.Vector3(scale, scale, scale), .08);
    });

    materials.display.emissiveIntensity = .25 + Math.sin(time * .0014) * .06 + (focusName === "screen" ? .38 : 0);
    materials.glow.opacity = .48 + Math.sin(time * .002) * .16;
  };

  const mouse = new THREE.Vector2();
  addEventListener("pointermove", (event) => {
    if (coarsePointer.matches) return;
    mouse.x = event.clientX / innerWidth - .5;
    mouse.y = event.clientY / innerHeight - .5;
  }, { passive: true });

  let isVisible = true;
  document.addEventListener("visibilitychange", () => { isVisible = !document.hidden; });

  const clock = new THREE.Clock();
  const render = (time = 0) => {
    requestAnimationFrame(render);
    if (!isVisible) return;
    const delta = Math.min(clock.getDelta(), .05);
    smoothProgress += (targetProgress - smoothProgress) * (reducedMotion.matches ? 1 : Math.min(1, delta * 4.8));
    const mobile = innerWidth < 760;
    const rebuilt = smoothstep(.76, .97, smoothProgress);
    const orbit = smoothProgress * Math.PI * 1.08;
    rig.position.x += (((mobile ? 0 : 2.15) * (1 - rebuilt) - mouse.x * .22) - rig.position.x) * .04;
    rig.position.y += ((mobile ? 1.25 : 0) + mouse.y * .18 - rig.position.y) * .04;
    phone.rotation.y += ((-.42 + orbit + mouse.x * .16) - phone.rotation.y) * .035;
    phone.rotation.x += ((-.08 + Math.sin(smoothProgress * Math.PI * 2) * .12 + mouse.y * .1) - phone.rotation.x) * .035;
    phone.rotation.z = Math.sin(time * .00038) * .018;
    camera.position.x += ((mobile ? 0 : 2.5) + Math.sin(orbit) * .55 - camera.position.x) * .03;
    camera.position.y += ((mobile ? 1.25 : .1) + Math.cos(orbit * .7) * .22 - camera.position.y) * .03;
    camera.lookAt(mobile ? 0 : 1.65, mobile ? 1.2 : 0, 0);
    particles.rotation.y += .00015;
    particles.rotation.x = smoothProgress * .08;
    halo.rotation.z += .00055;
    acidLight.position.x = -4 + Math.sin(time * .0007) * 2;
    animateParts(smoothProgress, time);
    renderer.render(scene, camera);
  };

  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < 760 ? 43 : 34;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer.matches ? 1.25 : 1.6));
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener("resize", resize, { passive: true });

  const bootStarted = performance.now();
  const advanceBoot = (now) => {
    const loadProgress = Math.min(1, (now - bootStarted) / 1050);
    bootValue.textContent = String(Math.floor(loadProgress * 100)).padStart(3, "0");
    if (loadProgress < 1) requestAnimationFrame(advanceBoot);
    else {
      boot.classList.add("is-complete");
      document.body.classList.add("is-ready");
    }
  };
  requestAnimationFrame(advanceBoot);

  render();
})();
