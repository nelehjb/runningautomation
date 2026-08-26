/* =============================================================================
   data.js — LXRC event library, deal rules and caption templates.
   This is the ONLY file you need to edit to change club information.
   Everything else (poster, captions, Strava events) is generated from here.
   ========================================================================== */
(function (global) {
  'use strict';

  var LXRC = global.LXRC || (global.LXRC = {});

  /* --- Brand ---------------------------------------------------------------- */
  LXRC.BRAND = {
    name: 'LX RUNNING COMMUNITY',
    red: '#EA3B1F',
    ink: '#111111',
    instagram: '@lxrunningcommunity',
    // Strava club id or vanity slug, from your club's URL:
    // https://www.strava.com/clubs/<this-bit>. Leave empty to link to your club list.
    stravaClubId: '',
    hashtags:
      '#running #lisbonrunclub #lisbon\n' +
      'Run in Lisbon | Lisbon run club | Lisbon social run | social run Lisbon | ' +
      'Lisbon interval training | Lisbon run | Lisboa run club | running community | ' +
      'Lisbon runners | runners in Lisbon | lisbon half marathon | track session | interval training'
  };

  /* --- Shared locations ----------------------------------------------------- */
  var MAPS = {
    caisDoSodre: 'https://maps.app.goo.gl/4Rd5nQRFSDS7Ctmi6',
    parqueEduardoVII: 'https://maps.app.goo.gl/LidHxdXyi4LCDLnE8',
    inatelAlvalade: 'https://maps.app.goo.gl/k7iRDB9Xp2vW1MoC7',
    copenhagenSantos: 'https://maps.app.goo.gl/W1yJHC4cT9ynDaFz6',
    caxiasBeach: 'https://maps.app.goo.gl/JZkZXXeYqhDjL9KEA',
    zestHealthyLab: 'https://maps.app.goo.gl/wbEiDQtj74nghxn66',
    tacosLaMalquerida: 'https://maps.app.goo.gl/J4N5pAjLbgBua8SU9',
    smashBurger: 'https://maps.app.goo.gl/3QKg5AV7vqVWTwVE7'
  };
  LXRC.MAPS = MAPS;

  /* --- Recurring deals ------------------------------------------------------
     `applies(date)` decides automatically whether the deal is on for that date.
     Edit the rules here and every caption / poster note follows.
     ------------------------------------------------------------------------ */
  var DEALS = {
    runnersMenu: {
      id: 'runnersMenu',
      label: { en: '€5 runners menu', pt: 'menu de corredor a 5€' },
      posterNote: '5€ RUNNER MENU AVAILABLE AT SUNSET DESTINATION HOSTEL',
      clause: {
        en: ' and after the run we will have a €5 runners menu available on the rooftop',
        pt: '. Depois da corrida, voltamos ao hostel para aproveitar o menu especial para corredores a 5€ no rooftop'
      },
      // Default Tuesday perk — on unless the tacos deal takes over.
      applies: function () { return true; }
    },
    tacos: {
      id: 'tacos',
      label: { en: '€1 tacos at Tacos La Malquerida', pt: 'tacos a 1€ na Tacos La Malquerida' },
      posterNote: 'BAG DROP BEFORE THE RUN AND 1€ TACOS AVAILABLE AT TACOS LA MALQUERIDA',
      mapUrl: MAPS.tacosLaMalquerida,
      clause: {
        en: ' and after the run we will head straight to Tacos La Malquerida for €1 tacos 🌮',
        pt: '. Depois da corrida, vamos diretamente à Tacos La Malquerida para tacos a 1€ 🌮'
      },
      // Third week of the month (workbook: "third week of a month").
      applies: function (date) { return LXRC.weekOfMonth(date) === 3; }
    },
    smashBurger: {
      id: 'smashBurger',
      label: { en: '15% off at Street Smash Burger', pt: '15% de desconto na Street Smash Burger' },
      posterNote: '15% OFF AVAILABLE AT STREET SMASH BURGER',
      mapUrl: MAPS.smashBurger,
      clause: {
        en: ' After the run we will head to Street Smash Burger for burgers with a 15% discount.',
        pt: ' Depois da corrida vamos à Street Smash Burgers para hambúrgueres com 15% de desconto.'
      },
      // Once a month, on fixed dates agreed with the restaurant.
      dates: ['2026-09-17', '2026-10-29', '2026-11-26'],
      applies: function (date) { return DEALS.smashBurger.dates.indexOf(LXRC.iso(date)) !== -1; }
    },
    iceBaths: {
      id: 'iceBaths',
      label: { en: 'free ice baths', pt: 'banhos de gelo gratuitos' },
      posterNote: 'BAG DROP AND POST RUN RELAX AND ICE BATH AT SUNSET DESTINATION HOSTEL',
      clause: {
        en: ' After the run we relax with free ice baths at the hostel.',
        pt: ' Depois da corrida relaxamos com banhos de gelo gratuitos no hostel.'
      },
      applies: function () { return true; }
    },
    zestPerks: {
      id: 'zestPerks',
      label: { en: '30% off the menu, €25 spa coupon, free smoothies', pt: '30% de desconto no menu, cupão de spa de 25€, batidos grátis' },
      posterNote: '30% OFF MENU, 25€ SPA COUPON AND FREE SMOOTHIES AT ZEST',
      clause: {
        en: ' Afterwards we return to the Healthy Lab for a stretching session, free smoothies 🍍🍊🍓, a DJ set 🎧 and more.',
        pt: ' Depois voltamos ao Healthy Lab para uma sessão de alongamentos, batidos gratuitos 🍍🍊🍓, set de DJ 🎧 e muito mais.'
      },
      applies: function () { return true; }
    }
  };
  LXRC.DEALS = DEALS;

  /* --- Event library --------------------------------------------------------
     weekday: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
     ------------------------------------------------------------------------ */
  LXRC.EVENTS = [
    {
      id: 'tuesday-run',
      kind: 'standard',
      weekday: 2,
      posterTitle: 'TUESDAY SOCIAL RUN',
      name: { en: 'Tuesday Social Run', pt: 'Corrida Social de Terça' },
      time: '19:30',
      location: 'Ferry Station, Cais do Sodré',
      mapUrl: MAPS.caisDoSodre,
      distance: '6k & 4k',
      pace: 'Social — 5:30–7:00 min/km groups',
      terrain: 'Road, flat riverside',
      access: { en: 'Free', pt: 'Gratuito' },
      bagDrop: { available: true, place: 'Sunset Destination Hostel', mapUrl: MAPS.caisDoSodre },
      deals: ['tacos', 'runnersMenu'],   // first one that applies wins
      caption: {
        en: {
          lead: '🏃‍♂️‍➡️ {date}, we will have our social 6k and 4k runs. Meet outside Cais do Sodré between the train and ferry terminals.',
          extras: ['Bag drop is available at Sunset Destination Hostel{dealClause}.']
        },
        pt: {
          lead: '🏃‍♂️‍➡️ {date}, temos as nossas corridas sociais de 6 km e 4 km. O ponto de encontro é no Cais do Sodré, entre as estações de metro e fluvial.',
          extras: ['Podes deixar as tuas coisas no Sunset Destination Hostel{dealClause}.']
        }
      }
    },
    {
      id: 'thursday-track',
      kind: 'standard',
      weekday: 4,
      posterTitle: 'TRACK SESSION',
      name: { en: 'Track Session', pt: 'Sessão de Pista' },
      time: '19:30',
      location: 'Inatel Alvalade',
      mapUrl: MAPS.inatelAlvalade,
      distance: 'Intervals — approx. 8k total',
      pace: 'All levels, grouped by pace',
      terrain: '400m track',
      access: { en: '€3.50 entrance', pt: 'Entrada 3,50€' },
      bagDrop: { available: true, place: 'next to the track', mapUrl: MAPS.inatelAlvalade },
      deals: ['smashBurger'],
      posterNote: 'BAG DROP NEXT TO THE TRACK, 3,50€ ENTRANCE',
      caption: {
        en: {
          lead: '🏃‍♂️‍➡️ {date}, we will have a track session at Inatel Alvalade. Entrance is €3,50 and bags can be stored next to the track.',
          extras: []
        },
        pt: {
          lead: '🏃‍♂️‍➡️ {date}, vamos ter uma sessão de pista no Inatel de Alvalade. A entrada custa 3,50€ e podes guardar as tuas coisas junto à pista.',
          extras: []
        }
      }
    },
    {
      id: 'thursday-hills',
      kind: 'standard',
      weekday: 4,
      posterTitle: 'HILL TRAINING SESSION',
      name: { en: 'Hill Training Session', pt: 'Treino de Subidas' },
      time: '19:30',
      location: 'Bottom of Parque Eduardo VII',
      mapUrl: MAPS.parqueEduardoVII,
      distance: 'Hill reps — approx. 7k total',
      pace: 'All levels, regroup after every rep',
      terrain: 'Park path, steep climb',
      access: { en: 'Free', pt: 'Gratuito' },
      bagDrop: { available: false, note: { en: 'No bag drop, water fountains available.', pt: 'Sem bag drop, mas há bebedouros disponíveis.' } },
      deals: [],
      posterNote: 'NO BAG DROP, WATER FOUNTAINS AVAILABLE',
      caption: {
        en: {
          lead: '⛰️🏃‍♂️‍➡️ {date}, we will have a hill rep session at Parque Eduardo VII.',
          extras: ['No bag drop but water fountains are available.']
        },
        pt: {
          lead: '⛰️🏃‍♂️‍➡️ {date}, teremos uma sessão de treino "Hill Reps" no Parque Eduardo VII.',
          extras: ['Sem bag drop, mas há bebedouros disponíveis.']
        }
      }
    },
    {
      id: 'sunday-social',
      kind: 'standard',
      weekday: 0,
      posterTitle: 'SUNDAY SOCIAL RUN & COFFEE',
      name: { en: 'Sunday Social Run & Coffee', pt: 'Corrida Social de Domingo & Café' },
      time: '09:00',
      location: 'Copenhagen Coffee Lab — Santos',
      mapUrl: MAPS.copenhagenSantos,
      distance: '8k & 5k',
      pace: 'Easy social pace',
      terrain: 'Road, riverside',
      access: { en: 'Free', pt: 'Gratuito' },
      bagDrop: { available: true, place: 'Copenhagen Coffee Lab', mapUrl: MAPS.copenhagenSantos },
      deals: [],
      posterNote: 'BAG DROP AVAILABLE AND COFFEE TOGETHER AFTER THE RUN',
      caption: {
        en: {
          lead: '🏃‍♂️‍➡️ {date}, we will have our Sunday social run, meeting at Copenhagen Coffee Lab in Santos.',
          extras: ['Bag drop is available at the café and we stay for coffee together after the run ☕.']
        },
        pt: {
          lead: '🏃‍♂️‍➡️ {date}, temos a nossa corrida social de domingo, com encontro no Copenhagen Coffee Lab em Santos.',
          extras: ['Podes deixar as tuas coisas no café e ficamos todos para um café depois da corrida ☕.']
        }
      }
    },

    /* --- Special events ---------------------------------------------------- */
    {
      id: 'beach-run',
      kind: 'special',
      weekday: 0,
      posterTitle: 'BEACH RUN',
      name: { en: 'Beach Run', pt: 'Corrida na Praia' },
      time: '09:30',
      location: 'Caxias Beach',
      mapUrl: MAPS.caxiasBeach,
      distance: '5k',
      pace: 'Easy social pace',
      terrain: 'Seafront path',
      access: { en: 'Reachable by train from Cais do Sodré', pt: 'Acessível de comboio a partir do Cais do Sodré' },
      bagDrop: { available: true, place: 'the beach', mapUrl: MAPS.caxiasBeach },
      deals: [],
      posterNote: 'ACCESSIBLE BY TRAIN, BAG DROP AVAILABLE AT THE BEACH',
      caption: {
        en: {
          lead: '⛱️🏃‍♂️‍➡️ {date}, we will have a beach run, starting at Caxias Beach just outside of Lisbon. The run is 5k and afterwards we relax at the beach.',
          extras: ['Caxias is accessible via train. We start at {time} to allow everyone to get there in time. Bag drop will be available.']
        },
        pt: {
          lead: '⛱️🏃‍♂️‍➡️ {date}, teremos uma corrida de praia, com partida na Praia de Caxias, fora de Lisboa. A corrida tem 5 km e, depois, vamos desfrutar e relaxar na praia.',
          extras: ['É possível chegar a Caxias de comboio. Começamos às {time} para que todos possam chegar a tempo. É possível deixarem os vossos pertences na praia.']
        }
      }
    },
    {
      id: 'ice-relax',
      kind: 'special',
      weekday: 0,
      posterTitle: 'RUN, RELAX & ICE BATH',
      name: { en: 'Run, Relax & Ice Bath', pt: 'Corrida, Relax & Banho de Gelo' },
      time: '09:00',
      location: 'Sunset Destination Hostel, Cais do Sodré',
      mapUrl: MAPS.caisDoSodre,
      distance: '5k',
      pace: 'Easy social pace',
      terrain: 'Road, riverside',
      access: { en: 'Free', pt: 'Gratuito' },
      bagDrop: { available: true, place: 'Sunset Destination Hostel', mapUrl: MAPS.caisDoSodre },
      deals: ['iceBaths'],
      caption: {
        en: {
          lead: '🧊🏃‍♂️‍➡️ {date}, we run, relax and recover. We meet at Sunset Destination Hostel for a 5k social run.',
          extras: ['Bag drop is available at the hostel.{dealClause}']
        },
        pt: {
          lead: '🧊🏃‍♂️‍➡️ {date}, vamos correr, relaxar e recuperar. Encontramo-nos no Sunset Destination Hostel para uma corrida social de 5 km.',
          extras: ['Podes deixar as tuas coisas no hostel.{dealClause}']
        }
      }
    },
    {
      id: 'mind-body-soul',
      kind: 'special',
      weekday: 0,
      posterTitle: 'MIND, BODY & SOUL',
      name: { en: 'Mind, Body & Soul', pt: 'Mind, Body & Soul' },
      time: '09:00',
      location: 'Zest — Healthy Lab, Alcântara',
      mapUrl: MAPS.zestHealthyLab,
      distance: '5k',
      pace: 'Easy social pace',
      terrain: 'Road, riverside',
      access: { en: 'Free', pt: 'Gratuito' },
      bagDrop: { available: true, place: 'Zest', mapUrl: MAPS.zestHealthyLab },
      deals: ['zestPerks'],
      caption: {
        en: {
          lead: '🧘🏃‍♂️‍➡️ {date}, we will have our special mind, body and soul event at Zest — Healthy Lab in Alcântara. The run is 5k and we meet at Zest before heading together to the starting point next to the Ponte 25 de Abril.',
          extras: ['Bag drop is available at Zest.{dealClause}']
        },
        pt: {
          lead: '🧘🏃‍♂️‍➡️ {date}, vamos ter um evento especial mind, body and soul no Zest — Healthy Lab em Alcântara. O percurso é de 5 km e o ponto de encontro é no Zest, antes de irmos juntos até ao ponto de partida junto à Ponte 25 de Abril.',
          extras: ['Podes deixar as tuas coisas no Zest.{dealClause}']
        }
      }
    },
    {
      id: 'run-yoga',
      kind: 'special',
      weekday: 0,
      posterTitle: 'RUN & YOGA',
      name: { en: 'Run & Yoga', pt: 'Corrida & Yoga' },
      time: '09:00',
      location: 'Lisbon Strong, Belém Rugby Park',
      mapUrl: 'https://maps.app.goo.gl/rQ2vLFqk1sXhqTqH7',
      distance: '5k trail',
      pace: 'Easy trail pace',
      terrain: 'Monsanto trail',
      access: { en: '€15, sign up in advance', pt: '15€, inscrição prévia obrigatória' },
      signupUrl: 'https://train.lisbonstrong.com/packages/83860/purchase/',
      bagDrop: { available: true, place: 'Lisbon Strong', mapUrl: 'https://maps.app.goo.gl/rQ2vLFqk1sXhqTqH7' },
      deals: [],
      posterNote: '15€ AND SIGN UP REQUIRED — BUS 760 FROM CAIS DO SODRÉ OR 723 FROM MARQUÊS DE POMBAL',
      caption: {
        en: {
          lead: '🧘🏃‍♂️‍➡️ {date}, we will have a Run & Yoga session at Lisbon Strong, Belém Rugby Park. We start at {time} with a strength workout, explore Monsanto on a 5k trail run and then relax with yoga and brunch.',
          extras: [
            'Lisbon Strong is accessible by bus 760 from Cais do Sodré and bus 723 from Marquês de Pombal. Bag drop will be available.',
            'This Run & Yoga session costs €15 and requires a sign up beforehand: {signupUrl}'
          ]
        },
        pt: {
          lead: '🧘🏃‍♂️‍➡️ {date}, vamos ter uma sessão de Run & Yoga no Lisbon Strong, Belém Rugby Park. Começamos às {time} com um treino de força, exploramos Monsanto numa corrida trail de 5 km e depois relaxamos com yoga e brunch.',
          extras: [
            'O Lisbon Strong é acessível pelo autocarro 760 a partir do Cais do Sodré e pelo 723 a partir do Marquês de Pombal. Haverá bag drop disponível.',
            'Esta sessão de Run & Yoga custa 15€ e requer inscrição prévia: {signupUrl}'
          ]
        }
      }
    }
  ];

  /* --- Caption frame (workbook rows: Intro / … / Additional info / Closing) --- */
  LXRC.CAPTION_FRAME = {
    intro: {
      en: 'What to know this week 👇',
      pt: 'O que precisas de saber para esta semana 👇'
    },
    closing: {
      en: 'If you have any questions let us know!',
      pt: 'Se tiveres alguma dúvida, diz!'
    }
  };

  /* --- The recurring week the generator starts from ------------------------- */
  LXRC.DEFAULT_WEEK = ['tuesday-run', 'thursday-track', 'sunday-social'];

  LXRC.findEvent = function (id) {
    for (var i = 0; i < LXRC.EVENTS.length; i++) {
      if (LXRC.EVENTS[i].id === id) return LXRC.EVENTS[i];
    }
    return null;
  };
})(window);
