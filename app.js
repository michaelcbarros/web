const form = document.getElementById('advance-form');
const preview = document.getElementById('pdf-preview');
const addContactButton = document.getElementById('add-contact');
const contactsContainer = document.getElementById('contact-rows');
const previewButtons = [
  document.getElementById('preview-button'),
  document.getElementById('refresh-preview-footer')
];

const blankLine = '<span class="blank-line"></span>';

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function valueOrBlank(value, { multiline = true, large = false } = {}) {
  if (!value) {
    return `<span class="blank-line${large ? ' large' : ''}"></span>`;
  }

  const safe = escapeHtml(value);
  const formatted = multiline ? safe.replace(/\n/g, '<br />') : safe;
  return `<span class="value-text">${formatted}</span>`;
}

function buildField(label, value, options = {}) {
  return `
    <div class="field-row">
      <span class="field-label">${label}:</span>
      <span class="field-value">${valueOrBlank(value, options)}</span>
    </div>
  `;
}

function buildSection(title, fieldsHtml) {
  return `
    <section class="pdf-section">
      <h3>${title}</h3>
      ${fieldsHtml}
    </section>
  `;
}

function buildContactsTable(contacts) {
  const rows =
    contacts.length === 0
      ? `<tr><td colspan="4">${blankLine}</td></tr>`
      : contacts
          .map(
            (contact) => `
          <tr>
            <td>${valueOrBlank(contact.name, { multiline: false })}</td>
            <td>${valueOrBlank(contact.email, { multiline: false })}</td>
            <td>${valueOrBlank(contact.phone, { multiline: false })}</td>
            <td>${valueOrBlank(contact.role, { multiline: false })}</td>
          </tr>
        `
          )
          .join('');

  return `
    <section class="pdf-section">
      <h3>Contacts</h3>
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
  const venueAddress = [data.venueStreet, data.venueCityStateZip].filter(Boolean).join(', ');

  const headerBlock = `
    <div class="pdf-title">
      ${valueOrBlank(data.eventName, { multiline: false, large: true })}
    </div>
    <div class="pdf-subtitle">${valueOrBlank(data.eventDate, { multiline: false })}</div>
    <div class="pdf-subtitle">${valueOrBlank(data.venueName, { multiline: false })}</div>
    <div class="pdf-subtitle">${valueOrBlank(venueAddress, { multiline: false })}</div>
  `;

  const headerSection = buildSection(
    'Header',
    buildField('Event Name', data.eventName) +
      buildField('Event Date', data.eventDate) +
      buildField('Venue Name', data.venueName) +
      buildField('Venue Address', venueAddress)
  );

  const eventDetailsSection = buildSection(
    'Event Details',
    buildField('Announce Date', data.announceDate) +
      buildField('On-Sale Date / Time', data.onSaleDateTime) +
      buildField('Event Date(s)', data.eventDates) +
      buildField('Doors / ROS Line', data.doorsRos)
  );

  const talentSection = buildSection(
    'Event Talent',
    buildField('Headliner', data.headliner) + buildField('Support', data.support)
  );

  const ticketingSection = buildSection(
    'Ticketing / Box Office',
    buildField('Capacity', data.capacity) +
      buildField('Format (Reserved vs GA)', data.format) +
      buildField('Artist Comps', data.artistComps) +
      buildField('Venue Comps', data.venueComps) +
      buildField('ADA Needs', data.adaNeeds)
  );

  const houseSection = buildSection(
    'House Management',
    buildField('Strobe Lights', data.strobeLights) +
      buildField('Audience Photo / Video Policy', data.audiencePolicy) +
      buildField('Professional Photo / Video', data.professionalPhotoVideo) +
      buildField('GA Reserved Seats', data.gaReservedSeats)
  );

  const hospitalitySection = buildSection(
    'Hospitality & Catering',
    buildField('Budget', data.budget) +
      buildField('Caterer', data.caterer) +
      buildField('Meals for # Artists / Personnel', data.mealsFor) +
      buildField('Meal Times', data.mealTimes) +
      buildField('Dietary Restrictions', data.dietaryRestrictions) +
      buildField('Meal Location', data.mealLocation)
  );

  const transportationSection = buildSection(
    'Transportation',
    buildField('Transportation Notes', data.transportationNotes)
  );

  const lodgingSection = buildSection(
    'Lodging',
    buildField('Artist Provides vs Venue Provides', data.lodgingProvider) +
      buildField('Rooms / Nights', data.roomsNights) +
      buildField('Property Name', data.propertyName) +
      buildField('Check-in / Check-out', data.checkInCheckOut) +
      buildField('Names / Confirmation Numbers', data.namesConfirmations)
  );

  const securitySection = buildSection(
    'Security',
    buildField('Bag Check', data.bagCheck) + buildField('Theater Security', data.theaterSecurity)
  );

  const productionSection = buildSection(
    'Production Requirements',
    buildField('Staging', data.staging) +
      buildField('Stage / Stairs / Platforms', data.stagePlatforms) +
      buildField('Lineset / Rigging', data.linesetRigging) +
      buildField('Piano / Tuning', data.pianoTuning) +
      buildField('Lighting / Haze', data.lightingHaze) +
      buildField('Plot', data.plot) +
      buildField('Audio Backline', data.audioBackline) +
      buildField('Video Streaming', data.videoStreaming) +
      buildField('Production Notes', data.productionNotes) +
      buildField('Other', data.productionOther) +
      buildField('Crew - They Bring', data.crewTheyBring) +
      buildField('Crew - We Provide', data.crewWeProvide)
  );

  const nextTimeSection = buildSection('Next Time Notes', buildField('Notes', data.nextTimeNotes));

  const contactsSection = buildContactsTable(data.contacts);

  preview.innerHTML = `
    ${headerBlock}
    ${headerSection}
    ${eventDetailsSection}
    ${talentSection}
    ${ticketingSection}
    ${houseSection}
    ${hospitalitySection}
    ${transportationSection}
    ${lodgingSection}
    ${securitySection}
    ${productionSection}
    ${nextTimeSection}
    ${contactsSection}
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
