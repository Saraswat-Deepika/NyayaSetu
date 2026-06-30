const raf = typeof window !== 'undefined' && window.requestAnimationFrame 
  ? window.requestAnimationFrame.bind(window) 
  : (fn => setTimeout(fn, 16));

const caf = typeof window !== 'undefined' && window.cancelAnimationFrame 
  ? window.cancelAnimationFrame.bind(window) 
  : (id => clearTimeout(id));

raf.cancel = caf;

export default raf;
