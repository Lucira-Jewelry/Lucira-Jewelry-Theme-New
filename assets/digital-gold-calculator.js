const priceInput = document.getElementById('dg-calc-form-price');
const weightInput = document.getElementById('dg-calc-form-weight');

const buyInstructions = document.querySelector('.dg-how-it-works-buy')
const sellInstructions = document.querySelector('.dg-how-it-works-sell')

const buyTab = document.getElementById('dg-calc-buy-tab')
const sellTab = document.getElementById('dg-calc-sell-tab')
const dgForm = document.querySelector('.dg-calc-form');
const buyButton = document.getElementById('dg-calc-form-buy')
const sellButton = document.getElementById('dg-calc-form-sell')
const goldRate = 8500;

function handleTabChange(tab) {
  dgForm.reset();
  if(tab === 'buy') {
    buyTab.classList.add('active-tab')
    sellTab.classList.remove('active-tab')
    sellButton.style.display = 'none';
    buyButton.style.display = 'block';
    sellInstructions.style.display = 'none';
    buyInstructions.style.display = 'flex';
  }
  if(tab === 'sell') {
    sellTab.classList.add('active-tab')
    buyTab.classList.remove('active-tab')
    sellButton.style.display = 'block';
    buyButton.style.display = 'none';
    sellInstructions.style.display = 'flex';
    buyInstructions.style.display = 'none';
  }
}

function handlePriceChange(event) {
  const price = parseFloat(event.target.value);
  if (isNaN(price) || price < 0) return;
  weightInput.value = (price / goldRate).toFixed(4);
}

function handleWeightChange(event) {
  const weight = parseFloat(event.target.value);
  if (isNaN(weight) || weight < 0) return;
  priceInput.value = Math.ceil(goldRate * weight);
}

function handleFormSubmit(event) {
  event.preventDefault();
}