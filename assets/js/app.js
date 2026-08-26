/* =============================================================================
   app.js — UI wiring. Holds the current week, renders the three outputs.
   ========================================================================== */
(function (global) {
  'use strict';

  var LXRC = global.LXRC;
  var $ = LXRC.$, $$ = LXRC.$$, el = LXRC.el;

  var state = {
    week: null,
    lang: 'en',
    hashtags: true,
    captionEdited: false,
    logo: null,        // HTMLImageElement
    activePanel: 'week'
  };

  var fontsReady = LXRC.loadPosterFonts();

  /* --- Small helpers -------------------------------------------------------- */
  var toastTimer;
  function toast(message) {
    var node = $('#toast');
    node.textContent = message;
    node.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove('is-on'); }, 2200);
  }

  function save() {
    if (!LXRC.saveWeek(state.week)) {
      toast('Could not save — storage is unavailable');
    }
  }

  /* Mirror the week's own text fields back into the form. */
  function paintExtras() {
    $('#posterTitle').value = state.week.posterTitle || '';
    $('#headerNote').value = state.week.headerNote || '';
    $('#extraEn').value = (state.week.additionalInfo && state.week.additionalInfo.en) || '';
    $('#extraPt').value = (state.week.additionalInfo && state.week.additionalInfo.pt) || '';
  }

  /* Changing the week model updates every dependent view. */
  function touch(options) {
    var opts = options || {};
    save();
    renderWeekHeader();
    if (!opts.skipSlots) renderSlots();
    if (opts.repaintExtras) paintExtras();
    renderPoster();
    renderCaption(!state.captionEdited);
    renderStrava();
  }

  /* --- Week header ----------------------------------------------------------- */
  function renderWeekHeader() {
    var monday = LXRC.parseISO(state.week.weekStart);
    $('#weekPicker').value = state.week.weekStart;
    $('#weekRange').textContent = LXRC.weekRange(monday);
  }

  function goToWeek(mondayISO) {
    state.week = LXRC.getWeek(mondayISO);
    state.captionEdited = false;
    LXRC.prefs({ lastWeek: mondayISO });
    touch({ repaintExtras: true });
  }

  function shiftWeek(deltaWeeks) {
    var monday = LXRC.addDays(LXRC.parseISO(state.week.weekStart), deltaWeeks * 7);
    goToWeek(LXRC.iso(monday));
  }

  /* --- Week panel ------------------------------------------------------------- */
  function renderSlots() {
    var list = $('#slotList');
    list.textContent = '';

    var ordered = LXRC.slotsInOrder(state.week);
    if (!ordered.length) {
      list.appendChild(el('p', { class: 'panel__hint', text: 'No runs yet — add one below.' }));
    }

    ordered.forEach(function (slot) {
      list.appendChild(buildSlotCard(slot));
    });
  }

  function buildSlotCard(slot) {
    var node = $('#slotTemplate').content.firstElementChild.cloneNode(true);

    function paintHead() {
      var d = LXRC.parseISO(slot.dateISO);
      $('[data-day]', node).textContent = LXRC.DAYS_SHORT[d.getDay()];
      $('[data-name]', node).textContent = slot.title;
      $('[data-when]', node).textContent = LXRC.shortDate(d) + ' · ' + slot.time + ' · ' + slot.location;
      node.classList.toggle('is-off', !slot.enabled);
    }

    // Session picker, grouped into the recurring runs and the special ones.
    var select = $('[data-event]', node);
    [['standard', 'Weekly runs'], ['special', 'Special events']].forEach(function (group) {
      var optgroup = el('optgroup', { label: group[1] });
      LXRC.EVENTS.filter(function (e) { return e.kind === group[0]; }).forEach(function (e) {
        optgroup.appendChild(el('option', { value: e.id, text: e.name.en }));
      });
      select.appendChild(optgroup);
    });
    select.value = slot.eventId;

    var dateInput = $('[data-date]', node);
    var timeInput = $('[data-time]', node);
    var titleInput = $('[data-title]', node);
    var locationInput = $('[data-location]', node);
    var noteInput = $('[data-note]', node);
    var enabledInput = $('[data-enabled]', node);

    dateInput.value = slot.dateISO;
    timeInput.value = slot.time;
    titleInput.value = slot.title;
    locationInput.value = slot.location;
    noteInput.value = slot.note;
    enabledInput.checked = slot.enabled;
    $('[data-enabled-label]', node).textContent = 'Include ' + slot.title + ' in this week';

    paintHead();

    // Switching the session type pulls fresh time / location / note defaults but
    // keeps the day: changing what a session is shouldn't move it to another day.
    select.addEventListener('change', function () {
      slot.eventId = select.value;
      LXRC.refreshSlot(slot);
      touch();
    });

    dateInput.addEventListener('change', function () {
      if (!dateInput.value) return;
      slot.dateISO = dateInput.value;
      slot.note = LXRC.defaultNote(LXRC.findEvent(slot.eventId), LXRC.parseISO(slot.dateISO));
      noteInput.value = slot.note;
      paintHead();
      touch({ skipSlots: true });
    });

    timeInput.addEventListener('change', function () {
      slot.time = timeInput.value;
      paintHead();
      touch({ skipSlots: true });
    });

    [[titleInput, 'title'], [locationInput, 'location'], [noteInput, 'note']].forEach(function (pair) {
      pair[0].addEventListener('input', function () {
        slot[pair[1]] = pair[0].value;
        paintHead();
        touch({ skipSlots: true });
      });
    });

    enabledInput.addEventListener('change', function () {
      slot.enabled = enabledInput.checked;
      paintHead();
      touch({ skipSlots: true });
    });

    $('[data-reset]', node).addEventListener('click', function () {
      LXRC.refreshSlot(slot);
      touch();
      toast('Reset from the event library');
    });

    $('[data-remove]', node).addEventListener('click', function () {
      var index = state.week.slots.indexOf(slot);
      if (index > -1) state.week.slots.splice(index, 1);
      touch();
      toast('Run removed');
    });

    return node;
  }

  /* --- Graphic ---------------------------------------------------------------- */
  function renderPoster() {
    var canvas = $('#posterCanvas');
    if (!canvas) return;
    fontsReady.then(function () {
      LXRC.drawPoster(canvas, LXRC.posterModel(state.week), state.logo);
    });
  }

  function posterBlob() {
    return new Promise(function (resolve, reject) {
      $('#posterCanvas').toBlob(function (blob) {
        blob ? resolve(blob) : reject(new Error('Could not render the image'));
      }, 'image/png');
    });
  }

  /* --- Caption ------------------------------------------------------------------ */
  function renderCaption(regenerate) {
    var box = $('#captionText');
    if (regenerate) {
      box.value = LXRC.buildCaption(state.week, state.lang, { hashtags: state.hashtags });
      state.captionEdited = false;
    }
    var stats = LXRC.captionStats(box.value);
    $('#captionPreview').textContent = stats.preview;
    var counter = $('#captionCount');
    counter.textContent = stats.chars.toLocaleString() + ' / ' + stats.limit + ' characters';
    counter.classList.toggle('is-over', stats.over);
  }

  /* --- Strava --------------------------------------------------------------------- */
  function renderStrava() {
    var list = $('#stravaList');
    list.textContent = '';
    var events = LXRC.stravaEvents(state.week, state.lang);

    if (!events.length) {
      list.appendChild(el('p', { class: 'panel__hint', text: 'No runs selected for this week.' }));
      return;
    }

    events.forEach(function (ev) {
      var card = el('article', { class: 'card' });

      card.appendChild(el('div', { class: 'ev__head' }, [
        el('h2', { class: 'ev__title', text: ev.title }),
        el('span', { class: 'ev__date', text: LXRC.shortDate(LXRC.parseISO(ev.dateISO)) })
      ]));

      var fields = el('div', { class: 'ev__fields' });
      function addField(key, value, isLink) {
        if (!value) return;
        var val = isLink
          ? el('a', { href: value, target: '_blank', rel: 'noopener', text: 'Open map' })
          : document.createTextNode(value);
        fields.appendChild(el('div', { class: 'ev__field' }, [
          el('span', { class: 'ev__key', text: key }),
          el('span', { class: 'ev__val' }, [val])
        ]));
      }

      addField('When', ev.dateLabel + ' · ' + ev.time);
      addField('Location', ev.location);
      addField('Map', ev.mapUrl, true);
      addField('Distance', ev.distance);
      addField('Terrain', ev.terrain);
      addField('Pace', ev.pace);
      addField('Access', ev.access);
      addField('Perk', ev.deal);
      addField('Description', ev.description);
      card.appendChild(fields);

      var actions = el('div', { class: 'row-actions', style: 'padding: 0 16px 16px' }, [
        el('button', {
          class: 'btn btn--ghost', type: 'button',
          text: 'Copy all fields',
          onclick: function () {
            LXRC.copy(LXRC.stravaFormText(ev))
              .then(function () { toast('Event copied'); })
              .catch(function () { toast('Copy failed — select the text manually'); });
          }
        }),
        el('button', {
          class: 'btn btn--ghost', type: 'button',
          text: 'Copy description',
          onclick: function () {
            LXRC.copy(ev.description)
              .then(function () { toast('Description copied'); })
              .catch(function () { toast('Copy failed — select the text manually'); });
          }
        })
      ]);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  /* --- Panels ----------------------------------------------------------------------- */
  function showPanel(name) {
    state.activePanel = name;
    $$('.panel').forEach(function (panel) {
      var on = panel.id === 'panel-' + name;
      panel.classList.toggle('is-active', on);
      panel.hidden = !on;
    });
    $$('.tabbar__btn').forEach(function (button) {
      var on = button.dataset.panel === name;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (name === 'poster') renderPoster();
    global.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* --- Theme -------------------------------------------------------------------------- */
  function applyTheme(theme) {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    $('#themeIcon').textContent = theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '◐';
    LXRC.prefs({ theme: theme });
  }

  /* --- Logo ------------------------------------------------------------------------------ */
  function useLogoDataUrl(dataUrl) {
    if (!dataUrl) { state.logo = null; renderPoster(); return; }
    var img = new Image();
    img.onload = function () { state.logo = img; renderPoster(); };
    img.onerror = function () { state.logo = null; renderPoster(); };
    img.src = dataUrl;
  }

  /* --- Boot -------------------------------------------------------------------------------- */
  function init() {
    var prefs = LXRC.prefs();
    applyTheme(prefs.theme || 'system');

    state.lang = prefs.lang || 'en';
    $$('.segmented__btn').forEach(function (button) {
      var on = button.dataset.lang === state.lang;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    if (prefs.logo) useLogoDataUrl(prefs.logo);

    var start = prefs.lastWeek || LXRC.iso(LXRC.mondayOf(new Date()));
    state.week = LXRC.getWeek(start);

    touch({ repaintExtras: true });

    /* Week navigation */
    $('#prevWeek').addEventListener('click', function () { shiftWeek(-1); });
    $('#nextWeek').addEventListener('click', function () { shiftWeek(1); });
    $('#weekPicker').addEventListener('change', function (e) {
      if (!e.target.value) return;
      goToWeek(LXRC.iso(LXRC.mondayOf(LXRC.parseISO(e.target.value))));
    });

    /* Tabs */
    var tabButtons = $$('.tabbar__btn');
    tabButtons.forEach(function (button, index) {
      button.addEventListener('click', function () { showPanel(button.dataset.panel); });
      button.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1
            : e.key === 'Home' ? -index
              : e.key === 'End' ? tabButtons.length - 1 - index : 0;
        if (!step) return;
        e.preventDefault();
        var next = tabButtons[(index + step + tabButtons.length) % tabButtons.length];
        next.focus();
        showPanel(next.dataset.panel);
      });
    });

    /* Theme */
    $('#themeToggle').addEventListener('click', function () {
      var order = ['system', 'light', 'dark'];
      var current = LXRC.prefs().theme || 'system';
      applyTheme(order[(order.indexOf(current) + 1) % order.length]);
    });

    /* Slots */
    $('#addSlot').addEventListener('click', function () {
      var slot = LXRC.makeSlot('tuesday-run', LXRC.parseISO(state.week.weekStart));
      state.week.slots.push(slot);
      touch();
      toast('Run added — open Edit to change it');
    });

    $('#resetWeek').addEventListener('click', function () {
      if (!global.confirm('Rebuild this week from the standard schedule? Your edits to this week will be lost.')) return;
      state.week = LXRC.buildWeek(state.week.weekStart);
      state.captionEdited = false;
      touch({ repaintExtras: true });
      toast('Week reset');
    });

    /* Post extras */
    $('#posterTitle').addEventListener('input', function (e) {
      state.week.posterTitle = e.target.value;
      save();
      renderPoster();
    });
    $('#headerNote').addEventListener('input', function (e) {
      state.week.headerNote = e.target.value;
      save();
      renderPoster();
    });
    $('#extraEn').addEventListener('input', function (e) {
      state.week.additionalInfo.en = e.target.value;
      save();
      renderCaption(!state.captionEdited);
    });
    $('#extraPt').addEventListener('input', function (e) {
      state.week.additionalInfo.pt = e.target.value;
      save();
      renderCaption(!state.captionEdited);
    });

    /* Logo */
    $('#logoInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 600 * 1024) {
        toast('Logo is too large — use a file under 600 KB');
        e.target.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        useLogoDataUrl(reader.result);
        toast(LXRC.savePrefs({ logo: reader.result })
          ? 'Logo added'
          : 'Logo added for now — too large to remember for next time');
      };
      reader.readAsDataURL(file);
    });

    $('#clearLogo').addEventListener('click', function () {
      $('#logoInput').value = '';
      useLogoDataUrl(null);
      LXRC.prefs({ logo: '' });
      toast('Logo removed');
    });

    /* Import / export */
    $('#exportData').addEventListener('click', function () {
      var payload = { exported: new Date().toISOString(), weeks: LXRC.allWeeks() };
      LXRC.download('lxrc-weeks.json',
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      toast('Exported');
    });

    $('#importData').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var count = LXRC.importWeeks(reader.result);
          state.week = LXRC.getWeek(state.week.weekStart);
          touch({ repaintExtras: true });
          toast(count + ' week' + (count === 1 ? '' : 's') + ' imported');
        } catch (err) {
          toast('That file could not be read');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    /* Poster actions */
    $('#downloadPoster').addEventListener('click', function () {
      posterBlob()
        .then(function (blob) {
          LXRC.download(LXRC.posterFilename(state.week), blob);
          toast('Graphic downloaded');
        })
        .catch(function () { toast('Could not export the graphic'); });
    });

    if (navigator.canShare) {
      var shareBtn = $('#sharePoster');
      shareBtn.hidden = false;
      shareBtn.addEventListener('click', function () {
        posterBlob().then(function (blob) {
          var file = new File([blob], LXRC.posterFilename(state.week), { type: 'image/png' });
          if (!navigator.canShare({ files: [file] })) {
            toast('Sharing images is not supported here');
            return;
          }
          return navigator.share({ files: [file], title: 'LXRC week schedule' });
        }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          toast('Sharing was not possible');
        });
      });
    }

    /* Caption */
    $$('.segmented__btn').forEach(function (button) {
      button.addEventListener('click', function () {
        state.lang = button.dataset.lang;
        LXRC.prefs({ lang: state.lang });
        $$('.segmented__btn').forEach(function (other) {
          var on = other === button;
          other.classList.toggle('is-on', on);
          other.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        state.captionEdited = false;
        renderCaption(true);
        renderStrava();
      });
    });

    $('#includeHashtags').addEventListener('change', function (e) {
      state.hashtags = e.target.checked;
      renderCaption(true);
    });

    $('#captionText').addEventListener('input', function () {
      state.captionEdited = true;
      renderCaption(false);
    });

    $('#copyCaption').addEventListener('click', function () {
      LXRC.copy($('#captionText').value)
        .then(function () { toast('Caption copied'); })
        .catch(function () { toast('Copy failed — select the text manually'); });
    });

    $('#regenCaption').addEventListener('click', function () {
      if (state.captionEdited &&
          !global.confirm('Rebuild the caption? Your edits will be replaced.')) return;
      renderCaption(true);
      toast('Caption rebuilt');
    });

    /* Strava */
    $('#openStrava').href = LXRC.stravaClubUrl();

    $('#downloadIcs').addEventListener('click', function () {
      var events = LXRC.stravaEvents(state.week, state.lang);
      if (!events.length) { toast('No runs to export'); return; }
      LXRC.download('lxrc-' + state.week.weekStart + '.ics',
        new Blob([LXRC.buildICS(events)], { type: 'text/calendar;charset=utf-8' }));
      toast('Calendar file downloaded');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
