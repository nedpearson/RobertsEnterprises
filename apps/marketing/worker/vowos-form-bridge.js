/**
 * VowOS Form Bridge - Standalone injection script
 * 
 * This script is injected directly into the Shopify theme (NOT through Globo).
 * It watches for Globo forms to load, then attaches a click listener to the
 * submit button that scrapes the visible field labels + values and POSTs them
 * to the VowOS form-bridge API.
 * 
 * Works on BOTH Shopify 1.0 and 2.0 themes.
 */
(function() {
  'use strict';

  // Configuration — one entry per store
  var CONFIG = {
    'idobridalcouture': {
      endpoint: 'https://api.robertsenterprises.bridgebox.ai/api/form-bridge/submit/super_secret_form_bridge_key_2026/idobridalcouture.com'
    },
    'properandco': {
      endpoint: 'https://api.robertsenterprises.bridgebox.ai/api/form-bridge/submit/super_secret_form_bridge_key_2026/properandcompany.com'
    }
  };

  // Detect which store we're on
  var hostname = window.location.hostname || '';
  var storeKey = hostname.indexOf('idobridal') !== -1 ? 'idobridalcouture' :
                 hostname.indexOf('proper') !== -1 ? 'properandco' : null;
  if (!storeKey) return; // not one of our stores

  var endpoint = CONFIG[storeKey].endpoint;
  var alreadyAttached = false;

  function attachListener() {
    if (alreadyAttached) return;

    var formApp = document.querySelector('.globo-form-app');
    if (!formApp) return; // form hasn't loaded yet

    var btn = formApp.querySelector('button.submit') ||
              formApp.querySelector('button[type="submit"]') ||
              formApp.querySelector('.globo-form-submit button');
    if (!btn) return;

    alreadyAttached = true;

    btn.addEventListener('click', function() {
      try {
        var payload = {};
        var controls = formApp.querySelectorAll('.globo-form-control');
        for (var i = 0; i < controls.length; i++) {
          var ctrl = controls[i];
          var label = ctrl.querySelector('label');
          var input = ctrl.querySelector('input, select, textarea');
          if (label && input) {
            var key = label.innerText.replace(/\*/g, '').replace(/\n/g, '').trim();
            if (key && input.value) {
              payload[key] = input.value;
            }
          }
        }

        // Also grab checkboxes (like Store Location checkboxes on I Do Bridal)
        var checkboxGroups = formApp.querySelectorAll('.globo-form-control');
        for (var j = 0; j < checkboxGroups.length; j++) {
          var group = checkboxGroups[j];
          var checked = group.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked');
          if (checked.length > 0) {
            var groupLabel = group.querySelector('label');
            if (groupLabel) {
              var groupKey = groupLabel.innerText.replace(/\*/g, '').replace(/\n/g, '').trim();
              var values = [];
              for (var k = 0; k < checked.length; k++) {
                // Get the label text next to the checkbox
                var cbLabel = checked[k].parentElement && checked[k].parentElement.querySelector('span, label');
                values.push(cbLabel ? cbLabel.innerText.trim() : checked[k].value);
              }
              if (values.length > 0) {
                payload[groupKey] = values.join(', ');
              }
            }
          }
        }

        if (Object.keys(payload).length > 0) {
          var xhr = new XMLHttpRequest();
          xhr.open('POST', endpoint, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify(payload));
        }
      } catch(e) {
        // Silent fail — never break the customer's form experience
      }
    }, true); // useCapture = true to fire before Globo's own handler
  }

  // Poll for the form to appear (Globo loads async via React)
  var attempts = 0;
  var poller = setInterval(function() {
    attachListener();
    attempts++;
    if (alreadyAttached || attempts > 50) { // give up after ~10 seconds
      clearInterval(poller);
    }
  }, 200);
})();
