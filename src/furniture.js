// 程序化家具模型（procedural furniture）
// 目标：零素材依赖、尺度与真实一致（1 单位 = 1 米）
// Week 4 会替换为 glTF 真实模型，这里的尺寸接口保持不变
import * as THREE from 'three';

// 统一材质（共 3 种，控制 draw call 与内存）
function makeMaterials() {
  const fabric = new THREE.MeshStandardMaterial({
    color: 0x5b6b7f, roughness: 0.92, metalness: 0.0
  });
  const cushion = new THREE.MeshStandardMaterial({
    color: 0x7387a0, roughness: 0.95, metalness: 0.0
  });
  const frame = new THREE.MeshStandardMaterial({
    color: 0x2f3a48, roughness: 0.75, metalness: 0.1
  });
  return { fabric, cushion, frame };
}

// 一个带阴影的方块零件
function part(w, h, d, x, y, z, material) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * 生成一张三人沙发，尺寸 2.00m(宽) × 0.90m(深) × 0.87m(高)
 * 原点在沙发正下方的地面中心
 * @returns {THREE.Group}
 */
export function createSofa() {
  const m = makeMaterials();
  const sofa = new THREE.Group();
  sofa.name = 'sofa';

  const W = 2.0;      // 总宽
  const D = 0.9;      // 总深
  const BASE_H = 0.32; // 底座高

  // 底座（base）
  sofa.add(part(W - 0.32, BASE_H, D, 0, BASE_H / 2, 0, m.fabric));

  // 左右扶手（armrest）：从地面直达扶手高度 0.62m
  const ARM_W = 0.16;
  const ARM_H = 0.62;
  const armX = (W - ARM_W) / 2;
  sofa.add(part(ARM_W, ARM_H, D, -armX, ARM_H / 2, 0, m.frame));
  sofa.add(part(ARM_W, ARM_H, D, armX, ARM_H / 2, 0, m.frame));

  // 两块坐垫（seat cushion）
  const CUSH_W = (W - ARM_W * 2 - 0.02) / 2;   // 0.82
  const CUSH_D = 0.74;
  const CUSH_H = 0.16;
  const cushY = BASE_H + CUSH_H / 2;
  const cushZ = (D - CUSH_D) / 2 - 0.04;       // 略往前提，留出靠背空间
  sofa.add(part(CUSH_W, CUSH_H, CUSH_D, -(CUSH_W / 2 + 0.01), cushY, cushZ, m.cushion));
  sofa.add(part(CUSH_W, CUSH_H, CUSH_D, CUSH_W / 2 + 0.01, cushY, cushZ, m.cushion));

  // 靠背（backrest）
  const BACK_H = 0.55;
  const BACK_D = 0.16;
  const backZ = -(D / 2 - BACK_D / 2);
  sofa.add(part(W - ARM_W * 2, BACK_H, BACK_D, 0, BASE_H + BACK_H / 2, backZ, m.frame));

  // 两块靠背垫（back cushion）：略微后仰，视觉上更真实
  const BC_W = CUSH_W;
  const BC_H = 0.44;
  const BC_D = 0.12;
  const bcZ = backZ + BACK_D / 2 + BC_D / 2 - 0.02;
  const bcY = BASE_H + BC_H / 2 + 0.04;
  [-1, 1].forEach((s) => {
    const bc = part(BC_W, BC_H, BC_D, s * (BC_W / 2 + 0.01), bcY, bcZ, m.cushion);
    bc.rotation.x = -0.12; // 后仰 约 7°
    sofa.add(bc);
  });

  // 记录包围盒尺寸，供 HUD 显示与后续测距复用
  const box = new THREE.Box3().setFromObject(sofa);
  sofa.userData.size = {
    w: +(box.max.x - box.min.x).toFixed(2),
    d: +(box.max.z - box.min.z).toFixed(2),
    h: +(box.max.y - box.min.y).toFixed(2)
  };

  return sofa;
}

/**
 * 生成一个 1m 高的参考标尺（ruler），用于肉眼校验尺度是否正确
 * 真实世界里一眼能看出「模型是不是太大/太小」
 * @returns {THREE.Group}
 */
export function createRuler() {
  const g = new THREE.Group();
  g.name = 'ruler';
  const mat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 12), mat);
  pole.position.y = 0.5;
  pole.castShadow = true;
  g.add(pole);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), mat);
  cap.position.y = 1;
  g.add(cap);
  g.position.set(-1.5, 0, 0.6);
  return g;
}
