
function renderStep(el) {
  if (!el) return;
  const key = el.dataset.svg || '';
  const tpl = document.getElementById('svg-' + key);

  if (!tpl) {
    console.warn('SVG template not found for key:', key);
    return;
  }

  el.innerHTML = '';
  el.append(tpl.content.cloneNode(true));
}

function refreshStepIcons() {
  document.querySelectorAll('.steps-container .step').forEach(renderStep);
}

function renderUIForStep(stepNumber) {
  const step = parseInt(stepNumber);

  const caratSection = document.querySelector('.carat-section');
  const productPopup = document.querySelector('#product-popup');
  const charmPanel = document.querySelector('.lucira-accessory-fullscreen');
  const overlay = document.querySelector('.popup-overlay');

  const container = document.querySelector('.steps-container');
  const centerLabel = document.querySelector('.center-label');
  const step2 = document.querySelector('.step[data-step="2"]');
  const step4 = document.querySelector('.step[data-step="4"]');

  if (caratSection) caratSection.style.display = 'none';
  if (productPopup) {
    productPopup.style.display = 'none';
    productPopup.classList.remove('active');
  }
  if (charmPanel) charmPanel.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = 'auto';

  const steps = document.querySelectorAll('.steps-container .step');
  steps.forEach(s => {
    const sNum = parseInt(s.dataset.step);
    if (sNum < step) {
      s.classList.add('is-complete');
      s.dataset.svg = 'check';
    } else {
      s.classList.remove('is-complete');
      s.dataset.svg = 's' + sNum;
    }
    if (typeof renderStep === 'function') renderStep(s);
  });

  if (centerLabel && container) {
    centerLabel.style.whiteSpace = 'nowrap';
    centerLabel.style.display = 'inline-block';

    if (step >= 3) {
      //centerLabel.innerText = "SELECT YOUR CHARM";
      if (step4) {
        step4.insertAdjacentElement('afterend', centerLabel);
        // This is the CSS to remove the space
        centerLabel.style.marginLeft = '-40px';
      }
    } else {
      centerLabel.innerText = "SELECT YOUR STYLE";
      if (step2) {
        step2.insertAdjacentElement('afterend', centerLabel);
        centerLabel.style.marginLeft = '0px';
      }
    }
  }

  switch (step) {
    case 1: window.location.href = '/pages/build-your-jewelry'; break;
    case 2: if (caratSection) caratSection.style.display = 'block'; break;
    case 3:
      if (productPopup) {
        productPopup.style.display = 'flex';
        productPopup.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
      break;
    case 4:
      if (charmPanel) charmPanel.style.display = 'block';
      if (typeof proceedBtnClicked === 'function') proceedBtnClicked();
      break;
  }
}

function activeSlide(element, force = false) {
  if (!element) return;
  const step = parseInt(element.getAttribute('data-step'), 10);

  if (!force && step > 1 && !element.classList.contains('is-complete')) {
    return;
  }

  renderUIForStep(step);
}

window.activeSlide = activeSlide;

document.addEventListener('DOMContentLoaded', () => {

  const caratExists = document.querySelector('.carat-section');
  if (caratExists) {
    renderUIForStep(2);
  } else {
    refreshStepIcons();
  }

  document.body.addEventListener('click', function (e) {
    if (e.target.closest('.select-class')) {
      renderUIForStep(3);
    }
  });

  document.body.addEventListener('click', function (e) {
    const isProceed = e.target.closest('.proceed-button') ||
      (e.target.innerText && e.target.innerText.toUpperCase().includes('PROCEED'));
    if (isProceed) {
      renderUIForStep(4);
    }
  });
});