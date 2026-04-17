(function () {
  'use strict';

  const root = document.documentElement;
  const toggleBtn = document.querySelector('[data-theme-toggle]');

  function getPreferredTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  let theme = getPreferredTheme();
  root.setAttribute('data-theme', theme);
  if (toggleBtn) {
    updateToggleIcon();
    toggleBtn.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      updateToggleIcon();
      if (chartInstance) updateChart();
      if (divChartInstance) renderOrUpdateDividendChart(lastDividendData);
    });
  }

  function updateToggleIcon() {
    if (!toggleBtn) return;
    toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    toggleBtn.innerHTML = theme === 'dark'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }

  function formatCurrency(v) {
    if (v >= 1_000_000) return '€' + (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 10_000)    return '€' + Math.round(v).toLocaleString('de-DE');
    return '€' + v.toFixed(2);
  }

  const animState = {};
  function animateValue(id, target, formatter) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = animState[id] || 0;
    animState[id] = target;
    const duration = 500;
    const startTime = performance.now();
    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * ease;
      el.textContent = formatter(current);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = formatter(target);
    }
    requestAnimationFrame(step);
  }

  function baseOptions(textMuted, border) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutCubic' },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 3,
            useBorderRadius: true,
            color: textMuted,
            padding: 16,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          },
          backgroundColor: '#1c1b19',
          titleColor: '#cdccca',
          bodyColor: '#797876',
          padding: 10,
          cornerRadius: 8,
          borderColor: border,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: border + '55' },
          ticks: {
            color: textMuted,
            font: { size: 11 },
            maxTicksLimit: 12
          }
        },
        y: {
          grid: { color: border + '55' },
          ticks: {
            color: textMuted,
            font: { size: 11 },
            callback: v => {
              if (v >= 1e6) return '€' + (v / 1e6).toFixed(1) + 'M';
              if (v >= 1e3) return '€' + (v / 1e3).toFixed(0) + 'K';
              return '€' + v;
            }
          }
        }
      }
    };
  }

  function createStackedOptions(base) {
    const stacked = {
      ...base,
      scales: {
        ...base.scales,
        x: { ...base.scales.x, stacked: true },
        y: { ...base.scales.y, stacked: true },
      }
    };
    return stacked;
  }

  function computeCompoundSchedule({ principal, monthly, rate, years, freq }) {
    const yearlyData = [];
    let balance = principal;
    let totalDeposited = principal;

    for (let y = 1; y <= years; y++) {
      const periodsInYear = freq;
      const ratePerPeriod = rate / freq;
      for (let p = 0; p < periodsInYear; p++) {
        balance *= (1 + ratePerPeriod);
        const monthlyContributions = monthly * 12 / periodsInYear;
        balance += monthlyContributions;
        totalDeposited += monthlyContributions;
      }
      yearlyData.push({
        year: y,
        deposited: totalDeposited,
        interest: balance - totalDeposited,
        balance: balance,
      });
    }

    return { yearlyData, finalBalance: balance, totalDeposited };
  }

  function computeDividendSchedule({ principal, monthly, startYield, dividendGrowth, priceGrowth, years, reinvest }) {
    let portfolio     = principal;
    let currentYield  = startYield;
    let totalDivs     = 0;
    const yearlyData  = [];

    for (let year = 1; year <= years; year++) {
      const contributions = monthly * 12;
      portfolio += contributions;

      const yearDivs = portfolio * currentYield;
      totalDivs += yearDivs;

      if (reinvest) {
        portfolio += yearDivs;
      }

      portfolio *= (1 + priceGrowth);

      const totalContribToDate = principal + monthly * 12 * year;
      const yoc = totalContribToDate > 0 ? (yearDivs / totalContribToDate) : 0;

      yearlyData.push({
        year,
        portfolio,
        yearDivs,
        cumulativeDivs: totalDivs,
        yieldOnCost: yoc,
      });

      currentYield *= (1 + dividendGrowth);
    }

    const final = yearlyData[yearlyData.length - 1];
    const totalContrib = principal + monthly * 12 * years;
    const yocFinal     = totalContrib > 0 ? final.yearDivs / totalContrib : 0;

    return { yearlyData, finalPortfolio: final.portfolio, totalDividends: totalDivs, yocFinal };
  }

  const inputs = {
    principal: document.getElementById('principal'),
    monthly:   document.getElementById('monthly'),
    rate:      document.getElementById('rate'),
    years:     document.getElementById('years'),
    freq:      document.getElementById('freq'),
    inflation: document.getElementById('inflation'),
  };
  const rateDisplay      = document.getElementById('rate-display');
  const yearsDisplay     = document.getElementById('years-display');
  const inflationDisplay = document.getElementById('inflation-display');

  if (inputs.rate && inputs.years && inputs.inflation) {
    inputs.rate.addEventListener('input', () => {
      rateDisplay.textContent = parseFloat(inputs.rate.value).toFixed(1) + '%';
      calculate();
    });
    inputs.years.addEventListener('input', () => {
      yearsDisplay.textContent = inputs.years.value + ' yrs';
      document.getElementById('table-badge').textContent = inputs.years.value + ' years';
      calculate();
    });
    inputs.inflation.addEventListener('input', () => {
      inflationDisplay.textContent = parseFloat(inputs.inflation.value).toFixed(1) + '%';
      calculate();
    });
    ['principal', 'monthly', 'freq'].forEach(k => {
      inputs[k].addEventListener('input', calculate);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      inputs.principal.value = 10000;
      inputs.monthly.value   = 200;
      inputs.rate.value      = 7;
      inputs.years.value     = 20;
      inputs.freq.value      = 12;
      inputs.inflation.value = 2.5;
      rateDisplay.textContent      = '7.0%';
      yearsDisplay.textContent     = '20 yrs';
      inflationDisplay.textContent = '2.5%';
      document.getElementById('table-badge').textContent = '20 years';
      calculate();
    });
  }

  function calculate() {
    if (!inputs.principal) return;

    const principal = Math.max(0, parseFloat(inputs.principal.value) || 0);
    const monthly   = Math.max(0, parseFloat(inputs.monthly.value)   || 0);
    const rate      = Math.max(0, parseFloat(inputs.rate.value)      || 0) / 100;
    const years     = Math.max(1, parseInt(inputs.years.value)       || 1);
    const freq      = parseInt(inputs.freq.value) || 12;
    const inflation = Math.max(0, parseFloat(inputs.inflation.value) || 0) / 100;

    const { yearlyData, finalBalance, totalDeposited } = computeCompoundSchedule({
      principal,
      monthly,
      rate,
      years,
      freq,
    });

    const realValue  = finalBalance / Math.pow(1 + inflation, years);
    const multiplier = totalDeposited > 0 ? (finalBalance / totalDeposited).toFixed(2) : '—';

    animateValue('kpi-total', finalBalance, formatCurrency);
    animateValue('kpi-deposited', totalDeposited, formatCurrency);
    animateValue('kpi-interest', finalBalance - totalDeposited, formatCurrency);

    const realEl = document.getElementById('kpi-total-real');
    if (realEl) {
      realEl.textContent = inflation > 0 ? `≈ ${formatCurrency(realValue)} real value` : 'Nominal value';
    }
    const multEl = document.getElementById('kpi-multiplier');
    if (multEl) {
      multEl.textContent = `${multiplier}× money growth`;
    }

    renderTable(yearlyData);
    renderOrUpdateChart(yearlyData);
  }

  function renderTable(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = data.map(row => `
      <tr>
        <td>Year ${row.year}</td>
        <td>${formatCurrency(row.deposited)}</td>
        <td class="td-interest">${formatCurrency(row.interest)}</td>
        <td class="td-total">${formatCurrency(row.balance)}</td>
      </tr>
    `).join('');
  }

  let chartInstance = null;
  let currentChartType = 'bar';
  let lastYearlyData = [];

  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentChartType = tab.dataset.chart;
      updateChart();
    });
  });

  function renderOrUpdateChart(data) {
    lastYearlyData = data;
    updateChart();
  }

  function updateChart() {
    const data = lastYearlyData;
    if (!data.length) return;

    const cs = getComputedStyle(document.documentElement);
    const primary   = cs.getPropertyValue('--color-primary').trim();
    const success   = cs.getPropertyValue('--color-success').trim();
    const gold      = cs.getPropertyValue('--color-gold').trim();
    const textMuted = cs.getPropertyValue('--color-text-muted').trim();
    const border    = cs.getPropertyValue('--color-border').trim();

    const labels   = data.map(d => `Y${d.year}`);
    const balances = data.map(d => Math.round(d.balance));
    const deposited= data.map(d => Math.round(d.deposited));
    const interest = data.map(d => Math.round(d.interest));

    const canvas = document.getElementById('main-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    Chart.defaults.color = textMuted;
    Chart.defaults.borderColor = border;

    const baseOpts = baseOptions(textMuted, border);
    let config;

    if (currentChartType === 'bar') {
      config = {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Balance',
            data: balances,
            backgroundColor: primary + '99',
            borderColor: primary,
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: baseOpts,
      };
    } else if (currentChartType === 'stacked') {
      const stackedOpts = createStackedOptions(baseOpts);
      config = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Deposited',
              data: deposited,
              backgroundColor: gold + 'cc',
              borderColor: gold,
              borderWidth: 1,
              stack: 'main',
            },
            {
              label: 'Interest',
              data: interest,
              backgroundColor: success + 'cc',
              borderColor: success,
              borderWidth: 1,
              stack: 'main',
            },
          ],
        },
        options: stackedOpts,
      };
    } else {
      config = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Balance',
              data: balances,
              borderColor: primary,
              backgroundColor: primary + '18',
              fill: true,
              tension: 0.35,
              pointRadius: balances.length > 20 ? 0 : 3,
              pointHoverRadius: 5,
            },
            {
              label: 'Deposited',
              data: deposited,
              borderColor: gold,
              backgroundColor: 'transparent',
              fill: false,
              tension: 0.35,
              borderDash: [5, 3],
              pointRadius: 0,
              pointHoverRadius: 5,
            },
          ],
        },
        options: baseOpts,
      };
    }

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, config);
  }

  const divInputs = {
    principal:    document.getElementById('div-principal'),
    monthly:      document.getElementById('div-monthly'),
    yield:        document.getElementById('div-yield'),
    divGrowth:    document.getElementById('div-divGrowth'),
    priceGrowth:  document.getElementById('div-priceGrowth'),
    years:        document.getElementById('div-years'),
    reinvest:     document.getElementById('div-reinvest'),
  };

  const divDisplays = {
    yield:       document.getElementById('div-yield-display'),
    divGrowth:   document.getElementById('div-divGrowth-display'),
    priceGrowth: document.getElementById('div-priceGrowth-display'),
    years:       document.getElementById('div-years-display'),
    tableBadge:  document.getElementById('div-table-badge'),
  };

  let divChartInstance = null;
  let lastDividendData = [];

  if (divInputs.yield) {
    divInputs.yield.addEventListener('input', () => {
      divDisplays.yield.textContent = parseFloat(divInputs.yield.value).toFixed(1) + '%';
      calculateDividends();
    });
    divInputs.divGrowth.addEventListener('input', () => {
      divDisplays.divGrowth.textContent = parseFloat(divInputs.divGrowth.value).toFixed(1) + '%';
      calculateDividends();
    });
    divInputs.priceGrowth.addEventListener('input', () => {
      divDisplays.priceGrowth.textContent = parseFloat(divInputs.priceGrowth.value).toFixed(1) + '%';
      calculateDividends();
    });
    divInputs.years.addEventListener('input', () => {
      divDisplays.years.textContent = divInputs.years.value + ' yrs';
      divDisplays.tableBadge.textContent = divInputs.years.value + ' years';
      calculateDividends();
    });
    ['principal', 'monthly', 'reinvest'].forEach(k => {
      divInputs[k].addEventListener('input', calculateDividends);
      divInputs[k].addEventListener('change', calculateDividends);
    });

    const resetDivBtn = document.getElementById('btn-div-reset');
    if (resetDivBtn) {
      resetDivBtn.addEventListener('click', () => {
        divInputs.principal.value   = 10000;
        divInputs.monthly.value     = 200;
        divInputs.yield.value       = 4;
        divInputs.divGrowth.value   = 5;
        divInputs.priceGrowth.value = 5;
        divInputs.years.value       = 20;
        divInputs.reinvest.checked  = true;

        divDisplays.yield.textContent       = '4.0%';
        divDisplays.divGrowth.textContent   = '5.0%';
        divDisplays.priceGrowth.textContent = '5.0%';
        divDisplays.years.textContent       = '20 yrs';
        divDisplays.tableBadge.textContent  = '20 years';

        calculateDividends();
      });
    }
  }

  function calculateDividends() {
    if (!divInputs.principal) return;

    const principal    = Math.max(0, parseFloat(divInputs.principal.value) || 0);
    const monthly      = Math.max(0, parseFloat(divInputs.monthly.value)   || 0);
    const startYield   = Math.max(0, parseFloat(divInputs.yield.value)     || 0) / 100;
    const dividendGrowth = Math.max(0, parseFloat(divInputs.divGrowth.value) || 0) / 100;
    const priceGrowth  = parseFloat(divInputs.priceGrowth.value) / 100;
    const years        = Math.max(1, parseInt(divInputs.years.value) || 1);
    const reinvest     = !!divInputs.reinvest.checked;

    const { yearlyData, finalPortfolio, totalDividends, yocFinal } = computeDividendSchedule({
      principal,
      monthly,
      startYield,
      dividendGrowth,
      priceGrowth,
      years,
      reinvest,
    });

    lastDividendData = yearlyData;

    animateValue('div-kpi-portfolio',      finalPortfolio, formatCurrency);
    animateValue('div-kpi-finalIncome',    yearlyData[yearlyData.length - 1].yearDivs, formatCurrency);
    animateValue('div-kpi-totalDividends', totalDividends, formatCurrency);

    const yocEl = document.getElementById('div-kpi-yoc');
    if (yocEl) {
      yocEl.textContent = `Yield on cost in final year: ${(yocFinal * 100).toFixed(2)}%`;
    }

    renderDividendTable(yearlyData);
    renderOrUpdateDividendChart(yearlyData);
  }

  function renderDividendTable(data) {
    const tbody = document.getElementById('div-table-body');
    if (!tbody) return;
    tbody.innerHTML = data.map(row => `
      <tr>
        <td>Year ${row.year}</td>
        <td class="td-total">${formatCurrency(row.portfolio)}</td>
        <td class="td-interest">${formatCurrency(row.yearDivs)}</td>
        <td>${formatCurrency(row.cumulativeDivs)}</td>
      </tr>
    `).join('');
  }

  function renderOrUpdateDividendChart(data) {
    const canvas = document.getElementById('div-chart');
    if (!canvas || !data.length) return;

    const cs        = getComputedStyle(document.documentElement);
    const primary   = cs.getPropertyValue('--color-primary').trim();
    const success   = cs.getPropertyValue('--color-success').trim();
    const border    = cs.getPropertyValue('--color-border').trim();
    const textMuted = cs.getPropertyValue('--color-text-muted').trim();

    const labels     = data.map(d => `Y${d.year}`);
    const portfolios = data.map(d => Math.round(d.portfolio));
    const incomes    = data.map(d => Math.round(d.yearDivs));

    const ctx = canvas.getContext('2d');
    Chart.defaults.color       = textMuted;
    Chart.defaults.borderColor = border;

    const opts = baseOptions(textMuted, border);

    const config = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Portfolio value',
            data: portfolios,
            borderColor: primary,
            backgroundColor: primary + '18',
            fill: true,
            tension: 0.35,
            pointRadius: portfolios.length > 20 ? 0 : 3,
            pointHoverRadius: 5,
          },
          {
            label: 'Dividends per year',
            data: incomes,
            borderColor: success,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            borderDash: [5, 3],
            pointRadius: incomes.length > 20 ? 0 : 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: opts,
    };

    if (divChartInstance) divChartInstance.destroy();
    divChartInstance = new Chart(ctx, config);
  }

  const pageCompound  = document.getElementById('page-compound');
  const pageDividends = document.getElementById('page-dividends');
  const modeTabs      = document.querySelectorAll('.nav-tab');

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const page = tab.dataset.page;
      if (page === 'dividends') {
        if (pageCompound) pageCompound.hidden  = true;
        if (pageDividends) pageDividends.hidden = false;
        calculateDividends();
      } else {
        if (pageCompound) pageCompound.hidden  = false;
        if (pageDividends) pageDividends.hidden = true;
        calculate();
      }
    });
  });

  calculate();
  calculateDividends();
})();
