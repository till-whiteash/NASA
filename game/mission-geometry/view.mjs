import {validateDataset, duration, sampleExtremes} from './model.mjs';
const $ = id => document.getElementById(id);
const project = vector => [350 + vector[0]*124, 240 - vector[1]*124];
const readableDate = value => new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));

async function start() {
  try {
    const response = await fetch(new URL('./earth-mars.json', import.meta.url));
    if (!response.ok) throw new Error('Data request failed');
    const data = validateDataset(await response.json());
    const {samples} = data;
    const extremes = sampleExtremes(samples);
    const slider = $('date');
    slider.max = String(samples.length-1);
    for (const body of ['earth', 'mars']) {
      $(body+'-track').setAttribute('d', samples.map((s,i) => `${i ? 'L' : 'M'}${project(s[body+'_au']).join(',')}`).join(' '));
    }
    for (let i=0; i<34; i++) {
      const star = document.createElementNS('http://www.w3.org/2000/svg','circle');
      star.setAttribute('cx',String((i*197+43)%680+10));
      star.setAttribute('cy',String((i*113+29)%450+15));
      star.setAttribute('r', i%6===0 ? '1.4' : '.8');
      star.setAttribute('fill','#b6d4e0');
      star.setAttribute('class','star');
      star.style.animationDelay = `${-i*.37}s`;
      $('stars').append(star);
    }
    function render(index) {
      const s=samples[index], date=readableDate(s.date), radio=duration(s.one_way_radio_seconds);
      slider.value=String(index);
      slider.setAttribute('aria-valuetext',date);
      $('date-label').textContent=date;
      $('map-date').textContent=date.toUpperCase();
      $('distance').textContent=(s.distance_km/1e6).toFixed(1);
      $('delay').textContent=radio;
      $('tip').textContent=`Send “Hello, Earth!” from Mars. It takes about ${radio} to arrive. Your message is travelling, even while you wait.`;
      $('round-trip').textContent=`On this date, a message and an immediate reply would need roughly ${duration(s.one_way_radio_seconds*2)} in total. Real replies can take longer.`;
      for (const body of ['earth','mars']) $(body).setAttribute('transform',`translate(${project(s[body+'_au']).join(' ')})`);
      const [ex,ey]=project(s.earth_au), [mx,my]=project(s.mars_au);
      for (const [key,value] of Object.entries({x1:ex,y1:ey,x2:mx,y2:my})) $('gap').setAttribute(key,value);
      $('map-desc').textContent=`${date}: Earth and Mars are ${(s.distance_km/1e6).toFixed(1)} million kilometres apart. Approximate one-way radio time ${radio}. Top-down projection with enlarged planets; the dashed line is not a flight path.`;
      $('announcement').textContent=`${date}. Radio travel time: ${radio}.`;
    }
    slider.addEventListener('input',()=>render(Number(slider.value)));
    $('near').addEventListener('click',()=>render(extremes.near));
    $('far').addEventListener('click',()=>render(extremes.far));
    render(10);
    $('loading').hidden=true;
    $('explorer').hidden=false;
  } catch (error) {
    $('loading').hidden=true;
    $('error').textContent='The saved mission data could not load. Reload this page from the local game server to try again. Your mission progress is unchanged.';
    $('error').hidden=false;
    console.error('Mission geometry:',error);
  }
}
start();
