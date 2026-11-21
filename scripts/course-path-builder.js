(() => {
  const form = document.querySelector('#learning-path-form');
  const result = document.querySelector('#pathway-result');
  if (!form || !result) return;

  const skills = {
    notes: {
      name: 'Noten lesen', field: 'assessment-notes',
      course: {title: 'Notenschrift 1 · Noten lesen', href: 'kurs-notenschrift-1.html', description: 'Notenlinien, Violinschlüssel und Notennamen lernen.'},
      testLink: {title: 'Notenschrift-Grundkurs ansehen', href: 'kurs-notenschrift-1.html#course-chapter-01'}
    },
    'note-whole': {
      name: 'Ganze Noten', field: 'assessment-note-whole',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Notenwerte und Pausen im Puls lesen und spielen.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    'note-half': {
      name: 'Halbe Noten', field: 'assessment-note-half',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Notenwerte und Pausen im Puls lesen und spielen.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    'note-quarter': {
      name: 'Viertelnoten', field: 'assessment-note-quarter',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Notenwerte und Pausen im Puls lesen und spielen.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    'note-eighth': {
      name: 'Achtelnoten', field: 'assessment-note-eighth',
      course: {title: 'Rhythmus 2 · Achtelnoten und Achtelpausen', href: 'rhythmus-2-achtel.html', description: 'Achtelnoten und Achtelpausen bei gleichmäßigem Puls lesen, hören, schreiben und spielen.'},
      testLink: {title: 'Achtelnoten und Achtelpausen ansehen', href: 'rhythmus-2-achtel.html'}
    },
    'note-sixteenth': {
      name: 'Sechzehntelnoten', field: 'assessment-note-sixteenth',
      course: {title: 'Rhythmus 3 · Sechzehntelnoten', href: 'rhythmus-2-einfuehrung.html', description: 'Sechzehntel unterteilen, lesen und bei gleichbleibendem Puls spielen.'},
      testLink: {title: 'Sechzehntelnoten ansehen', href: 'rhythmus-2-einfuehrung.html'}
    },
    'rest-whole': {
      name: 'Ganze Pausen', field: 'assessment-rest-whole',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Notenwerte und Pausen im Puls lesen und spielen.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    'rest-half': {
      name: 'Halbe Pausen', field: 'assessment-rest-half',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Notenwerte und Pausen im Puls lesen und spielen.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    'rest-quarter': {
      name: 'Viertelpausen', field: 'assessment-rest-quarter',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Notenwerte und Pausen im Puls lesen und spielen.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    'rest-eighth': {
      name: 'Achtelpausen', field: 'assessment-rest-eighth',
      course: {title: 'Rhythmus 2 · Achtelnoten und Achtelpausen', href: 'rhythmus-2-achtel.html', description: 'Achtelnoten und Achtelpausen bei gleichmäßigem Puls lesen, hören, schreiben und spielen.'},
      testLink: {title: 'Achtelnoten und Achtelpausen ansehen', href: 'rhythmus-2-achtel.html'}
    },
    'rest-sixteenth': {
      name: 'Sechzehntelpausen', field: 'assessment-rest-sixteenth',
      course: {title: 'Rhythmus 3 · Sechzehntelnoten', href: 'rhythmus-2-einfuehrung.html', description: 'Sechzehntel unterteilen, lesen und bei gleichbleibendem Puls spielen.'},
      testLink: {title: 'Sechzehntelpausen ansehen', href: 'rhythmus-2-einfuehrung.html'}
    },
    scale: {
      name: 'Durtonleitern und Tonstufen', field: 'assessment-scale',
      course: {title: 'Melodie 1 · Tonleitern und melodischer Aufbau', href: 'kurs-melodie-1.html', description: 'Tonleitern, Tonstufen und Melodien kennenlernen.'},
      testLink: {title: 'Melodie 1 · Kapitel 1 ansehen', href: 'kurs-melodie-1.html#course-chapter-01'}
    },
    pitch: {
      name: 'Einzelne Töne präzise nachsingen', field: 'assessment-pitch',
      course: {title: 'Gehörbildung 1 · Tonhöhe und Richtung', href: 'kurs-gehoerbildung-1.html', description: 'Einzelne Töne hören und möglichst genau nachsingen.'},
      testLink: {title: 'Gehörbildung 1 ansehen', href: 'kurs-gehoerbildung-1.html'}
    },
    melody: {
      name: 'Kurze Melodien merken und nachsingen', field: 'assessment-melody',
      course: {title: 'Gehörbildung 2 · Intervalle und Melodien', href: 'kurs-gehoerbildung-2.html', description: 'Tonfolgen hören und melodisch einordnen.'},
      testLink: {title: 'Gehörbildung 2 ansehen', href: 'kurs-gehoerbildung-2.html'}
    },
    intervals: {
      name: 'Intervalle innerhalb einer Tonleiter hören und benennen', field: 'assessment-intervals',
      course: {title: 'Gehörbildung 2 · Intervalle und Melodien', href: 'kurs-gehoerbildung-2.html', description: 'Intervalle und Tonstufen im Zusammenhang hören.'},
      testLink: {title: 'Gehörbildung 2 ansehen', href: 'kurs-gehoerbildung-2.html'}
    },
    'tonal-center': {
      name: 'Grundton als tonales Zentrum spüren und halten', field: 'assessment-tonal-center',
      course: {title: 'Gehörbildung 1 · Tonhöhe und Richtung', href: 'kurs-gehoerbildung-1.html', description: 'Töne nachsingen und den Grundton als Bezugspunkt halten.'},
      testLink: {title: 'Gehörbildung 1 ansehen', href: 'kurs-gehoerbildung-1.html'}
    }
  };
  const focusCourses = {
    gesang: {title: 'Gesang 1', href: 'kurs-gesang-1.html', description: 'Atem, Stimme und Intonation als Einstieg.', label: 'Gesang'},
    gitarre: {title: 'Gitarre 1', href: 'kurs-gitarre-1.html', description: 'Instrument, Bewegung und erste musikalische Grundlagen.', label: 'Gitarre'},
    gehoerbildung: {title: 'Gehörbildung 1', href: 'kurs-gehoerbildung-1.html', description: 'Töne hören und die Intonation entwickeln.', label: 'Gehörbildung'},
    rhythmus: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Puls, Notenwerte und Pausen kennenlernen.', label: 'Rhythmus'},
    melodie: {title: 'Melodie 1 · Tonleitern und melodischer Aufbau', href: 'kurs-melodie-1.html', description: 'Tonleitern und melodische Zusammenhänge erkunden.', label: 'Melodie'},
    harmonie: {title: 'Harmonie 1', href: 'kurs-harmonie-1.html', description: 'Akkorde und ihre Beziehungen untersuchen.', label: 'Harmonie'},
    biomechanik: {title: 'Training für Musiker', href: 'kurs-musikertraining-1.html', description: 'Bewegung und körperliche Grundlagen beim Musizieren.', label: 'Biomechanik'}
  };

  form.querySelectorAll('input[name="known"]').forEach(input => {
    input.addEventListener('change', () => {
      const select = form.elements[`assessment-${input.value}`];
      if (!select) return;
      if (input.dataset.followup !== undefined) {
        const followup = input.closest('.pathway-known-item')?.querySelector('.pathway-followup');
        if (followup) followup.hidden = !input.checked;
        select.required = input.checked;
        if (!input.checked) select.value = '';
        return;
      }
      if (input.checked) select.value = 'sure';
      else if (select.value === 'sure') select.value = '';
    });
  });

  form.addEventListener('reset', () => {
    result.hidden = true;
    result.replaceChildren();
    window.setTimeout(() => {
      form.querySelectorAll('input[data-followup]').forEach(input => {
        const followup = input.closest('.pathway-known-item')?.querySelector('.pathway-followup');
        const select = form.elements[`assessment-${input.value}`];
        if (followup) followup.hidden = true;
        if (select) select.required = false;
      });
    }, 0);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const focus = form.querySelector('input[name="learning-focus"]:checked')?.value;
    const chosenCourses = [focusCourses[focus]];
    const addedCourseHrefs = new Set([focusCourses[focus].href]);
    const tests = [];

    Object.values(skills).forEach(skill => {
      const answer = form.elements[skill.field].value;
      if (answer === 'unsure') tests.push(skill);
      else if ((answer === 'learn' || answer === '') && !addedCourseHrefs.has(skill.course.href)) {
        chosenCourses.push(skill.course);
        addedCourseHrefs.add(skill.course.href);
      }
    });

    result.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = 'Dein vorgeschlagener Lernweg';
    result.append(heading);
    const intro = document.createElement('p');
    intro.textContent = `Du möchtest ${focusCourses[focus].label} lernen. Die Kursfolge startet dort und ergänzt Grundlagen, die du noch lernen möchtest.`;
    result.append(intro);

    if (tests.length) {
      const testPanel = document.createElement('div');
      testPanel.className = 'pathway-test-list';
      const testHeading = document.createElement('h4');
      testHeading.textContent = 'Vor diesen Grundlagen kommt ein kurzer Einstufungstest.';
      testPanel.append(testHeading);
      const list = document.createElement('ul');
      tests.forEach(skill => {
        const item = document.createElement('li');
        item.append(document.createTextNode(`Test zu „${skill.name}“: `));
        const link = document.createElement('a');
        link.href = skill.testLink.href;
        link.textContent = skill.testLink.title;
        item.append(link);
        list.append(item);
      });
      testPanel.append(list);
      const note = document.createElement('p');
      note.className = 'figure-hint';
      note.textContent = 'Baustelle: Die Einstufungstests sind noch nicht erstellt. Bis dahin führen die Links zu den passenden Grundlagen.';
      testPanel.append(note);
      result.append(testPanel);
    }

    const list = document.createElement('ol');
    chosenCourses.forEach(course => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = course.href;
      link.textContent = course.title;
      const description = document.createElement('span');
      description.textContent = ` — ${course.description}`;
      item.append(link, description);
      list.append(item);
    });
    result.append(list);
    result.hidden = false;
    result.focus();
  });
})();
