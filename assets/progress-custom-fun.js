
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

function renderAll() {
  document
    .querySelectorAll('.progress-steps.svg-steps .step')
    .forEach(renderStep);
}

function complete(n) {
  const el = document.querySelector(
    `.progress-steps.svg-steps .step[data-step="${n}"]`
  );

  if (!el) return;

  el.dataset.svg = 'check';
  el.classList.add('is-complete');
  renderStep(el);
}

function resetTo(n, key) {
  const el = document.querySelector(
    `.progress-steps.svg-steps .step[data-step="${n}"]`
  );

  if (!el) return;

  el.dataset.svg = key;
  el.classList.remove('is-complete');
  renderStep(el);
}

document.addEventListener('DOMContentLoaded', renderAll);

window.progressSteps = { complete, resetTo };


function updateCenterLabelPosition() {
  const container = document.querySelector('.steps-container');
  if (!container) return;

  const centerLabel = container.querySelector('.center-label');
  const step4 = container.querySelector('.step[data-step="4"]');

  if (centerLabel && step4) {
    step4.insertAdjacentElement('afterend', centerLabel);
     centerLabel.style.marginLeft = '-40px';
  }
}

  function activeSlide(element){
    document.body.style.setProperty('overflow', 'auto', 'important');
    const step = element.getAttribute('data-step');
    if(step == 1) {
      window.location.href = '/pages/build-your-jewelry';
    }
    if(step == 2 && document.querySelector('.lucira-accessory-fullscreen').style.display == 'block'){
      document.querySelector('.steps-container [data-step="2"]').classList.remove('is-complete');
      document.querySelector('.steps-container [data-step="2"]').setAttribute('data-svg', 's2');
      document.querySelector('.steps-container [data-step="3"]').classList.remove('is-complete');
      document.querySelector('.steps-container [data-step="3"]').setAttribute('data-svg', 's3');
      document.querySelector('.carat-section').style.display = 'block';
      document.querySelector('#lucira-accessory-fullscreen').style.display = 'none';
      document.querySelector('.popup-overlay').classList.remove('active');
      document.body.style.overflow = 'auto';
      document.querySelector('#product-popup').style.display = 'flex';
      document.querySelector('.steps-container [data-step="2"]').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
        <path d="M80 40C66.6718 40 40 66.6718 40 80C40 66.6718 13.3282 40 0 40C13.3282 40 40 13.3282 40 0C40 13.3282 66.6718 40 80 40Z" fill="#A68380"></path>
        <path d="M38.5345 45.936H45.8305V48H34.1425L42.0625 38.28C42.8065 37.368 43.6705 36.24 43.6705 35.04C43.6705 33.144 41.9905 31.584 40.1185 31.584C38.2705 31.584 36.7585 33.072 36.6385 34.896H34.3825C34.7425 31.68 36.8305 29.52 40.1185 29.52C43.1905 29.52 45.8305 31.8 45.8305 34.944C45.8305 36.288 45.3265 37.632 44.4865 38.664L38.5345 45.936Z" fill="white"></path>
      </svg>`
      document.querySelector('.steps-container [data-step="3"]').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
        <path d="M80 40C66.6718 40 40 66.6718 40 80C40 66.6718 13.3282 40 0 40C13.3282 40 40 13.3282 40 0C40 13.3282 66.6718 40 80 40Z" fill="#A68380"></path>
        <path opacity="0.6" d="M39.6625 39.36V37.488C41.6065 37.488 43.2145 36.768 43.2145 34.584C43.2145 32.76 41.8705 31.488 40.0705 31.488C38.4385 31.488 37.3105 32.52 37.0705 34.08H34.8385C35.2705 31.104 37.1665 29.52 40.1425 29.52C43.0225 29.52 45.3745 31.368 45.3745 34.392C45.3745 36.168 44.6065 37.608 43.0705 38.472C44.8465 39.312 45.6385 41.016 45.6385 42.96C45.6385 46.344 43.0945 48.384 39.8545 48.384C37.0225 48.384 34.4785 46.512 34.3345 43.536H36.5185C36.7345 45.312 38.2945 46.416 40.0225 46.416C42.0385 46.416 43.4785 44.832 43.4785 42.864C43.4785 40.56 41.8945 39.192 39.6625 39.36Z" fill="white"></path>
      </svg>`

    }
    if(step == 3 && document.querySelector('.lucira-accessory-fullscreen').style.display == 'block'){
      document.querySelector('.steps-container [data-step="3"]').classList.remove('is-complete');
      document.querySelector('.steps-container [data-step="3"]').setAttribute('data-svg', 's3');
      document.querySelector('.carat-section').style.display = 'block';
      document.querySelector('#lucira-accessory-fullscreen').style.display = 'none';
      document.querySelector('#product-popup').classList.add('active');
      document.querySelector('.carat-panel.active').querySelector('.carat-item .select-class').click();
      document.querySelector('#product-popup').style.display = 'flex';
      document.querySelector('.steps-container [data-step="3"]').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
        <path d="M80 40C66.6718 40 40 66.6718 40 80C40 66.6718 13.3282 40 0 40C13.3282 40 40 13.3282 40 0C40 13.3282 66.6718 40 80 40Z" fill="#A68380"></path>
        <path opacity="0.6" d="M39.6625 39.36V37.488C41.6065 37.488 43.2145 36.768 43.2145 34.584C43.2145 32.76 41.8705 31.488 40.0705 31.488C38.4385 31.488 37.3105 32.52 37.0705 34.08H34.8385C35.2705 31.104 37.1665 29.52 40.1425 29.52C43.0225 29.52 45.3745 31.368 45.3745 34.392C45.3745 36.168 44.6065 37.608 43.0705 38.472C44.8465 39.312 45.6385 41.016 45.6385 42.96C45.6385 46.344 43.0945 48.384 39.8545 48.384C37.0225 48.384 34.4785 46.512 34.3345 43.536H36.5185C36.7345 45.312 38.2945 46.416 40.0225 46.416C42.0385 46.416 43.4785 44.832 43.4785 42.864C43.4785 40.56 41.8945 39.192 39.6625 39.36Z" fill="white"></path>
      </svg>`
    }
  }
