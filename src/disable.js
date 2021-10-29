/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

style_node.removeChild(css_node);
document.body.querySelectorAll('[bgus__]')
  .forEach(node => {
    node.setAttribute('style_backup', node.getAttribute('style'));
    node.setAttribute('style', '');
  });
chrome.runtime.sendMessage({ from: 'toggle', enabled: false });
