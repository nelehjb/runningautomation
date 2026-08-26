/* =============================================================================
   week.js — the week model. One object drives poster, captions and Strava.
   ========================================================================== */
(function (global) {
  'use strict';

  var LXRC = global.LXRC || (global.LXRC = {});
  var STORE_KEY = 'lxrc.weeks.v1';
  var PREFS_KEY = 'lxrc.prefs.v1';

  /* Which deal (if any) is active for this event on this date. */
  LXRC.activeDeal = function (event, date) {
    var ids = event.deals || [];
    for (var i = 0; i < ids.length; i++) {
      var deal = LXRC.DEALS[ids[i]];
      if (deal && deal.applies(date)) return deal;
    }
    return null;
  };

  /* The poster note for a slot: explicit event note, else the active deal's. */
  function defaultNote(event, date) {
    var deal = LXRC.activeDeal(event, date);
    if (deal && deal.posterNote) return deal.posterNote;
    if (event.posterNote) return event.posterNote;
    if (event.bagDrop && event.bagDrop.available && event.bagDrop.place) {
      return ('BAG DROP AVAILABLE AT ' + event.bagDrop.place).toUpperCase();
    }
    return '';
  }
  LXRC.defaultNote = defaultNote;

  /* Build one slot from the library for a given week. */
  LXRC.makeSlot = function (eventId, monday) {
    var event = LXRC.findEvent(eventId);
    if (!event) return null;
    var date = LXRC.dateForWeekday(monday, event.weekday);
    return {
      eventId: event.id,
      enabled: true,
      dateISO: LXRC.iso(date),
      time: event.time,
      title: event.posterTitle,
      location: event.location,
      note: defaultNote(event, date)
    };
  };

  /* A fresh week: the recurring schedule, with deal rules already applied. */
  LXRC.buildWeek = function (mondayISO) {
    var monday = LXRC.parseISO(mondayISO);
    var slots = LXRC.DEFAULT_WEEK.map(function (id) {
      return LXRC.makeSlot(id, monday);
    }).filter(Boolean);

    return {
      weekStart: mondayISO,
      posterTitle: 'week schedule',
      headerNote: '',
      additionalInfo: { en: '', pt: '' },
      slots: slots
    };
  };

  /* Re-apply library defaults to one slot (used by the "reset" button and
     whenever the event type or date changes). */
  LXRC.refreshSlot = function (slot) {
    var event = LXRC.findEvent(slot.eventId);
    if (!event) return slot;
    var date = LXRC.parseISO(slot.dateISO);
    slot.time = event.time;
    slot.title = event.posterTitle;
    slot.location = event.location;
    slot.note = defaultNote(event, date);
    return slot;
  };

  LXRC.slotsInOrder = function (week) {
    return week.slots.slice().sort(function (a, b) {
      if (a.dateISO === b.dateISO) return (a.time || '').localeCompare(b.time || '');
      return a.dateISO < b.dateISO ? -1 : 1;
    });
  };

  LXRC.activeSlots = function (week) {
    return LXRC.slotsInOrder(week).filter(function (s) { return s.enabled; });
  };

  /* --- Persistence: every week you touch is kept, keyed by its Monday ------- */
  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  LXRC.saveWeek = function (week) {
    try {
      var store = readStore();
      store[week.weekStart] = week;
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      return true;
    } catch (e) { return false; }
  };

  LXRC.loadWeek = function (mondayISO) {
    var stored = readStore()[mondayISO];
    if (!stored || !stored.slots) return null;
    // Forward-compatible defaults for weeks saved by an older version.
    if (!stored.additionalInfo) stored.additionalInfo = { en: '', pt: '' };
    if (stored.headerNote == null) stored.headerNote = '';
    return stored;
  };

  LXRC.getWeek = function (mondayISO) {
    return LXRC.loadWeek(mondayISO) || LXRC.buildWeek(mondayISO);
  };

  LXRC.allWeeks = function () { return readStore(); };

  LXRC.deleteWeek = function (mondayISO) {
    try {
      var store = readStore();
      delete store[mondayISO];
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) { /* storage unavailable — nothing to clean up */ }
  };

  LXRC.importWeeks = function (json) {
    var data = typeof json === 'string' ? JSON.parse(json) : json;
    var weeks = data.weeks || data;
    if (!weeks || typeof weeks !== 'object') throw new Error('No weeks found in that file.');
    var count = 0;
    Object.keys(weeks).forEach(function (key) {
      if (weeks[key] && weeks[key].slots) { LXRC.saveWeek(weeks[key]); count++; }
    });
    if (!count) throw new Error('No weeks found in that file.');
    return count;
  };

  /* --- Preferences ---------------------------------------------------------- */
  LXRC.prefs = function (patch) {
    var current = {};
    try { current = JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { current = {}; }
    if (patch) {
      Object.keys(patch).forEach(function (k) { current[k] = patch[k]; });
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(current)); } catch (e) { /* quota */ }
    }
    return current;
  };

  /* Same as prefs(), but says whether the value actually persisted — a large
     logo can exceed the storage quota. */
  LXRC.savePrefs = function (patch) {
    var current = {};
    try { current = JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { current = {}; }
    Object.keys(patch).forEach(function (k) { current[k] = patch[k]; });
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(current));
      return true;
    } catch (e) {
      return false;
    }
  };
})(window);
