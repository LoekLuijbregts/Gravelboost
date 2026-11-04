document.querySelectorAll('[data-thumb]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var main = document.querySelector('[data-main-image]');
    if (!main) return;
    main.src = btn.dataset.src;
    main.srcset = btn.dataset.srcset || '';
    main.alt = btn.dataset.alt || '';
    document.querySelectorAll('[data-thumb]').forEach(function (b) { b.removeAttribute('aria-current'); });
    btn.setAttribute('aria-current', 'true');
  });
});
