// Draggable utility for Blazor
window.makeDraggable = function(selector) {
  let dragged = null, offsetX = 0, offsetY = 0;

  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('mousedown', e => {
      // Prevent drag if mousedown is on the resize handle
      if (e.target.classList.contains('resize-handle') || e.target.closest('.resize-handle')) {
        return;
      }
      // If this is a titlebar, drag the parent widget-outer
      let dragTarget = el.closest('.widget-outer') || el;
      dragged = dragTarget;
      const rect = dragTarget.getBoundingClientRect();
      // Get sidebar width if present
      const sidebar = document.querySelector('.sidebar');
      const sidebarWidth = sidebar ? sidebar.offsetWidth : 0;
      // Get top-row height if present
      const topRow = document.querySelector('.top-row');
      const topRowHeight = topRow ? topRow.offsetHeight : 0;
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      dragged.dataset.sidebarWidth = sidebarWidth;
      dragged.dataset.topRowHeight = topRowHeight;
      dragTarget.style.zIndex = 1000;
      console.log('dragged', dragged);
      console.log(`e.clientX: ${e.clientX}, rect.left: ${rect.left}, e.clientY: ${e.clientY}, rect.top: ${rect.top}, sidebarWidth: ${sidebarWidth}, topRowHeight: ${topRowHeight}`);
    });
  });

  document.addEventListener('mousemove', e => {
    if (!dragged) return;
    const sidebarWidth = parseInt(dragged.dataset.sidebarWidth || '0', 10);
    const topRowHeight = parseInt(dragged.dataset.topRowHeight || '0', 10);
    dragged.style.left = `${e.clientX - offsetX - sidebarWidth}px`;
    dragged.style.top  = `${e.clientY - offsetY - topRowHeight}px`;
  });

  document.addEventListener('mouseup', () => {
    if (dragged) dragged.style.zIndex = '';
    dragged = null;
  });

  document.addEventListener('touchstart', e => {
    const t = e.target;
    if (t.matches(selector)) {
      dragged = t;
      const rect = t.getBoundingClientRect();
      offsetX = e.touches[0].clientX - rect.left;
      offsetY = e.touches[0].clientY - rect.top;
      t.style.zIndex = 1000;
      e.preventDefault();
    }
  });
  document.addEventListener('touchmove', e => {
    if (!dragged) return;
    dragged.style.left = `${e.touches[0].clientX - offsetX}px`;
    dragged.style.top  = `${e.touches[0].clientY - offsetY}px`;
    e.preventDefault();
  });
  document.addEventListener('touchend', () => {
    if (dragged) dragged.style.zIndex = '';
    dragged = null;
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dragged) {
      if (dragged) dragged.style.zIndex = '';
      dragged = null;
    }
  });
};
