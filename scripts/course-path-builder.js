(() => {
  const form = document.querySelector('#learning-path-form');
  const result = document.querySelector('#pathway-result');
  if (!form || !result) return;

  const skills = {
    notes: {
      name: 'Noten lesen', field: 'assessment-notes',
      course: {title: 'Notenschrift 1 · Noten lesen', href: 'kurs-notenschrift-1.html', description: 'Notenlinien, Violinschlüssel und Notennamen lernen.'},
      testLink: {title: 'Notenschrift-Grundkurs ansehen', href: 'notenschrift-1-kapitel-1.html'}
    },
    quarter: {
      name: 'Viertelnoten', field: 'assessment-quarter',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Puls und Viertelnoten üben.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    eighth: {
      name: 'Achtelnoten', field: 'assessment-eighth',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Puls und Achtelnoten üben.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    rests: {
      name: 'Pausen', field: 'assessment-rests',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Pausenwerte erkennen und im Puls zählen.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    sixteenth: {
      name: 'Sechzehntelnoten', field: 'assessment-sixteenth',
      course: {title: 'Rhythmus 1', href: 'grundlagen.html', description: 'Notenwerte bis zur Sechzehntel im Puls üben.'},
      testLink: {title: 'Rhythmus-Grundlagen ansehen', href: 'grundlagen.html'}
    },
    scale: {
      name: 'Durtonleitern und Tonstufen', field: 'assessment-scale',
      course: {title: 'Melodie 1 · Tonleitern und melodischer Aufbau', href: 'kurs-melodie-1.html', description: 'Tonleitern, Tonstufen und Melodien kennenlernen.'},
      testLink: {title: 'Melodie 1 · Kapitel 1 ansehen', href: 'melodie-1-kapitel-1.html'}
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
  const instruments = {
    gesang: {title: 'Gesang 1', href: 'kurs-gesang-1.html', description: 'Atem, Stimme und Intonation als Einstieg.'},
    gitarre: {title: 'Gitarre 1', href: 'kurs-gitarre-1.html', description: 'Instrument, Bewegung und erste musikalische Grundlagen.'}
  };

  form.querySelectorAll('input[name="known"]').forEach(input => {
    input.addEventListener('change', () => {
      const select = form.elements[`assessment-${input.value}`];
      if (!select) return;
      if (input.checked) select.value = 'sure';
      else if (select.value === 'sure') select.value = '';
    });
  });

  form.addEventListener('reset', () => {
    result.hidden = true;
    result.replaceChildren();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const focus = form.querySelector('input[name="learning-focus"]:checked')?.value;
    const chosenCourses = [instruments[focus]];
    const addedCourseHrefs = new Set([instruments[focus].href]);
    const tests = [];

    Object.values(skills).forEach(skill => {
      const answer = form.elements[skill.field].value;
      if (answer === 'unsure') tests.push(skill);
      else if (answer === 'learn' && !addedCourseHrefs.has(skill.course.href)) {
        chosenCourses.push(skill.course);
        addedCourseHrefs.add(skill.course.href);
      }
    });

    result.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = 'Dein vorgeschlagener Lernweg';
    result.append(heading);
    const intro = document.createElement('p');
    intro.textContent = focus === 'gesang'
      ? 'Du möchtest Gesang lernen. Die Kursfolge startet mit deiner Stimme und ergänzt Grundlagen, die du noch lernen möchtest.'
      : 'Du möchtest Gitarre lernen. Die Kursfolge startet mit deinem Instrument und ergänzt Grundlagen, die du noch lernen möchtest.';
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
