//assets/js/availability.js

<script>
async function renderBookedPeriods(container) {
  const apt = container.dataset.apt;
  try {
    const res = await fetch(`/api/ical/${apt}`);
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();

    if (!data.bookings?.length) {
      container.innerHTML = '<p>No current bookings.</p>';
      return;
    }

    const ul = document.createElement('ul');
    data.bookings
      // sort po početku
      .sort((a,b) => a.start.localeCompare(b.start))
      .forEach(({start, end}) => {
        const li = document.createElement('li');
        // DTEND je checkout (ekscl.), pa za prikaz koristimo end - 1 dan ako želiš "noćenja"
        li.textContent = `Booked: ${fmt(start)} → ${fmt(end)} (checkout)`;
        ul.appendChild(li);
      });

    container.innerHTML = '';
    container.appendChild(ul);
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p>Unable to load availability at the moment.</p>';
  }
}

function fmt(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.booked-periods[data-apt]').forEach(renderBookedPeriods);
});
</script>
