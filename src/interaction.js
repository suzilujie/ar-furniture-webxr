// 放置与调整交互（placement & edit interaction）
// 设计原则：用「显式模式切换」而不是「智能识别手势」
//   理由：拖动、旋转、移动相机在触摸屏上会互相抢占事件，
//         智能识别在 Week 2 阶段一定调不准，模式按钮更可靠。
import * as THREE from 'three';

export const MODE = { VIEW: 'view', PLACE: 'place', EDIT: 'edit' };

const MODE_LABEL = {
  view: '视角（View）— 拖动旋转、滚轮缩放',
  place: '摆放（Place）— 点击地面放下家具',
  edit: '调整（Edit）— 拖动家具移动，Q/E 旋转'
};

function makeGhost(proto) {
  const ghost = proto.clone(true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa, transparent: true, opacity: 0.35, depthWrite: false
  });
  ghost.traverse((o) => {
    if (o.isMesh) {
      o.material = mat;
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  ghost.visible = false;
  ghost.name = 'ghost';
  return ghost;
}

function makeRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.72, 48),
    new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  ring.visible = false;
  ring.name = 'selection-ring';
  return ring;
}

export function createInteraction({ scene, camera, renderer, controls, ground, sofaProto, onChange }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const dom = renderer.domElement;

  const ghost = makeGhost(sofaProto);
  scene.add(ghost);

  const ring = makeRing();
  scene.add(ring);

  const placed = [];
  let selected = null;
  let dragging = false;
  let dragOffset = new THREE.Vector3();
  let mode = MODE.VIEW;

  function notify() {
    if (onChange) {
      onChange({
        mode,
        label: MODE_LABEL[mode],
        count: placed.length,
        selected: selected
      });
    }
  }

  // 把屏幕坐标换算成射线，取它与地面的交点（没命中返回 null）
  function groundPoint() {
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(ground, false);
    return hits.length ? hits[0].point : null;
  }

  // 命中已放置的家具（用于选中）
  function pickPlaced() {
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(placed, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o.parent && placed.indexOf(o) === -1) o = o.parent;
    return placed.indexOf(o) !== -1 ? o : null;
  }

  function setMode(next) {
    mode = next;
    controls.enabled = (next === MODE.VIEW);
    ghost.visible = (next === MODE.PLACE);
    if (next === MODE.PLACE) {
      ghost.position.set(0, 0, 0);
      ghost.rotation.y = 0;
    }
    // 回到视角模式时取消选中；其他模式保留选中环（否则刚放下就看不到选中态）
    if (next === MODE.VIEW) selected = null;
    ring.visible = Boolean(selected);
    notify();
  }

  function select(obj) {
    selected = obj;
    if (obj) {
      ring.position.set(obj.position.x, 0.004, obj.position.z);
      ring.visible = true;   // 圆环径向对称，无需跟随朝向旋转
    } else {
      ring.visible = false;
    }
    notify();
  }

  function placeAt(point) {
    const obj = sofaProto.clone(true); // 克隆网格，共用几何体与材质
    obj.position.set(point.x, 0, point.z);
    obj.rotation.y = ghost.rotation.y;
    scene.add(obj);
    placed.push(obj);
    select(obj);
    setMode(MODE.EDIT);              // 放下后直接进调整模式，减少一次点击
  }

  function rotateSelected(deg) {
    if (!selected) return;
    selected.rotation.y += THREE.MathUtils.degToRad(deg);
    notify();
  }

  function deleteSelected() {
    if (!selected) return;
    const i = placed.indexOf(selected);
    if (i !== -1) placed.splice(i, 1);
    scene.remove(selected);
    selected = null;
    ring.visible = false;
    notify();
  }

  function clearAll() {
    placed.slice().forEach((o) => scene.remove(o));
    placed.length = 0;
    select(null);
  }

  // —— 指针事件：pointer 系列同时覆盖鼠标与触摸 ——
  function updateNdc(e) {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  dom.addEventListener('pointerdown', (e) => {
    if (mode === MODE.VIEW) return;
    updateNdc(e);

    if (mode === MODE.PLACE) {
      const p = groundPoint();
      if (p) placeAt(p);
      return;
    }

    if (mode === MODE.EDIT) {
      const picked = pickPlaced();
      if (!picked) { select(null); return; }
      select(picked);
      const p = groundPoint();
      if (p) {
        dragging = true;
        dragOffset.set(
          picked.position.x - p.x, 0, picked.position.z - p.z
        );
        dom.setPointerCapture(e.pointerId);
      }
    }
  });

  dom.addEventListener('pointermove', (e) => {
    if (mode === MODE.VIEW) return;
    updateNdc(e);

    if (mode === MODE.PLACE) {
      const p = groundPoint();
      if (p) ghost.position.set(p.x, 0, p.z);
      return;
    }

    if (mode === MODE.EDIT && dragging && selected) {
      const p = groundPoint();
      if (!p) return;
      selected.position.x = p.x + dragOffset.x;
      selected.position.z = p.z + dragOffset.z;
      ring.position.set(selected.position.x, 0.004, selected.position.z);
    }
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
  }
  dom.addEventListener('pointerup', endDrag);
  dom.addEventListener('pointercancel', endDrag);

  // —— 每帧同步：选中环跟随物体（拖动时已同步，这里兜住外部改动） ——
  function update() {
    if (selected) {
      ring.position.set(selected.position.x, 0.004, selected.position.z);
    }
  }

  return {
    setMode, update, placeAt,
    getMode: () => mode,
    getSelected: () => selected,
    getCount: () => placed.length,
    rotateSelected, deleteSelected, clearAll,
    setGhostRotationY: (rad) => { ghost.rotation.y = rad; }
  };
}
