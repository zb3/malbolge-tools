(function() {

  var mb = require('malbolge-vm');
  var generator = null,
    settings = null; //worker here
  var resultFound = false;

  var gtSelect = document.getElementById('generator-type-select');
  var settingDivs = [document.getElementById('linear-generator-settings'), document.getElementById('exp-generator-settings'), document.getElementById('fixed-generator-settings')];
  var generatorDescriptions = document.getElementById('generator-descriptions')

  gtSelect.onchange = function() {
    var t;

    //ultimate laziness
    for (t = 0; t < settingDivs.length; t++)
      settingDivs[t].style.display = t == gtSelect.selectedIndex ? 'block' : 'none';

    document.getElementById('generator-description').textContent = generatorDescriptions.options[gtSelect.selectedIndex].value
  };
  gtSelect.onchange();

  var lpPrefixSelect = document.getElementById('linear-prefix-select');
  var lpCustomPrefix = document.getElementById('linear-custom-prefix-input');
  var lpNormalizeCb = document.getElementById('linear-prefix-normalized');
  var fixedCutoffInput = document.getElementById('fixed-cutoff');
  var fixedDepthInput = document.getElementById('fixed-depth');
  var fixedLengthInput = document.getElementById('fixed-length');
  var expDepthInput = document.getElementById('exp-depth');
  var expLengthInput = document.getElementById('exp-length');
  var targetArea = document.getElementById('target-area');
  var resultArea = document.getElementById('gen-result-area');
  var statusBar = document.getElementById('generator-status-message');
  var statusBarProgress = document.getElementById('generator-status-progress');
  var randomizeCb = document.getElementById('randomize-generator');
  var rpoolArea = document.getElementById('generator-random-pool');
  var dummyDownload = document.createElement('a');
  var dummyUpload = document.createElement('input');
  dummyUpload.type = 'file';

  lpPrefixSelect.onchange = function() {
    document.getElementById('linear-custom-prefix').style.display = lpPrefixSelect.selectedIndex == lpPrefixSelect.length - 1 ? 'block' : 'none';
  };

  lpNormalizeCb.addEventListener('change', function() {
    lpCustomPrefix.value = mb[lpNormalizeCb.checked ? 'normalize' : 'assemble'](lpCustomPrefix.value, true);
  });

  randomizeCb.onchange = function() {
    document.getElementById('generator-pool-settings').style.display = randomizeCb.checked ? 'none' : 'block';
  };

  fixedCutoffInput.onchange = function() {
    var c = parseInt(fixedCutoffInput.value),
      l = parseInt(fixedLengthInput.value);
    if (c < l)
      fixedCutoffInput.value = fixedLengthInput.value;
  };

  function readSettings() {
    var settings = {};
    settings.type = gtSelect.selectedIndex;
    settings.target = targetArea.value;
    settings.randomPool = randomizeCb.checked ? '' : rpoolArea.value;

    if (settings.type) {
      settings.depth = parseInt((settings.type == 1 ? expDepthInput : fixedDepthInput).value);
      settings.length = parseInt((settings.type == 1 ? expLengthInput : fixedLengthInput).value);

      if (settings.type == 2)
        settings.cutoff = parseInt(fixedCutoffInput.value);
    } else {
      if (lpPrefixSelect.selectedIndex == 0)
        settings.prefix = null;
      else if (lpPrefixSelect.selectedIndex == lpPrefixSelect.length - 1)
        settings.prefix = lpNormalizeCb.checked ? mb.assemble(lpCustomPrefix.value) : lpCustomPrefix.value;
      else
        settings.prefix = lpPrefixSelect.value;
    }
    return settings;
  }

  function setTargetValue(value) {
    resultArea.value = value;
    document.querySelector('.gen-result-length').classList[value.length?'add':'remove']('on');
    document.getElementById('gen-result-length').textContent = value.length;
  }

  function enforceSettings() {
    //ehh, target!
    setTargetValue(settings.result || '');
    targetArea.value = settings.target;
    gtSelect.selectedIndex = settings.type;
    if (settings.type == 1) {
      expDepthInput.value = settings.depth;
      expLengthInput.value = settings.length;
    } else if (settings.type == 2) {
      document.getElementById('fixed-depth').value = settings.depth;
      fixedCutoffInput.value = settings.cutoff;
      fixedLengthInput.value = settings.length;
    }
    if (settings.randomPool) {
      randomizeCb.checked = false;
      rpoolArea.value = settings.randomPool;
    } else randomizeCb.checked = true;

    document.getElementById('do-resume').style.display = settings.finished ? 'none' : settings.type ? '' : 'none';
    document.getElementById('export-state').style.display = settings.finished ? 'none' : settings.type ? '' : 'none';

    if (settings.progress)
      setProgress(settings.progress);
    else
      progressOff();

    randomizeCb.onchange();
    gtSelect.onchange();
  }

  function setStartedState() {
    document.getElementById('do-generate').style.display = 'none';
    document.getElementById('stop-generate').style.display = '';
    document.getElementById('do-resume').style.display = 'none';
    document.getElementById('do-resume-from-file').style.display = 'none';
    document.getElementById('export-state').style.display = settings.type ? '' : 'none';
    storeSettings();
  }

  function setStoppedState() {
    document.getElementById('do-generate').style.display = '';
    document.getElementById('stop-generate').style.display = 'none';
    document.getElementById('do-resume').style.display = settings.finished ? 'none' : settings.type ? '' : 'none';
    document.getElementById('do-resume-from-file').style.display = '';
    document.getElementById('export-state').style.display = settings.finished ? 'none' : settings.type ? '' : 'none';
    storeSettings();
  }

  function setProgress(progress) {
    if (progress === 1) return progressOff();
    statusBarProgress.style.width = (progress * 100) + '%';
    statusBarProgress.style.visibility = 'visible';
  }

  function progressOff() {
    statusBarProgress.style.visibility = 'hidden';
  }

  function messageHandler(msg) {
    if (msg.data) msg = msg.data;
    /*
    result - update result area
    progress - update status bar
    error - update status bar with error
    final - update status with finish. if no results found, type no results found
    stack - store this as settings.stack
    */
    if (msg.result) {
      setTargetValue(settings.result = msg.result);
    }

    if (msg.stack) {
      settings.stack = msg.stack;
      storeSettings();
    }

    if (msg.progress !== undefined) {
      settings.progress = msg.progress;
      setProgress(msg.progress);
    }

    if (msg.error) {
      statusBar.classList.add('error');
      statusBar.textContent = msg.error; //:before, content: 'Error: ' ??
      settings.progress = 0;
      setProgress(settings.progress);
      settings.finished = true;
      setStoppedState();
    } else if (msg.final) {
      settings.progress = 0;
      setProgress(settings.progress);
      statusBar.textContent = settings.result ? 'Generation complete.' : 'No results found.';
      settings.finished = true;
      setStoppedState();
    }
  }

  function abort() {
    if (generator) {
      generator.terminate();
      generator = null;
    }
  }

  function start() {
    setStartedState(); //coz type 0 - no save
    //if stack there, do messagehandler
    setTargetValue(settings.result ? settings.result : '');

    statusBar.classList.remove('error');

    if (settings.stack)
      messageHandler({
        stack: settings.stack
      });
    else
      statusBarProgress.style.visibility = 'hidden';

    statusBar.textContent = 'Generating...';

    if (generator) abort();
    generator = new Worker('js/gworker.js');
    generator.onmessage = messageHandler;
    generator.postMessage(settings);
  }

  function stop() {
    abort();
    statusBar.textContent = 'Generator stopped.';
    setStoppedState();
  }

  function exportState() {
    dummyDownload.download = 'state.mgen';
    dummyDownload.href = 'data:text/plain;base64,' + btoa(JSON.stringify(settings));
    dummyDownload.click();
  }

  function resumeFromFile() {
    dummyUpload.onchange = uploadNext;
    dummyUpload.click();
  }

  function uploadNext() {
    if (dummyUpload.files.length) {
      var reader = new FileReader();
      reader.onload = function(e) {
        tryResume(reader.result);
      }
      reader.readAsText(dummyUpload.files[0]);
    }
  }

  function tryResume(str) {
    var state = null;
    try {
      state = JSON.parse(str);
    } catch (e) {}
    if (state !== null && typeof state === 'object' && typeof state.type === 'number') {
      settings = state;
      enforceSettings();
      start();
    }
  }

  function generateNew() {
    var ns = readSettings();
    if (ns.type == 0 && ns.prefix && !mb.validateCode(ns.prefix, false, true)) {
      alert('Invalid prefix');
      return;
    } else if (ns.randomPool && !mb.validateCode(ns.randomPool, true, true)) {
      alert('Invalid normalized instructions for non-accessed parts.');
      return;
    }
    settings = ns;
    start();
  }

  document.getElementById('do-generate').addEventListener('click', generateNew);
  document.getElementById('stop-generate').addEventListener('click', stop);
  document.getElementById('do-resume').addEventListener('click', start);
  document.getElementById('do-resume-from-file').addEventListener('click', resumeFromFile);
  document.getElementById('export-state').addEventListener('click', exportState);

  function storeSettings() {
    localStorage.setItem('zb3.MBTools.settings', JSON.stringify(settings));
  }

  var stored = localStorage.getItem('zb3.MBTools.settings');
  if (stored && stored !== 'null' && stored !== 'undefined') {
    settings = JSON.parse(stored);
    enforceSettings();
  }

})();