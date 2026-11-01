// 极简 HUD：只做一个滚动平均 FPS
// 不引入 three 的 Stats addon，避免额外依赖
const SAMPLE = 30;    // 采样窗口帧数
const REFRESH = 8;    // 每 8 帧刷新一次显示，避免 DOM 抖动

export function createFpsMeter(el) {
  const valueEl = el.querySelector('b');
  const frames = [];
  let last = performance.now();
  let counter = 0;

  return {
    tick() {
      const now = performance.now();
      const delta = now - last;
      last = now;
      if (delta <= 0) return;

      frames.push(delta);
      if (frames.length > SAMPLE) frames.shift();

      counter++;
      if (counter % REFRESH !== 0) return;

      const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
      const fps = Math.round(1000 / avg);
      valueEl.textContent = fps;

      // 颜色提示：桌面预览目标 60fps，VR 目标 90fps
      valueEl.style.color = fps >= 55 ? '#4ade80' : (fps >= 35 ? '#fb923c' : '#f87171');
    }
  };
}
