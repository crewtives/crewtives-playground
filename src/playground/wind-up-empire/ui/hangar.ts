// The side panel's Hangar plate: the launch pad slots as rocket icons, the rockets in flight with
// their r, v and t taken from the simulation, and the charted planets with their seal.
import type { Fleet } from '../fleet';
import { WORLD_BODIES } from '../orbits';
import { radius, speed } from '../flight';
import { numHtml } from './num';

const MAX_SLOTS = 4;

export class Hangar {
  private lastFlights = '';
  private lastCharted = '';
  private lastSlots = '';

  constructor(
    private readonly slots: HTMLElement,
    private readonly flights: HTMLUListElement,
    private readonly charted: HTMLUListElement,
  ) {}

  update(fleet: Fleet): void {
    // Slots: solid = ready, dashed = in flight, dotted = not built.
    const occupied = fleet.occupied;
    const slotKey = `${fleet.capacity}:${occupied}`;
    if (slotKey !== this.lastSlots) {
      this.lastSlots = slotKey;
      this.slots.replaceChildren();
      for (let i = 0; i < MAX_SLOTS; i++) {
        const slot = document.createElement('span');
        const state = i >= fleet.capacity ? 'is-locked' : i < occupied ? 'is-out' : 'is-ready';
        slot.className = `hangar-slot ${state}`;
        slot.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-rocket" /></svg>';
        slot.setAttribute(
          'aria-label',
          state === 'is-locked' ? `Slot ${i + 1}: needs a bigger gantry` : state === 'is-out' ? `Slot ${i + 1}: rocket in flight` : `Slot ${i + 1}: rocket ready`,
        );
        slot.setAttribute('role', 'img');
        this.slots.append(slot);
      }
    }

    const active = fleet.active;
    const text = active.map((f) => {
      const name = f.demo ? 'Rocket 0 (demo)' : `Rocket ${f.id}`;
      const t = f.state.t;
      return `${name} · r ${radius(f.state).toFixed(2)} · v ${speed(f.state).toFixed(2)} · t ${t.toFixed(1)} s`;
    });
    const flightsKey = text.join('|');
    if (flightsKey !== this.lastFlights) {
      this.lastFlights = flightsKey;
      this.flights.replaceChildren(
        ...(text.length ? text : ['No rockets in flight.']).map((line) => {
          const li = document.createElement('li');
          if (text.length) li.innerHTML = numHtml(line);
          else li.textContent = line;
          if (!text.length) li.className = 'hangar-empty';
          return li;
        }),
      );
    }

    const charted = WORLD_BODIES.filter((w) => fleet.charted.has(w.id));
    const chartedKey = charted.map((w) => w.id).join('');
    if (chartedKey !== this.lastCharted) {
      this.lastCharted = chartedKey;
      this.charted.replaceChildren(
        ...(charted.length
          ? charted.map((w) => {
              const li = document.createElement('li');
              li.textContent = `${w.letter} · ${w.name} · charted`;
              return li;
            })
          : [Object.assign(document.createElement('li'), { className: 'hangar-empty', textContent: 'Nothing charted yet. Fly a rocket past a planet.' })]),
      );
    }
  }
}
