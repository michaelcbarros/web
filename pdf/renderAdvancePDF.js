function getPdfLib() {
  const lib = (typeof window !== 'undefined' ? window.PDFLib : undefined) || globalThis.PDFLib;
  if (!lib) {
    throw new Error('PDFLib is not loaded. Ensure the pdf-lib script is included before app.js.');
  }
  return lib;
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export async function renderAdvancePDF(data, baseFileName = 'Show-Advance') {
  const { PDFDocument, StandardFonts, rgb } = getPdfLib();

  const doc = await PDFDocument.create();
  const pageMargin = 40;
  const pageSize = { width: 612, height: 792 }; // US Letter

  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.65, 0.05, 0.05);
  const labelColor = rgb(0.38, 0.38, 0.38);

  let page = doc.addPage([pageSize.width, pageSize.height]);
  let cursorY = pageSize.height - pageMargin;

  const columnGap = 18;
  const columnWidth = (pageSize.width - pageMargin * 2 - columnGap) / 2;

  const addPage = () => {
    page = doc.addPage([pageSize.width, pageSize.height]);
    cursorY = pageSize.height - pageMargin;
  };

  const ensureSpace = (height) => {
    if (cursorY - height < pageMargin) {
      addPage();
    }
  };

  const drawText = (text, { x, y, size = 10, font = regularFont, color = rgb(0, 0, 0) }) => {
    page.drawText(text, { x, y, size, font, color });
  };

  const drawTitle = (title, subtitle) => {
    ensureSpace(44);
    drawText(title || 'Show Advance', {
      x: pageMargin,
      y: cursorY,
      size: 20,
      font: boldFont
    });
    cursorY -= 22;

    [subtitle, data.venueName, data.venueStreet, data.venueCityStateZip]
      .filter(Boolean)
      .forEach((line) => {
        drawText(line, { x: pageMargin, y: cursorY, size: 11, font: regularFont });
        cursorY -= 14;
      });

    cursorY -= 6;
  };

  const drawSection = (title) => {
    ensureSpace(24);
    cursorY -= 6;
    drawText(title, { x: pageMargin, y: cursorY, size: 12, font: boldFont, color: red });
    cursorY -= 14;
  };

  const drawRow = (label, value, { columns = false } = {}) => {
    const text = value || 'N/A';
    const maxWidth = columns ? columnWidth - 10 : pageSize.width - pageMargin * 2 - 110;
    const lines = wrapText(text, boldFont, 10, maxWidth);
    const rowHeight = lines.length * 12;
    ensureSpace(rowHeight + 8);

    const startX = columns && cursorY - rowHeight < pageMargin ? pageMargin : pageMargin;
    const useColumns = Boolean(columns);

    if (useColumns) {
      if (!drawRow.columnIndex) drawRow.columnIndex = 0;
      const colX = pageMargin + (columnWidth + columnGap) * drawRow.columnIndex;
      if (cursorY - rowHeight < pageMargin) {
        drawRow.columnIndex = 0;
      }
      const adjustedColX = pageMargin + (columnWidth + columnGap) * drawRow.columnIndex;

      drawText(label, { x: adjustedColX, y: cursorY, size: 10, font: regularFont, color: labelColor });
      lines.forEach((line, idx) => {
        drawText(line, {
          x: adjustedColX,
          y: cursorY - 12 * (idx + 1),
          size: 10,
          font: boldFont
        });
      });
      cursorY -= rowHeight + 8;
      drawRow.columnIndex = (drawRow.columnIndex + 1) % 2;
      if (drawRow.columnIndex === 0) cursorY -= 6;
    } else {
      drawText(label, { x: startX, y: cursorY, size: 10, font: regularFont, color: labelColor });
      lines.forEach((line, idx) => {
        drawText(line, {
          x: startX + 120,
          y: cursorY - 12 * idx,
          size: 10,
          font: boldFont
        });
      });
      cursorY -= rowHeight + 8;
    }
  };

  const drawList = (label, values) => {
    const safeValues = values && values.length ? values : ['N/A'];
    const combined = safeValues.join(' · ');
    drawRow(label, combined);
  };

  drawTitle(data.eventName, data.eventDate);

  drawSection('Event Overview');
  drawRow('Promoter', data.promoterName);
  drawRow('Show Type', data.showType);
  drawRow('Venue Capacity', data.capacity);

  drawSection('At-a-glance');
  [
    ['Load-in', data.loadInTime],
    ['Soundcheck', data.soundcheckTime],
    ['Doors', data.doorsTime],
    ['Show Start', data.showStartTime],
    ['Set Lengths', data.setLengths],
    ['Curfew / Hard Out', data.curfew],
    ['Load-out', data.loadOutTime]
  ].forEach(([label, value]) => drawRow(label, value, { columns: true }));
  drawRow.columnIndex = 0;

  drawSection('Key Contacts');
  [
    ['Promoter / Event Management', data.keyPromoter],
    ['Venue GM', data.keyVenueGm],
    ['Day-of Show Runner', data.keyRunner],
    ['Production Manager', data.keyProductionManager],
    ['Security Lead', data.keySecurityLead],
    ['Box Office Lead', data.keyBoxOfficeLead],
    ['Artist Tour Manager / Advancing', data.keyTourManager],
    ['FOH Engineer', data.keyFohEngineer]
  ].forEach(([label, value]) => drawRow(label, value, { columns: true }));
  drawRow.columnIndex = 0;

  drawSection('Ticketing / Box Office');
  [
    ['Ticket Platform', data.ticketPlatform],
    ['Box Office Open', data.boxOfficeOpen],
    ['Will Call Process', data.willCallProcess],
    ['Format (Reserved vs GA)', data.format],
    ['Artist Comps', data.artistComps],
    ['Venue Comps', data.venueComps],
    ['On-Sale Date / Time', data.onSaleDateTime],
    ['Door Price', data.doorPrice],
    ['ADA Needs', data.adaNeeds]
  ].forEach(([label, value]) => drawRow(label, value, { columns: true }));
  drawRow.columnIndex = 0;

  drawSection('Load-in & Parking');
  drawRow('Load-in Entrance / Address', data.loadInAddress);
  drawRow('Dock / Ramp Notes', data.dockNotes);
  drawRow('Parking Instructions', data.parkingInstructions);
  drawRow('Credentials / Access Notes', data.accessNotes);

  drawSection('House Management');
  drawRow('Strobe Lights', data.strobeLights);
  drawRow('Audience Photo / Video Policy', data.audiencePolicy);
  drawRow('Professional Photo / Video', data.professionalPhotoVideo);
  drawRow('GA Reserved Seats', data.gaReservedSeats);

  drawSection('Hospitality & Catering');
  [
    ['Budget', data.budget],
    ['Caterer', data.caterer],
    ['Meals for # Artists / Personnel', data.mealsFor],
    ['Meal Times', data.mealTimes],
    ['Dietary Restrictions', data.dietaryRestrictions],
    ['Meal Location', data.mealLocation]
  ].forEach(([label, value]) => drawRow(label, value, { columns: true }));
  drawRow.columnIndex = 0;

  drawSection('Transportation');
  drawRow('Transportation Notes', data.transportationNotes);

  drawSection('Merchandise');
  [
    ['Merch Allowed', data.merchAllowed],
    ['Merch Location', data.merchLocation],
    ['Cashless Policy', data.cashlessPolicy],
    ['Staffing', data.merchStaffing],
    ['Merch Split %', data.merchSplit]
  ].forEach(([label, value]) => drawRow(label, value, { columns: true }));
  drawRow.columnIndex = 0;

  drawSection('Lodging');
  [
    ['Artist Provides vs Venue Provides', data.lodgingProvider],
    ['Rooms / Nights', data.roomsNights],
    ['Property Name', data.propertyName],
    ['Check-in / Check-out', data.checkInCheckOut],
    ['Names / Confirmation Numbers', data.namesConfirmations]
  ].forEach(([label, value]) => drawRow(label, value, { columns: true }));
  drawRow.columnIndex = 0;

  drawSection('Security & Staffing');
  [
    ['Bag Check', data.bagCheck],
    ['Theater Security', data.theaterSecurity],
    ['Re-entry Policy', data.reEntryPolicy],
    ['Bag Policy Details', data.bagPolicyDetails],
    ['Barricade Security', data.barricadeSecurity],
    ['Artist Escort Policy', data.artistEscortPolicy],
    ['Emergency Procedures', data.emergencyProcedures]
  ].forEach(([label, value]) => drawRow(label, value));

  drawSection('Production Requirements');
  [
    ['Staging', data.staging],
    ['Drum Riser / Platforms', data.stagePlatforms],
    ['Lighting / Haze', data.lightingHaze],
    ['Rigging', data.linesetRigging],
    ['Plot', data.plot],
    ['Audio - Band Provides', data.audioBackline],
    ['Audio - Venue Provides', data.productionOther],
    ['Audio Notes', data.productionNotes],
    ['Video Streaming', data.videoStreaming],
    ['Piano / Tuning', data.pianoTuning],
    ['Crew - They Bring', data.crewTheyBring],
    ['Crew - We Provide', data.crewWeProvide]
  ].forEach(([label, value]) => drawRow(label, value));

  drawSection('Next Time Notes');
  drawRow('Notes', data.nextTimeNotes);

  drawSection('Contacts');
  const contactLines = (data.contacts || []).map((c, idx) => {
    const name = c.name || 'Name';
    const email = c.email || 'Email';
    const phone = c.phone || 'Phone';
    const role = c.role || 'Role';
    return `${idx + 1}. ${name} — ${email} — ${phone} — ${role}`;
  });
  drawList('Contact List', contactLines);

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseFileName}.pdf`;
  link.click();

  URL.revokeObjectURL(url);
}
