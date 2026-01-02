const form = document.getElementById('advance-form');
const preview = document.getElementById('pdf-preview');
const addContactButton = document.getElementById('add-contact');
const contactsContainer = document.getElementById('contact-rows');
const modeSelect = document.getElementById('mode-select');
const previewButtons = [
  document.getElementById('preview-button'),
  document.getElementById('refresh-preview-footer')
];

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function valueOrPlaceholder(value, { multiline = true } = {}) {
  const raw = (value || '').trim();

  if (!raw) {
    return '<span class="value-text">TBD</span>';
  }

  const normalized = raw.toLowerCase();
  if (normalized === 'n/a' || normalized === 'na' || normalized === 'not applicable') {
    return '<span class="value-text">N/A</span>';
  }

  const safe = escapeHtml(raw);
  const formatted = multiline ? safe.replace(/\n/g, '<br />') : safe;
  return `<span class="value-text${multiline ? ' multiline' : ''}">${formatted}</span>`;
}

function buildField(label, value, options = {}) {
  const { internalOnly = false, mode = 'production', hideIfEmptyInProduction = false } = options;

  if (internalOnly && mode === 'production') {
    return '';
  }

  const raw = (value || '').trim();
  if (hideIfEmptyInProduction && mode === 'production' && !raw) {
    return '';
  }

  return `
    <div class="field-row">
      <span class="field-label">${label}:</span>
      <span class="field-value">${valueOrPlaceholder(value, options)}</span>
    </div>
  `;
}

function buildCheckboxRow(label, value, options = {}) {
  const { internalOnly = false, mode = 'production', hideIfEmptyInProduction = false } = options;
  if (internalOnly && mode === 'production') return '';

  const raw = (value || '').trim();
  if (hideIfEmptyInProduction && mode === 'production' && !raw) return '';

  const normalized = raw.toLowerCase();
  const isYes = ['yes', 'y', 'true', '1'].includes(normalized);
  const isNo = ['no', 'n', 'false', '0'].includes(normalized);

  const yesMark = isYes ? '☑' : '☐';
  const noMark = isNo ? '☑' : '☐';

  return `
    <div class="field-row">
      <span class="field-label">${label}:</span>
      <span class="field-value checkbox-set">
        <span class="box">${yesMark} Yes</span>
        <span class="box">${noMark} No</span>
      </span>
    </div>
  `;
}

function groupFields(rows) {
  const filtered = rows.filter(Boolean);
  if (!filtered.length) return '';
  return `<div class="field-group">${filtered.join('')}</div>`;
}

function buildSection(title, fieldsHtml, options = {}) {
  const { className = '', multiColumn = false, omitHeading = false } = options;
  const sectionClass = className ? `pdf-section ${className}` : 'pdf-section';
  const bodyClass = multiColumn ? 'section-body columns' : 'section-body';

  return `
    <section class="${sectionClass}">
      ${omitHeading ? '' : `<h3>${title}</h3>`}
      <div class="${bodyClass}">${fieldsHtml}</div>
    </section>
  `;
}

function buildContactsTable(contacts) {
  const rows =
    contacts.length === 0
      ? `<tr><td colspan="4"><span class="value-text">TBD</span></td></tr>`
      : contacts
          .map(
            (contact) => `
          <tr>
            <td>${valueOrPlaceholder(contact.name, { multiline: false })}</td>
            <td>${valueOrPlaceholder(contact.email, { multiline: false })}</td>
            <td>${valueOrPlaceholder(contact.phone, { multiline: false })}</td>
            <td>${valueOrPlaceholder(contact.role, { multiline: false })}</td>
          </tr>
        `
          )
          .join('');

  return `
    <section class="pdf-section">
      <h3>Contacts</h3>
      <div class="section-body">
        <table class="contacts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function collectContacts() {
  const contacts = [];

  contactsContainer.querySelectorAll('.contact-row').forEach((row) => {
    contacts.push({
      name: row.querySelector('[data-contact="name"]').value.trim(),
      email: row.querySelector('[data-contact="email"]').value.trim(),
      phone: row.querySelector('[data-contact="phone"]').value.trim(),
      role: row.querySelector('[data-contact="role"]').value.trim()
    });
  });

  return contacts.length ? contacts : [{ name: '', email: '', phone: '', role: '' }];
}

function collectFormData() {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.contacts = collectContacts();
  data.mode = modeSelect?.value || 'production';
  return data;
}

function buildFileName(data) {
  const rawName = data.eventName?.trim() || 'Event';
  const namePart = rawName.replace(/\s+/g, '_').replace(/[^\w.-]/g, '') || 'Event';
  const datePart = data.eventDate?.trim() || new Date().toISOString().slice(0, 10);
  return `Show-Advance_${namePart}_${datePart}`;
}

function renderPreview(passedData) {
  const data = passedData || collectFormData();
  const mode = data.mode || 'production';
  const venueAddress = [data.venueStreet, data.venueCityStateZip].filter(Boolean).join(', ');
  const lodgingFields = [
    data.lodgingProvider,
    data.roomsNights,
    data.propertyName,
    data.checkInCheckOut,
    data.namesConfirmations
  ];
  const lodgingAllEmpty = lodgingFields.every((field) => !field || !field.trim());
  const lodgingOptOut =
    lodgingAllEmpty ||
    ['n/a', 'na', 'not applicable', 'none', 'no lodging'].includes(
      (data.lodgingProvider || '').trim().toLowerCase()
    ) ||
    false;

  const lodgingValue = (value) => (lodgingOptOut && !value ? 'N/A' : value);

  const headerBlock = `
    <div class="pdf-title">
      ${valueOrPlaceholder(data.eventName, { multiline: false })}
    </div>
    <div class="pdf-date">${valueOrPlaceholder(data.eventDate, { multiline: false })}</div>
    <div class="pdf-venue">${valueOrPlaceholder(data.venueName, { multiline: false })}</div>
    <div class="pdf-address">${valueOrPlaceholder(venueAddress, { multiline: false })}</div>
  `;

  const headerSection = buildSection('Header', headerBlock, {
    className: 'section-spacing hero-section',
    omitHeading: true
  });

  const overviewSection = buildSection(
    'Event Overview',
    groupFields([
      buildField('Promoter', data.promoterName, { mode }),
      buildField('Show Type', data.showType, { mode }),
      buildField('Venue Capacity', data.capacity, { mode })
    ]),
    { className: 'section-spacing' }
  );

  const atAGlanceSection = buildSection(
    'At-a-glance',
    groupFields([
      buildField('Load-in', data.loadInTime, { mode }),
      buildField('Soundcheck', data.soundcheckTime, { mode }),
      buildField('Doors', data.doorsTime, { mode }),
      buildField('Show Start', data.showStartTime, { mode }),
      buildField('Set Lengths', data.setLengths, { mode }),
      buildField('Curfew / Hard Out', data.curfew, { mode }),
      buildField('Load-out', data.loadOutTime, { mode })
    ]) +
      groupFields([
        buildField('Promoter / Event Management', data.keyPromoter, { mode }),
        buildField('Venue GM', data.keyVenueGm, { mode }),
        buildField('Day-of Show Runner', data.keyRunner, { mode }),
        buildField('Production Manager', data.keyProductionManager, { mode }),
        buildField('Security Lead', data.keySecurityLead, { mode }),
        buildField('Box Office Lead', data.keyBoxOfficeLead, { mode }),
        buildField('Artist Tour Manager / Advancing', data.keyTourManager, { mode }),
        buildField('FOH Engineer', data.keyFohEngineer, { mode })
      ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const eventDetailsSection = buildSection(
    'Event Details',
    groupFields([
      buildField('Announce Date', data.announceDate, { mode }),
      buildField('On-Sale Date / Time', data.onSaleDateTime, { mode }),
      buildField('Event Date(s)', data.eventDates, { mode }),
      buildField('Doors / ROS Line', data.doorsRos, { mode })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const scheduleSection = buildSection(
    'Schedule / Timeline',
    groupFields([
      buildField('Load-in', data.loadInTime, { mode }),
      buildField('Soundcheck', data.soundcheckTime, { mode }),
      buildField('Doors', data.doorsTime, { mode }),
      buildField('Show Start', data.showStartTime, { mode }),
      buildField('Set Lengths (Support / Headliner)', data.setLengths, { mode }),
      buildField('Curfew / Hard Out', data.curfew, { mode }),
      buildField('Load-out', data.loadOutTime, { mode })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const talentSection = buildSection(
    'Event Talent',
    groupFields([buildField('Headliner', data.headliner, { mode }) + buildField('Support', data.support, { mode })])
  );

  const keyContactsSection = buildSection(
    'Key Contacts',
    groupFields([
      buildField('Promoter / Event Management', data.keyPromoter, { mode }),
      buildField('Venue GM', data.keyVenueGm, { mode }),
      buildField('Day-of Show Runner', data.keyRunner, { mode }),
      buildField('Production Manager', data.keyProductionManager, { mode }),
      buildField('Security Lead', data.keySecurityLead, { mode }),
      buildField('Box Office Lead', data.keyBoxOfficeLead, { mode }),
      buildField('Artist Tour Manager / Advancing', data.keyTourManager, { mode }),
      buildField('FOH Engineer', data.keyFohEngineer, { mode })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const ticketingSection = buildSection(
    'Ticketing / Box Office',
    groupFields([
      buildField('Ticket Platform', data.ticketPlatform, { mode }),
      buildField('Box Office Open', data.boxOfficeOpen, { mode }),
      buildField('Will Call Process', data.willCallProcess, { mode }),
      buildField('Format (Reserved vs GA)', data.format, { mode }),
      buildField('Artist Comps', data.artistComps, { mode }),
      buildField('Venue Comps', data.venueComps, { mode }),
      buildField('On-Sale Date / Time', data.onSaleDateTime, { mode }),
      buildField('Door Price', data.doorPrice, { mode, internalOnly: true }),
      buildField('ADA Needs', data.adaNeeds, { mode })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const loadInSection = buildSection(
    'Load-in & Parking',
    groupFields([
      buildField('Load-in Entrance / Address', data.loadInAddress, { mode }),
      buildField('Dock / Ramp Notes', data.dockNotes, { mode }),
      buildField('Parking Instructions', data.parkingInstructions, { mode }),
      buildField('Credentials / Access Notes', data.accessNotes, { mode })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const houseSection = buildSection(
    'House Management',
    groupFields([
      buildCheckboxRow('Strobe Lights', data.strobeLights, { mode, hideIfEmptyInProduction: true }),
      buildField('Audience Photo / Video Policy', data.audiencePolicy, { mode }),
      buildField('Professional Photo / Video', data.professionalPhotoVideo, {
        mode,
        hideIfEmptyInProduction: true
      }),
      buildCheckboxRow('GA Reserved Seats', data.gaReservedSeats, { mode })
    ])
  );

  const hospitalitySection = buildSection(
    'Hospitality & Catering',
    groupFields([
      buildField('Budget', data.budget, { mode }),
      buildField('Caterer', data.caterer, { mode }),
      buildField('Meals for # Artists / Personnel', data.mealsFor, { mode }),
      buildField('Meal Times', data.mealTimes, { mode }),
      buildField('Dietary Restrictions', data.dietaryRestrictions, { mode }),
      buildField('Meal Location', data.mealLocation, { mode })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const transportationSection = buildSection(
    'Transportation',
    groupFields([buildField('Transportation Notes', data.transportationNotes, { mode })]),
    { className: 'section-spacing' }
  );

  const merchandiseSection = buildSection(
    'Merchandise',
    groupFields([
      buildCheckboxRow('Merch Allowed', data.merchAllowed, { mode }),
      buildField('Merch Location', data.merchLocation, { mode }),
      buildField('Cashless Policy', data.cashlessPolicy, { mode }),
      buildField('Staffing', data.merchStaffing, { mode }),
      buildField('Merch Split %', data.merchSplit, { mode, internalOnly: true })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const lodgingSection = buildSection(
    'Lodging',
    groupFields([
      buildField('Artist Provides vs Venue Provides', lodgingValue(data.lodgingProvider), { mode }),
      buildField('Rooms / Nights', lodgingValue(data.roomsNights), { mode }),
      buildField('Property Name', lodgingValue(data.propertyName), { mode }),
      buildField('Check-in / Check-out', lodgingValue(data.checkInCheckOut), { mode }),
      buildField('Names / Confirmation Numbers', lodgingValue(data.namesConfirmations), { mode })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const securitySection = buildSection(
    'Security & Staffing',
    groupFields([
      buildCheckboxRow('Bag Check', data.bagCheck, { mode }),
      buildCheckboxRow('Theater Security', data.theaterSecurity, { mode }),
      buildField('Re-entry Policy', data.reEntryPolicy, { mode }),
      buildField('Bag Policy Details', data.bagPolicyDetails, { mode }),
      buildCheckboxRow('Barricade Security', data.barricadeSecurity, { mode }),
      buildField('Artist Escort Policy', data.artistEscortPolicy, { mode }),
      buildField('Emergency Procedures', data.emergencyProcedures, { mode })
    ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const productionSection = buildSection(
    'Production Requirements',
    groupFields([
      buildField('Staging', data.staging, { mode }),
      buildField('Drum Riser / Platforms', data.stagePlatforms, { mode }),
      buildField('Lighting / Haze', data.lightingHaze, { mode })
    ]) +
      groupFields([
        buildField('Rigging', data.linesetRigging, { mode }),
        buildField('Plot', data.plot, { mode })
      ]) +
      groupFields([
        buildField('Audio - Band Provides', data.audioBackline, { mode }),
        buildField('Audio - Venue Provides', data.productionOther, {
          mode,
          hideIfEmptyInProduction: true
        }),
        buildField('Audio Notes', data.productionNotes, { mode })
      ]) +
      groupFields([
        buildField('Video Streaming', data.videoStreaming, { mode, hideIfEmptyInProduction: true }),
        buildField('Piano / Tuning', data.pianoTuning, {
          mode,
          hideIfEmptyInProduction: true
        })
      ]) +
      groupFields([
        buildField('Crew - They Bring', data.crewTheyBring, { mode }),
        buildField('Crew - We Provide', data.crewWeProvide, { mode })
      ]),
    { className: 'section-spacing', multiColumn: true }
  );

  const settlementSection =
    mode === 'production'
      ? ''
      : buildSection(
          'Settlement (Internal)',
          buildField('Settlement Location', data.settlementLocation, { mode }) +
            buildField('Who Attends', data.settlementAttendees, { mode }) +
            buildField('Paperwork Required', data.settlementPaperwork, { mode }) +
            buildField('Payment Method', data.settlementPaymentMethod, { mode }) +
            buildField('Cut-off Time', data.settlementCutoff, { mode }),
          { className: 'section-spacing' }
        );

  const nextTimeSection = buildSection(
    'Next Time Notes',
    buildField('Notes', data.nextTimeNotes, { mode }),
    { className: 'section-spacing' }
  );

  const contactsSection = buildContactsTable(data.contacts);

  preview.innerHTML = `
    <div class="top-grid">
      ${headerSection}
      ${overviewSection}
    </div>
    <div class="top-grid">
      ${atAGlanceSection}
      ${keyContactsSection}
    </div>
    ${eventDetailsSection}
    ${scheduleSection}
    ${talentSection}
    ${ticketingSection}
    ${loadInSection}
    ${houseSection}
    ${hospitalitySection}
    ${transportationSection}
    ${merchandiseSection}
    ${lodgingSection}
    ${securitySection}
    ${productionSection}
    ${settlementSection}
    ${nextTimeSection}
    ${contactsSection}
    <div class="page-number"></div>
    <div id="print-footer" class="print-footer">Powered by Didactidigital</div>
  `;
}

function addContactRow(values = { name: '', email: '', phone: '', role: '' }) {
  const row = document.createElement('div');
  row.className = 'contact-row';
  row.innerHTML = `
    <label class="input-field">
      <span>Name</span>
      <input type="text" data-contact="name" value="${escapeHtml(values.name)}" />
    </label>
    <label class="input-field">
      <span>Email</span>
      <input type="email" data-contact="email" value="${escapeHtml(values.email)}" />
    </label>
    <label class="input-field">
      <span>Phone</span>
      <input type="text" data-contact="phone" value="${escapeHtml(values.phone)}" />
    </label>
    <label class="input-field">
      <span>Role</span>
      <input type="text" data-contact="role" value="${escapeHtml(values.role)}" />
    </label>
    <button type="button" class="remove-contact ghost small">Remove</button>
  `;

  contactsContainer.appendChild(row);
}

function handleGenerate(event) {
  event.preventDefault();
  const data = collectFormData();
  renderPreview(data);
  const previousTitle = document.title;
  const fileName = buildFileName(data);
  document.title = fileName;

  requestAnimationFrame(() => {
    window.print();
    setTimeout(() => {
      document.title = previousTitle;
    }, 150);
  });
}

function attachEvents() {
  form.addEventListener('submit', handleGenerate);
  form.addEventListener('input', () => renderPreview());

  modeSelect?.addEventListener('change', () => renderPreview());

  previewButtons.forEach((button) => {
    if (button) {
      button.addEventListener('click', renderPreview);
    }
  });

  addContactButton?.addEventListener('click', () => {
    addContactRow();
    renderPreview();
  });

  contactsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-contact')) {
      if (contactsContainer.children.length > 1) {
        event.target.closest('.contact-row').remove();
        renderPreview();
      }
    }
  });
}

function init() {
  if (contactsContainer.children.length === 0) {
    addContactRow();
  }

  attachEvents();
  renderPreview();
}

init();
