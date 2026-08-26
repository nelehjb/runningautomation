/* =============================================================================
   util.js — dates, formatting and small DOM helpers.
   All club dates are Europe/Lisbon wall-clock times.
   ========================================================================== */
(function (global) {
  'use strict';

  var LXRC = global.LXRC || (global.LXRC = {});
  var TZ = 'Europe/Lisbon';
  LXRC.TZ = TZ;

  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAYS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'];
  var DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  LXRC.DAYS_SHORT = DAYS_SHORT;

  /* Parse 'YYYY-MM-DD' into a local Date at midnight (no timezone surprises). */
  LXRC.parseISO = function (iso) {
    var p = String(iso).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  };

  LXRC.iso = function (date) {
    var m = date.getMonth() + 1, d = date.getDate();
    return date.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  };

  LXRC.addDays = function (date, n) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  };

  /* Monday of the week containing `date`. */
  LXRC.mondayOf = function (date) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
    return LXRC.addDays(d, -offset);
  };

  /* Date for a weekday (0=Sun…6=Sat) inside the Mon–Sun week starting `monday`. */
  LXRC.dateForWeekday = function (monday, weekday) {
    var offset = (weekday + 6) % 7; // Mon=0 … Sun=6
    return LXRC.addDays(monday, offset);
  };

  /* Which occurrence of that weekday it is in the month (1st, 2nd, 3rd…). */
  LXRC.weekOfMonth = function (date) {
    return Math.floor((date.getDate() - 1) / 7) + 1;
  };

  /* --- Human formats -------------------------------------------------------- */
  LXRC.ordinal = function (n) {
    if (n % 100 >= 11 && n % 100 <= 13) return n + 'th';
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  };

  /* 'Tuesday, August 18th' / 'Terça-feira, 18 de agosto' */
  LXRC.longDate = function (date, lang) {
    if (lang === 'pt') {
      return DAYS_PT[date.getDay()] + ', ' + date.getDate() + ' de ' + MONTHS_PT[date.getMonth()];
    }
    return DAYS_EN[date.getDay()] + ', ' + MONTHS_EN[date.getMonth()] + ' ' + LXRC.ordinal(date.getDate());
  };

  /* 'JUNE 23' for the poster */
  LXRC.posterDate = function (date) {
    return (MONTHS_EN[date.getMonth()] + ' ' + date.getDate()).toUpperCase();
  };

  /* '18 Aug' for compact UI */
  LXRC.shortDate = function (date) {
    return date.getDate() + ' ' + MONTHS_EN[date.getMonth()].slice(0, 3);
  };

  /* 'Mon 17 – Sun 23 August 2026' for the week header */
  LXRC.weekRange = function (monday) {
    var sunday = LXRC.addDays(monday, 6);
    var a = monday.getDate() + ' ' + MONTHS_EN[monday.getMonth()].slice(0, 3);
    var b = sunday.getDate() + ' ' + MONTHS_EN[sunday.getMonth()].slice(0, 3);
    return a + ' – ' + b + ' ' + sunday.getFullYear();
  };

  /* --- Timezone-correct instants (used for .ics files) ---------------------- */
  function tzOffsetMs(date, tz) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var parts = {};
    dtf.formatToParts(date).forEach(function (p) {
      if (p.type !== 'literal') parts[p.type] = p.value;
    });
    var asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day,
      parts.hour === '24' ? 0 : +parts.hour, +parts.minute, +parts.second);
    return asUTC - date.getTime();
  }

  /* Wall-clock time in Europe/Lisbon -> a real UTC instant. */
  LXRC.zonedToUTC = function (dateISO, timeHHMM) {
    var d = String(dateISO).split('-');
    var t = String(timeHHMM || '00:00').split(':');
    var naive = Date.UTC(+d[0], +d[1] - 1, +d[2], +t[0], +t[1]);
    var guess = new Date(naive);
    // Two passes settle the DST edge cases.
    var utc = naive - tzOffsetMs(guess, TZ);
    utc = naive - tzOffsetMs(new Date(utc), TZ);
    return new Date(utc);
  };

  /* 20260818T183000Z */
  LXRC.icsStamp = function (date) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return date.getUTCFullYear() + p(date.getUTCMonth() + 1) + p(date.getUTCDate()) +
      'T' + p(date.getUTCHours()) + p(date.getUTCMinutes()) + p(date.getUTCSeconds()) + 'Z';
  };

  LXRC.addMinutes = function (date, mins) {
    return new Date(date.getTime() + mins * 60000);
  };

  /* --- Text ----------------------------------------------------------------- */
  /* Replaces {tokens}; unknown or empty tokens collapse to ''. */
  LXRC.fill = function (template, tokens) {
    return String(template || '').replace(/\{(\w+)\}/g, function (match, key) {
      return tokens[key] != null ? tokens[key] : '';
    });
  };

  /* Tidy double spaces / stray space before punctuation left by empty tokens. */
  LXRC.tidy = function (text) {
    return String(text)
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +([.,!?])/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  /* --- DOM ------------------------------------------------------------------ */
  LXRC.$ = function (sel, root) { return (root || document).querySelector(sel); };
  LXRC.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  LXRC.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  };

  /* Copy with a graceful fallback for non-secure contexts / older Safari. */
  LXRC.copy = function (text) {
    if (navigator.clipboard && global.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  };

  LXRC.download = function (filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };
})(window);
