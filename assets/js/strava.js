/* =============================================================================
   strava.js — turns the week into Strava club events.

   Strava's public API (v3) has no endpoint for creating club events, so this
   builds everything the Strava "Create an Event" form asks for, ready to paste,
   plus a calendar file for anyone who prefers their own calendar app.
   ========================================================================== */
(function (global) {
  'use strict';

  var LXRC = global.LXRC || (global.LXRC = {});

  /* Strava's "create event" page lives under the club. Set stravaClubId in
     data.js and this links straight to the form; without it we send you to
     your club list. */
  LXRC.stravaClubUrl = function () {
    var id = LXRC.BRAND && LXRC.BRAND.stravaClubId;
    return id
      ? 'https://www.strava.com/clubs/' + encodeURIComponent(id) + '/group_events/new'
      : 'https://www.strava.com/athlete/clubs';
  };

  /* Rough duration so calendar entries have a sensible end time. */
  function durationMinutes(event) {
    if (!event) return 60;
    if (event.id === 'thursday-track' || event.id === 'thursday-hills') return 75;
    if (event.kind === 'special') return 150;
    return 75;
  }

  /* 'TUESDAY SOCIAL RUN' -> 'Tuesday Social Run', accent-safe. */
  function titleCase(text) {
    return String(text).toLocaleLowerCase('pt-PT')
      .replace(/(^|[\s\-\u2013\u2014&/(])(\p{L})/gu, function (m, pre, ch) {
        return pre + ch.toLocaleUpperCase('pt-PT');
      });
  }

  LXRC.stravaEvent = function (slot, lang) {
    var event = LXRC.findEvent(slot.eventId);
    if (!event) return null;
    var date = LXRC.parseISO(slot.dateISO);
    var language = lang || 'en';
    var deal = LXRC.activeDeal(event, date);

    var description = [LXRC.captionBlock(slot, language)];
    if (event.mapUrl) {
      description.push((language === 'pt' ? 'Ponto de encontro: ' : 'Meeting point: ') + event.mapUrl);
    }
    description.push(language === 'pt'
      ? 'Todos são bem-vindos — nenhum corredor fica para trás. 🧡'
      : 'All paces welcome — nobody gets left behind. 🧡');

    var start = LXRC.zonedToUTC(slot.dateISO, slot.time);

    return {
      slotId: slot.eventId + '@' + slot.dateISO,
      title: titleCase(slot.title),
      dateISO: slot.dateISO,
      dateLabel: LXRC.longDate(date, language),
      time: slot.time,
      location: slot.location,
      mapUrl: event.mapUrl || '',
      distance: event.distance || '',
      terrain: event.terrain || '',
      pace: event.pace || '',
      access: (event.access && (event.access[language] || event.access.en)) || '',
      deal: deal ? (deal.label[language] || deal.label.en) : '',
      womenOnly: false,
      description: LXRC.tidy(description.join('\n\n')),
      start: start,
      end: LXRC.addMinutes(start, durationMinutes(event))
    };
  };

  LXRC.stravaEvents = function (week, lang) {
    return LXRC.activeSlots(week).map(function (slot) {
      return LXRC.stravaEvent(slot, lang);
    }).filter(Boolean);
  };

  /* A plain-text block matching the order of the Strava form fields. */
  LXRC.stravaFormText = function (ev) {
    var lines = [
      'Title: ' + ev.title,
      'Date: ' + ev.dateLabel + ' (' + ev.dateISO + ')',
      'Start time: ' + ev.time + ' (Europe/Lisbon)',
      'Location: ' + ev.location
    ];
    if (ev.mapUrl) lines.push('Map: ' + ev.mapUrl);
    if (ev.distance) lines.push('Distance: ' + ev.distance);
    if (ev.terrain) lines.push('Terrain: ' + ev.terrain);
    if (ev.pace) lines.push('Pace: ' + ev.pace);
    if (ev.access) lines.push('Access: ' + ev.access);
    if (ev.deal) lines.push('Perk: ' + ev.deal);
    lines.push('', 'Description:', ev.description);
    return lines.join('\n');
  };

  /* --- iCalendar ------------------------------------------------------------ */
  function icsEscape(text) {
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /* UTF-8 byte length, without the deprecated unescape(). */
  var encoder = global.TextEncoder ? new global.TextEncoder() : null;
  function byteLength(text) {
    if (encoder) return encoder.encode(text).length;
    return encodeURIComponent(text).replace(/%[0-9A-F]{2}/gi, 'x').length;
  }

  /* RFC 5545 asks for lines of 75 octets or fewer. */
  function fold(line) {
    if (byteLength(line) <= 75) return line;
    var out = [], current = '', currentBytes = 0, limit = 75;
    Array.from(line).forEach(function (ch) {
      var size = byteLength(ch);
      if (currentBytes + size > limit) {
        out.push(current);
        current = ' ' + ch;          // continuation lines start with a space
        currentBytes = size + 1;
        limit = 75;
      } else {
        current += ch;
        currentBytes += size;
      }
    });
    out.push(current);
    return out.join('\r\n');
  }

  LXRC.buildICS = function (events) {
    var stamp = LXRC.icsStamp(new Date());
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LX Running Community//Run Automation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsEscape(LXRC.BRAND.name)
    ];

    events.forEach(function (ev) {
      lines.push(
        'BEGIN:VEVENT',
        'UID:' + icsEscape(ev.slotId) + '@lxrunningcommunity',
        'DTSTAMP:' + stamp,
        'DTSTART:' + LXRC.icsStamp(ev.start),
        'DTEND:' + LXRC.icsStamp(ev.end),
        'SUMMARY:' + icsEscape(ev.title),
        'LOCATION:' + icsEscape(ev.location),
        'DESCRIPTION:' + icsEscape(ev.description + (ev.mapUrl ? '\n\n' + ev.mapUrl : '')),
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  };
})(window);
