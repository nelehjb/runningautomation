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
    titleTop: 120,
    titleMaxSize: 156,
    titleMinSize: 64,
    titleMaxLines: 2,         // the title stacks like SUNSET / BEACH RUN
    titleLead: 0.88,          // line height of the stacked title, in ems
    titleGap: 64,             // clear space under the title
    headerNoteSize: 32,
    headerNoteGap: 42,
    dayX: 100,
    colX: 262,
    rightX: 984,
    daySize: 88,
    nameSize: 46,
    metaSize: 32,
    noteSize: 30,
    dateSize: 36,
    rowTextTop: 40,           // first text baseline, measured from the row top
    nameGap: 52,
    lineGap: 42,
    noteGap: 36,
    rowGapTight: 32,          // the closest two rows are ever set
    rowGapMax: 180,
    rowMinScale: 0.68,        // how far the row text may shrink for a full week
    footerBottom: 96
  };

  /* The club's type: Anton for the display lines, Poppins for everything that
     has to be read, Montserrat for the wordmark. */
  var FONTS = {
    display: '"Anton", "Haettenschweiler", "Arial Narrow", sans-serif',
    body: '"Poppins", "Century Gothic", system-ui, sans-serif',
    logo: '"Montserrat", "Poppins", system-ui, sans-serif'
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
      '400 156px "Anton"',
      '400 88px "Anton"',
      '400 46px "Anton"',
      '300 34px "Poppins"',
      '400 32px "Poppins"',
      'italic 400 32px "Poppins"',
      '700 46px "Montserrat"',
      '800 46px "Montserrat"'
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

  function widestLine(ctx, lines) {
    return lines.reduce(function (widest, line) {
      return Math.max(widest, ctx.measureText(line).width);
    }, 0);
  }

  /* Set the title as large as it goes: keep the display size and let a long
     title stack onto a second line, only shrinking once it needs a third one —
     or once a full week leaves it less room than maxHeight. */
  function fitTitle(ctx, text, maxWidth, maxHeight) {
    var size = T.titleMaxSize;
    var lines = [text];
    while (size > T.titleMinSize) {
      ctx.font = '400 ' + size + 'px ' + FONTS.display;
      lines = wrap(ctx, text, maxWidth);
      if (lines.length <= T.titleMaxLines
          && widestLine(ctx, lines) <= maxWidth
          && lines.length * size * T.titleLead <= maxHeight) break;
      size -= 2;
    }
    return { size: size, lines: lines, height: lines.length * size * T.titleLead };
  }

  /* Row type sizes, all scaled together: a week with five runs in it sets a
     little smaller rather than running into the logo. */
  function rowType(scale) {
    return {
      scale: scale,
      daySize: T.daySize * scale,
      nameSize: T.nameSize * scale,
      metaSize: T.metaSize * scale,
      noteSize: T.noteSize * scale,
      dateSize: T.dateSize * scale,
      textTop: T.rowTextTop * scale,
      nameGap: T.nameGap * scale,
      lineGap: T.lineGap * scale,
      noteGap: T.noteGap * scale,
      noteLead: 16 * scale
    };
  }

  function blockHeight(measured) {
    return measured.reduce(function (sum, m) { return sum + m.height; }, 0);
  }

  /* Measure a row without drawing, so rows can be spaced evenly and nothing
     collides: the date reserves its real width, the day label its own column. */
  function measureRow(ctx, row, type) {
    // Date column: measure it, then keep the title clear of it.
    ctx.font = '400 ' + type.dateSize + 'px ' + FONTS.body;
    var dateWidth = row.date ? ctx.measureText(row.date).width : 0;
    var nameWidth = T.rightX - T.colX - (dateWidth ? dateWidth + 28 : 0);
    var noteWidth = T.rightX - T.colX - 40;

    // Day label: shrink to fit its own column rather than run under the text.
    var daySize = type.daySize;
    var dayFloor = 34 * type.scale;
    var dayRoom = T.colX - T.dayX - 22;
    while (daySize > dayFloor) {
      ctx.font = '400 ' + daySize + 'px ' + FONTS.display;
      if (ctx.measureText(row.day).width <= dayRoom) break;
      daySize -= 2;
    }

    ctx.font = '400 ' + type.nameSize + 'px ' + FONTS.display;
    var nameLines = wrap(ctx, row.title, nameWidth);
    ctx.font = '400 ' + type.noteSize + 'px ' + FONTS.body;
    var noteLines = row.note ? wrap(ctx, row.note, noteWidth) : [];

    // name + time + location
    var height = nameLines.length * type.nameGap + 2 * type.lineGap;
    if (noteLines.length) height += type.noteLead + noteLines.length * type.noteGap;
    return {
      type: type,
      nameLines: nameLines,
      noteLines: noteLines,
      daySize: daySize,
      height: Math.max(height, daySize + 12)
    };
  }

  function drawRow(ctx, row, y, measured) {
    var type = measured.type;

    // Day label, e.g. TUE
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'left';
    ctx.font = '400 ' + measured.daySize + 'px ' + FONTS.display;
    ctx.fillText(row.day, T.dayX, y + measured.daySize * 0.78);

    var cursor = y + type.textTop;

    // Event name, in the display face
    ctx.fillStyle = COLORS.ink;
    ctx.font = '400 ' + type.nameSize + 'px ' + FONTS.display;
    measured.nameLines.forEach(function (line) {
      ctx.fillText(line, T.colX, cursor);
      cursor += type.nameGap;
    });

    // Date, aligned to the right of the first line
    if (row.date) {
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.ink;
      ctx.font = '400 ' + type.dateSize + 'px ' + FONTS.body;
      ctx.fillText(row.date, T.rightX, y + type.textTop);
      ctx.textAlign = 'left';
    }

    // Time / Location, grey label + darker value; the meeting place is italic.
    [['Time: ', row.time, ''], ['Location: ', row.location, 'italic ']].forEach(function (pair) {
      ctx.font = '400 ' + type.metaSize + 'px ' + FONTS.body;
      ctx.fillStyle = COLORS.label;
      ctx.fillText(pair[0], T.colX, cursor);
      var offset = ctx.measureText(pair[0]).width;
      ctx.font = pair[2] + '400 ' + type.metaSize + 'px ' + FONTS.body;
      ctx.fillStyle = COLORS.body;
      ctx.fillText(pair[1] || '', T.colX + offset, cursor);
      cursor += type.lineGap;
    });

    // Note, as written
    if (measured.noteLines.length) {
      cursor += type.noteLead;
      ctx.font = '400 ' + type.noteSize + 'px ' + FONTS.body;
      ctx.fillStyle = COLORS.ink;
      measured.noteLines.forEach(function (line) {
        ctx.fillText(line, T.colX, cursor);
        cursor += type.noteGap;
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
    ctx.font = '800 ' + size + 'px ' + FONTS.logo;
    ctx.textAlign = 'left';
    // Tracking, where the browser supports it — measureText follows it, so the
    // centring below stays right either way.
    var tracking = ctx.letterSpacing;
    ctx.letterSpacing = '2px';

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
    ctx.font = '700 ' + size + 'px ' + FONTS.logo;
    render(bottom, baseline);

    ctx.letterSpacing = tracking || '0px';
  }

  /* rows: [{day,title,time,location,note,date}] */
  LXRC.drawPoster = function (canvas, poster, logoImage) {
    var ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    var rows = poster.rows || [];
    var maxWidth = W - T.marginX * 2;
    var footerTop = H - T.footerBottom - logoHeight(logoImage) - 56;

    // --- Work out the sizes before drawing anything, so a full week is set
    //     smaller instead of running into the week note or the logo.
    ctx.font = 'italic 400 ' + T.headerNoteSize + 'px ' + FONTS.body;
    var headerLines = poster.headerNote ? wrap(ctx, poster.headerNote, maxWidth - 120) : [];
    var headerHeight = headerLines.length ? headerLines.length * T.headerNoteGap + 44 : 0;

    var tightGaps = T.rowGapTight * Math.max(0, rows.length - 1);
    var measured = rows.map(function (row) { return measureRow(ctx, row, rowType(1)); });

    // The rows are served first; whatever is left is the title's to fill.
    var titleRoom = footerTop - T.titleTop - T.titleGap - headerHeight
                  - blockHeight(measured) - tightGaps;
    var title = String(poster.title || 'week schedule').toUpperCase();
    var fitted = fitTitle(ctx, title, maxWidth, titleRoom);

    var contentTop = T.titleTop + fitted.height + T.titleGap + headerHeight;

    // Still too tall — the title is already at its floor, so shrink the rows.
    var scale = 1;
    while (scale > T.rowMinScale
           && contentTop + blockHeight(measured) + tightGaps > footerTop) {
      scale -= 0.04;
      measured = rows.map(function (row) { return measureRow(ctx, row, rowType(scale)); });
    }

    // --- Display title
    ctx.font = '400 ' + fitted.size + 'px ' + FONTS.display;
    ctx.fillStyle = COLORS.red;
    ctx.textAlign = 'center';
    var titleBaseline = T.titleTop + fitted.size * 0.76;
    fitted.lines.forEach(function (line) {
      ctx.fillText(line, W / 2, titleBaseline);
      titleBaseline += fitted.size * T.titleLead;
    });

    // --- Optional week-wide note under the title
    if (headerLines.length) {
      ctx.font = 'italic 400 ' + T.headerNoteSize + 'px ' + FONTS.body;
      ctx.fillStyle = COLORS.ink;
      var noteY = T.titleTop + fitted.height + T.titleGap;
      headerLines.forEach(function (line) {
        ctx.fillText(line, W / 2, noteY);
        noteY += T.headerNoteGap;
      });
    }

    ctx.textAlign = 'left';

    // --- Rows, spread through whatever room is left
    var totalHeight = blockHeight(measured);
    var space = footerTop - contentTop - totalHeight;
    // Whatever room is left is shared between the rows: the shrinking above
    // aims for rowGapTight, but a week that will not shrink that far closes the
    // gaps rather than running past the logo.
    var gap = rows.length > 1
      ? Math.max(0, Math.min(T.rowGapMax, space / (rows.length - 1)))
      : 0;

    // Room to spare (a short week): sit the block between title and logo
    // rather than leaving all of the air at the bottom.
    var leftover = space - gap * Math.max(0, rows.length - 1);
    var y = contentTop + Math.max(0, leftover) / 2;
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
