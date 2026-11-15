// Your own radiation exposure on this trip outside, on top of the outpost's lifetime "radiation badge".
//
// The badge (#m-rad) counts every mSv the crew ever gets, against NASA's career limit. This bar is
// short-term: how much radiation YOU have soaked up recently. It fills while you are outside, much faster
// in a solar storm, a bit slower inside the pressurised rover, and slowly empties again while you rest
// inside the outpost.
//
// Stay outside for more than one sol in a row and the radiation starts to hurt: the bar fills twice as
// fast and you take extra dose on your badge. If it fills completely you get radiation sickness: your
// crewmates bring you inside and you move slower until you have rested.
//
// All numbers are game balance for a kids' game, not medicine. Real radiation does not drain out of the
// body; the emptying bar stands for your body recovering from a short, intense exposure.

export const EXPOSURE = {
  footPerSol: 0.3,      // share of the bar per sol on foot outside on a quiet day
  roverShield: 0.4,     // the rover's walls let this much through (game value)
  stormPerStrength: 1.5,// a solar storm multiplies the rate by 1 + strength × this (strength is about 0.5-3)
  recoverPerSol: 0.6,   // how fast the bar empties per sol inside the outpost
  graceSols: 1,         // outside for longer than this in one go → radiation damage
  damageMul: 2,         // after the grace period the bar fills this much faster
  damageDose: 3,        // extra mSv per sol on the badge while you are taking damage
  sickSols: 0.5,        // radiation sickness lasts this long (moving slower)
  sickSpeed: 0.75,      // movement speed while sick
  sickDose: 5,          // mSv added to the badge when the bar fills up
};

export class Exposure {
  constructor(saved) {
    this.level = saved?.level ?? 0;           // 0-1, the bar
    this.outsideSols = saved?.outsideSols ?? 0; // how long this trip outside has lasted
    this.sickSols = saved?.sickSols ?? 0;     // radiation sickness still to recover from
    this.warned = { high: false, sol: false };
  }

  save() { return { level: +this.level.toFixed(3), outsideSols: +this.outsideSols.toFixed(3), sickSols: +this.sickSols.toFixed(3) }; }

  get damaging() { return this.outsideSols > EXPOSURE.graceSols; }
  get sick() { return this.sickSols > 0; }

  // Multiplier on the fill rate from a solar storm (outpost.storm), 1 on a quiet day.
  static stormFactor(storm) {
    return storm ? 1 + Math.min(3, Math.max(0, storm.strength || 1)) * EXPOSURE.stormPerStrength : 1;
  }

  // perSol: game time passed, in sols. Returns { extraDose, event } where extraDose is mSv to add to the
  // badge and event is null or one of 'damage' (passed the grace period), 'high' (bar at 80 %), 'sick'.
  update(perSol, { outside, driving, storm }) {
    let event = null, extraDose = 0;
    this.sickSols = Math.max(0, this.sickSols - perSol);
    if (!outside) {
      this.outsideSols = 0;
      this.level = Math.max(0, this.level - EXPOSURE.recoverPerSol * perSol);
      if (this.level < 0.6) this.warned.high = false;
      this.warned.sol = false;
      return { extraDose, event };
    }
    this.outsideSols += perSol;
    let rate = EXPOSURE.footPerSol * Exposure.stormFactor(storm) * (driving ? EXPOSURE.roverShield : 1);
    if (this.damaging) {
      rate *= EXPOSURE.damageMul;
      extraDose += EXPOSURE.damageDose * perSol;
      if (!this.warned.sol) { this.warned.sol = true; event = 'damage'; }
    }
    this.level = Math.min(1, this.level + rate * perSol);
    if (this.level >= 0.8 && !this.warned.high && !event) { this.warned.high = true; event = 'high'; }
    if (this.level >= 1) {
      // radiation sickness: you are brought inside, the trip clock resets, and the bar starts recovering
      this.level = 0.85; this.outsideSols = 0; this.sickSols = EXPOSURE.sickSols;
      this.warned.high = true; this.warned.sol = false;
      extraDose += EXPOSURE.sickDose; event = 'sick';
    }
    return { extraDose, event };
  }

  // What to show on the chip under the bar.
  label() {
    if (this.sick) return 'Sick · rest inside';
    if (this.damaging) return `${Math.round(this.level * 100)}% · damage!`;
    return `${Math.round(this.level * 100)}%`;
  }
}
