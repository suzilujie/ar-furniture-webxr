// Week 2 场景：放置与调整
// 相比 Week 1 新增：模式切换、点击放置、拖动移动、旋转、删除
// 未包含：XR 会话（AR 端移植）、测距、真实 glTF 模型（Week 4–5）
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createSofa, createRuler } from './furniture.js';
import { createFpsMeter } from './hud.js';
import { createInteraction, MODE } from './interaction.js';

const MODE_SHORT = { view: '视角', place: '摆放', edit: '调整' };
const ROTATE_STEP = 15; // 度

const app = {};

function initRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 关键：上限 2
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function initScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);
  scene.fog = new THREE.Fog(0x0f172a, 12, 26);
  return scene;
}

function initCamera() {
  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.05, 100
  );
  camera.position.set(3.1, 1.9, 4.0);
  return camera;
}

function initLights(scene) {
  const hemi = new THREE.HemisphereLight(0xdce6f5, 0x1b2430, 1.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(3.5, 6.0, 4.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 20;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);
  return sun;
}

// 地面与网格：地面用于射线命中，网格用于肉眼校验尺度
function initGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.98, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  const grid = new THREE.GridHelper(24, 48, 0x334155, 0x1e293b);
  grid.position.y = 0.002;
  grid.name = 'grid';
  scene.add(grid);

  return { ground, grid };
}

function initControls(camera, dom) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.45, 0);
  controls.minDistance = 1.2;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  return controls;
}

function resetCamera() {
  app.camera.position.set(3.1, 1.9, 4.0);
  app.controls.target.set(0, 0.45, 0);
  app.controls.update();
}

function updateStatus({ mode, count }) {
  document.getElementById('status').innerHTML =
    `模式：<b>${MODE_SHORT[mode]}</b>　已放置 <i>${count}</i> 件`;

  document.querySelectorAll('#toolbar button[data-mode]').forEach((b) => {
    b.classList.toggle('on', b.dataset.mode === mode);
  });
}

function bindToolbar() {
  const bar = document.getElementById('toolbar');
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.mode) {
      app.interaction.setMode(btn.dataset.mode);
      return;
    }

    const act = btn.dataset.act;
    if (act === 'rotl') app.interaction.rotateSelected(+ROTATE_STEP);
    if (act === 'rotr') app.interaction.rotateSelected(-ROTATE_STEP);
    if (act === 'del') app.interaction.deleteSelected();
    if (act === 'clear') app.interaction.clearAll();
  });
}

function bindKeys() {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    if (k === 'r') resetCamera();
    if (k === 'g') app.grid.visible = !app.grid.visible;

    // 旋转只对选中对象生效，未选中时静默忽略
    if (k === 'q') app.interaction.rotateSelected(+ROTATE_STEP);
    if (k === 'e') app.interaction.rotateSelected(-ROTATE_STEP);

    if (e.key === 'Delete' || e.key === 'Backspace') {
      app.interaction.deleteSelected();
    }
  });
}

function onResize() {
  app.camera.aspect = window.innerWidth / window.innerHeight;
  app.camera.updateProjectionMatrix();
  app.renderer.setSize(window.innerWidth, window.innerHeight);
}

function init() {
  app.renderer = initRenderer();
  app.scene = initScene();
  app.camera = initCamera();
  app.sun = initLights(app.scene);

  const { ground, grid } = initGround(app.scene);
  app.grid = grid;

  app.controls = initControls(app.camera, app.renderer.domElement);
  app.fps = createFpsMeter(document.getElementById('fps'));

  // 原型机（prototype）：不直接进场景，作为克隆来源，避免多份重复建几何体
  const prototype = createSofa();
  app.scene.add(createRuler());

  app.interaction = createInteraction({
    scene: app.scene,
    camera: app.camera,
    renderer: app.renderer,
    controls: app.controls,
    ground,
    sofaProto: prototype,
    onChange: updateStatus
  });

  // 初始摆一张，避免打开就是空地
  app.interaction.placeAt(new THREE.Vector3(0, 0, 0));
  app.interaction.setMode(MODE.VIEW);

  // VR 入口：桌面浏览器显示 "VR NOT SUPPORTED"，属预期
  document.getElementById('vr-slot').appendChild(VRButton.createButton(app.renderer));

  window.addEventListener('resize', onResize);
  bindToolbar();
  bindKeys();

  app.renderer.setAnimationLoop(() => {
    app.controls.update();
    app.interaction.update();
    app.renderer.render(app.scene, app.camera);
    app.fps.tick();
  });
}

init();
