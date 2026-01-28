
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
  
  // Selectors for sections
  const caratSection = document.querySelector('.carat-section');
  const productPopup = document.querySelector('#product-popup');
  const charmPanel = document.querySelector('.lucira-accessory-fullscreen');
  const overlay = document.querySelector('.popup-overlay');
  
  // Selectors for stepper elements
  const container = document.querySelector('.steps-container');
  const centerLabel = document.querySelector('.center-label');
  const step2 = document.querySelector('.step[data-step="2"]');
  const step4 = document.querySelector('.step[data-step="4"]');

  // 1. CLEANUP: Hide everything before showing the correct state
  if (caratSection) caratSection.style.display = 'none';
  if (productPopup) {
    productPopup.style.display = 'none';
    productPopup.classList.remove('active');
  }
  if (charmPanel) charmPanel.style.display = 'none';
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = 'auto';

  // 2. UPDATE STEP ICONS (Checks vs Numbers)
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

  // 3. FIX: MOVE LABEL & APPLY CSS
  if (centerLabel && container) {
    centerLabel.style.whiteSpace = 'nowrap';
    centerLabel.style.display = 'inline-block';

    // THRESHOLD CHANGE: Use >= 3 so the label stays at the end for both Step 3 and 4
    if (step >= 3) {
      centerLabel.innerText = "SELECT YOUR CHARM";
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

  // 4. ACTIVATE CURRENT VIEW
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
      // Trigger canvas resize logic if needed
      if (typeof proceedBtnClicked === 'function') proceedBtnClicked();
      break;
  }
}

function activeSlide(element) {
  const step = element.getAttribute('data-step');
  renderUIForStep(step);
}

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