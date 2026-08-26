/* =============================================================================
   poster.js — draws the weekly schedule graphic on a 1080x1350 canvas.
   No libraries: the canvas is the export, so what you preview is what you post.
   ========================================================================== */
(function (global) {
  'use strict';

  var LXRC = global.LXRC || (global.LXRC = {});

  var W = 1080, H = 1350;

  var T = {                       // layout tokens (all in canvas pixels)
    marginX: 96,
    titleTop: 150,
    titleMaxSize: 168,
    titleMinSize: 56,
    titleFill: 0.82,          // share of the usable width a title aims to fill
    headerNoteSize: 27,
    dayX: 100,
    colX: 262,
    rightX: 984,
    daySize: 88,
    nameSize: 34,
    metaSize: 32,
    noteSize: 26,
    dateSize: 30,
    lineGap: 40,
    noteGap: 34,
    rowGapMin: 64,
    rowGapMax: 190,
    footerBottom: 96
  };

  var FONTS = {
    script: '"Caveat", "Bradley Hand", "Segoe Script", cursive',
    day: '"Anton", "Haettenschweiler", "Arial Narrow", sans-serif',
    body: '"Poppins", "Century Gothic", system-ui, sans-serif',
    logo: '"Archivo Black", "Poppins", system-ui, sans-serif'
  };

  var COLORS = {
    bg: '#FFFFFF',
    red: '#EA3B1F',
    ink: '#111111',
    body: '#3D3D3D',
    label: '#A3A3A3'
  };

  /* Make sure the webfonts are rasterised before we draw with them. */
  LXRC.loadPosterFonts = function () {
    if (!global.document || !document.fonts || !document.fonts.load) {
      return Promise.resolve();
    }
    var specs = [
      '700 132px "Caveat"',
      '400 88px "Anton"',
      '300 34px "Poppins"',
      '400 32px "Poppins"',
      'italic 700 26px "Poppins"',
      '700 30px "Poppins"',
      '400 46px "Archivo Black"'
    ];
    return Promise.all(specs.map(function (spec) {
      return document.fonts.load(spec).catch(function () { return null; });
    })).then(function () { return document.fonts.ready; })
      .catch(function () { return null; });
  };

  function wrap(ctx, text, maxWidth) {
    var out = [];
    String(text).split('\n').forEach(function (paragraph) {
      var words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      var line = words[0];
      for (var i = 1; i < words.length; i++) {
        var candidate = line + ' ' + words[i];
        if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
        else { out.push(line); line = words[i]; }
      }
      out.push(line);
    });
    return out;
  }

  /* Scale the handwritten title so it fills the page like the printed layouts:
     short titles grow, long ones shrink, and it never overflows the margins. */
  function fitTitleSize(ctx, text, maxWidth) {
    if (!text) return T.titleMinSize;
    ctx.font = '700 100px ' + FONTS.script;
    var widthAt100 = ctx.measureText(text).width;
    if (!widthAt100) return T.titleMinSize;

    var ideal = 100 * (maxWidth * T.titleFill) / widthAt100;
    var size = Math.max(T.titleMinSize, Math.min(T.titleMaxSize, ideal));

    // Guard against a family whose metrics differ from the measurement above.
    while (size > T.titleMinSize) {
      ctx.font = '700 ' + size + 'px ' + FONTS.script;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }

  /* Measure a row without drawing, so rows can be spaced evenly and nothing
     collides: the date reserves its real width, the day label its own column. */
  function measureRow(ctx, row) {
    // Date column: measure it, then keep the title clear of it.
    ctx.font = '700 ' + T.dateSize + 'px ' + FONTS.body;
    var dateWidth = row.date ? ctx.measureText(row.date).width : 0;
    var nameWidth = T.rightX - T.colX - (dateWidth ? dateWidth + 28 : 0);
    var noteWidth = T.rightX - T.colX - 40;

    // Day label: shrink to fit its own column rather than run under the text.
    var daySize = T.daySize;
    var dayRoom = T.colX - T.dayX - 22;
    while (daySize > 34) {
      ctx.font = '400 ' + daySize + 'px ' + FONTS.day;
      if (ctx.measureText(row.day).width <= dayRoom) break;
      daySize -= 2;
    }

    ctx.font = '300 ' + T.nameSize + 'px ' + FONTS.body;
    var nameLines = wrap(ctx, row.title, nameWidth);
    ctx.font = 'italic 700 ' + T.noteSize + 'px ' + FONTS.body;
    var noteLines = row.note ? wrap(ctx, row.note.toUpperCase(), noteWidth) : [];

    var height = nameLines.length * T.lineGap + 2 * T.lineGap;   // name + time + location
    if (noteLines.length) height += 16 + noteLines.length * T.noteGap;
    return {
      nameLines: nameLines,
      noteLines: noteLines,
      daySize: daySize,
      height: Math.max(height, daySize + 12)
    };
  }

  function drawRow(ctx, row, y, measured) {
    // Day label, e.g. TUE
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'left';
    ctx.font = '400 ' + measured.daySize + 'px ' + FONTS.day;
    ctx.fillText(row.day, T.dayX, y + measured.daySize * 0.78);

    var cursor = y + 34;

    // Event name
    ctx.fillStyle = COLORS.body;
    ctx.font = '300 ' + T.nameSize + 'px ' + FONTS.body;
    measured.nameLines.forEach(function (line) {
      ctx.fillText(line, T.colX, cursor);
      cursor += T.lineGap;
    });

    // Date, aligned to the right of the first line
    if (row.date) {
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.ink;
      ctx.font = '700 ' + T.dateSize + 'px ' + FONTS.body;
      ctx.fillText(row.date, T.rightX, y + 34);
      ctx.textAlign = 'left';
    }

    // Time / Location, grey label + darker value
    [['Time: ', row.time], ['Location: ', row.location]].forEach(function (pair) {
      ctx.font = '300 ' + T.metaSize + 'px ' + FONTS.body;
      ctx.fillStyle = COLORS.label;
      ctx.fillText(pair[0], T.colX, cursor);
      var offset = ctx.measureText(pair[0]).width;
      ctx.fillStyle = COLORS.body;
      ctx.fillText(pair[1] || '', T.colX + offset, cursor);
      cursor += T.lineGap;
    });

    // Note, bold italic caps
    if (measured.noteLines.length) {
      cursor += 16;
      ctx.font = 'italic 700 ' + T.noteSize + 'px ' + FONTS.body;
      ctx.fillStyle = COLORS.ink;
      measured.noteLines.forEach(function (line) {
        ctx.fillText(line, T.colX, cursor);
        cursor += T.noteGap;
      });
    }
  }

  var LOGO_SIZE = 46, LOGO_LEAD = 12;

  /* How tall the footer block is, so the rows never run into it. */
  function logoHeight(logoImage) {
    if (logoImage && logoImage.width && logoImage.height) {
      var scale = Math.min(460 / logoImage.width, 150 / logoImage.height);
      return logoImage.height * scale;
    }
    return LOGO_SIZE * 2 + LOGO_LEAD;
  }

  function drawLogo(ctx, logoImage) {
    var baseline = H - T.footerBottom;

    if (logoImage && logoImage.width && logoImage.height) {
      var maxW = 460, maxH = 150;
      var scale = Math.min(maxW / logoImage.width, maxH / logoImage.height);
      var w = logoImage.width * scale, h = logoImage.height * scale;
      ctx.drawImage(logoImage, (W - w) / 2, baseline - h, w, h);
      return;
    }

    // Wordmark: L X RUNNING / COMMUNITY.  (the X and the full stop are red)
    var size = LOGO_SIZE;
    ctx.font = '400 ' + size + 'px ' + FONTS.logo;
    ctx.textAlign = 'left';

    var top = [
      { text: 'L', color: COLORS.ink },
      { text: 'X', color: COLORS.red },
      { text: 'RUNNING', color: COLORS.ink }
    ];
    var bottom = [
      { text: 'COMMUNITY', color: COLORS.ink },
      { text: '.', color: COLORS.red }
    ];

    function widthOf(parts) {
      return parts.reduce(function (sum, p) { return sum + ctx.measureText(p.text).width; }, 0);
    }
    function render(parts, y) {
      var x = (W - widthOf(parts)) / 2;
      parts.forEach(function (p) {
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, x, y);
        x += ctx.measureText(p.text).width;
      });
    }

    render(top, baseline - size - LOGO_LEAD);
    render(bottom, baseline);
  }

  /* rows: [{day,title,time,location,note,date}] */
  LXRC.drawPoster = function (canvas, poster, logoImage) {
    var ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    // --- Handwritten title
    var title = poster.title || 'week schedule';
    var titleSize = fitTitleSize(ctx, title, W - T.marginX * 2);
    ctx.font = '700 ' + titleSize + 'px ' + FONTS.script;
    ctx.fillStyle = COLORS.red;
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, T.titleTop + titleSize * 0.72);

    var contentTop = T.titleTop + titleSize + 96;

    // --- Optional week-wide note under the title
    if (poster.headerNote) {
      ctx.font = 'italic 700 ' + T.headerNoteSize + 'px ' + FONTS.body;
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = 'center';
      wrap(ctx, poster.headerNote.toUpperCase(), W - T.marginX * 2 - 120).forEach(function (line) {
        ctx.fillText(line, W / 2, contentTop);
        contentTop += 36;
      });
      contentTop += 48;
    }

    ctx.textAlign = 'left';

    // --- Rows, spread evenly through the available space
    var rows = poster.rows || [];
    var measured = rows.map(function (row) { return measureRow(ctx, row); });
    var totalHeight = measured.reduce(function (sum, m) { return sum + m.height; }, 0);
    var footerTop = H - T.footerBottom - logoHeight(logoImage) - 56;
    var space = footerTop - contentTop - totalHeight;
    var gap = rows.length > 1
      ? Math.max(T.rowGapMin, Math.min(T.rowGapMax, space / (rows.length - 1)))
      : 0;

    // A very full week may still not fit: tighten the gaps, then start higher,
    // so the schedule never runs into the logo.
    var y = contentTop;
    var needed = totalHeight + gap * Math.max(0, rows.length - 1);
    if (y + needed > footerTop && rows.length > 1) {
      gap = Math.max(24, (footerTop - contentTop - totalHeight) / (rows.length - 1));
      needed = totalHeight + gap * (rows.length - 1);
    }
    if (y + needed > footerTop) {
      y = Math.max(T.titleTop + titleSize * 0.9, footerTop - needed);
    }

    rows.forEach(function (row, i) {
      drawRow(ctx, row, y, measured[i]);
      y += measured[i].height + gap;
    });

    drawLogo(ctx, logoImage);
    return canvas;
  };

  /* Turn the week model into the rows the renderer expects. */
  LXRC.posterModel = function (week) {
    return {
      title: week.posterTitle,
      headerNote: week.headerNote,
      rows: LXRC.activeSlots(week).map(function (slot) {
        var date = LXRC.parseISO(slot.dateISO);
        return {
          day: LXRC.DAYS_SHORT[date.getDay()],
          title: slot.title,
          time: slot.time,
          location: slot.location,
          note: slot.note,
          date: LXRC.posterDate(date)
        };
      })
    };
  };

  LXRC.posterFilename = function (week) {
    return 'lxrc-schedule-' + week.weekStart + '.png';
  };
})(window);
