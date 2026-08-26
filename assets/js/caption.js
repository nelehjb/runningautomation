/* =============================================================================
   caption.js — builds the Instagram caption in EN and PT from the week model,
   following the structure of the club's caption workbook:
   Intro / one block per run / additional info / closing / hashtags.
   ========================================================================== */
(function (global) {
  'use strict';

  var LXRC = global.LXRC || (global.LXRC = {});

  /* One paragraph for a single run. */
  LXRC.captionBlock = function (slot, lang) {
    var event = LXRC.findEvent(slot.eventId);
    if (!event) return '';
    var date = LXRC.parseISO(slot.dateISO);
    var deal = LXRC.activeDeal(event, date);
    var template = (event.caption && event.caption[lang]) || (event.caption && event.caption.en);
    if (!template) return '';

    var tokens = {
      date: LXRC.longDate(date, lang),
      time: slot.time,
      location: slot.location,
      distance: event.distance || '',
      signupUrl: event.signupUrl || '',
      dealClause: deal ? (deal.clause[lang] || deal.clause.en || '') : ''
    };

    var parts = [LXRC.fill(template.lead, tokens)];
    (template.extras || []).forEach(function (line) {
      var filled = LXRC.tidy(LXRC.fill(line, tokens));
      if (filled) parts.push(filled);
    });
    return LXRC.tidy(parts.join('\n\n'));
  };

  /* The full caption. */
  LXRC.buildCaption = function (week, lang, options) {
    var opts = options || {};
    var frame = LXRC.CAPTION_FRAME;
    var sections = [];

    sections.push(frame.intro[lang] || frame.intro.en);

    LXRC.activeSlots(week).forEach(function (slot) {
      var block = LXRC.captionBlock(slot, lang);
      if (block) sections.push(block);
    });

    var extra = (week.additionalInfo && week.additionalInfo[lang] || '').trim();
    if (extra) sections.push(extra);

    sections.push(frame.closing[lang] || frame.closing.en);

    if (opts.hashtags !== false) sections.push(LXRC.BRAND.hashtags);

    return sections.join('\n\n');
  };

  /* Instagram truncates the visible caption at ~125 characters and caps the
     whole thing at 2200. Both are worth showing while editing. */
  LXRC.captionStats = function (text) {
    var chars = Array.from(String(text)).length; // emoji-safe count
    return {
      chars: chars,
      limit: 2200,
      over: chars > 2200,
      preview: Array.from(String(text)).slice(0, 125).join('')
    };
  };
})(window);
