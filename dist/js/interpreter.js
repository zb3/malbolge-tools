(function() {

  var mb = require('malbolge-vm');
  var currentVM, lastPos, inputQueue = [];

  function executeVM() {
    var t, input;
    execArea.readOnly = false;
    statusBar.classList.remove('error', 'wait');

    while (true) {
      try {
        while ((t = mb.step(currentVM, input)) != mb.EXIT) {
          input = null;

          if (t !== null)
            execArea.value += String.fromCharCode(t);

          execArea.scrollTop = execArea.scrollHeight;
        }
        statusBar.textContent = 'Program finished.';
        execArea.readOnly = true;
      } catch (e) {
        if (e === mb.WANTS_INPUT) {
          if (inputQueue.length) {
            input = inputQueue.shift();
            continue;
          }
          statusBar.textContent = 'Waiting for user input';
          statusBar.classList.add('wait');
          lastPos = execArea.selectionStart = execArea.selectionEnd = execArea.value.length;
          execArea.focus();
        } else {
          statusBar.textContent = 'Runtime error: ' + e;
          statusBar.classList.add('error');
        }
      }
      break;
    }
  }

  var normalizeCb = document.getElementById('normalize-code');
  var codeArea = document.getElementById('code-area');
  var statusBar = document.getElementById('interpreter-status-bar');
  var execArea = document.getElementById('exec-area');
  var dummyUpload = document.createElement('input');
  dummyUpload.type = 'file';
  var sampleSelect = document.getElementById('interpreter-sample-select');

  normalizeCb.addEventListener('change', function() {
    codeArea.value = mb[normalizeCb.checked ? 'normalize' : 'assemble'](codeArea.value);
  });

  document.getElementById('do-execute-interpreter').onclick = function() {
    if (!codeArea.value.length) {
      alert('Load/Enter program code first :)');
      return;
    }

    tuneCheckbox(codeArea.value);
    
    execArea.value = '';
    inputQueue.length = 0;

    try {
      currentVM = mb.load(normalizeCb.checked ? mb.assemble(codeArea.value) : codeArea.value);
    } catch (e) {
      statusBar.textContent = 'Parse error: ' + e;
      statusBar.classList.add('error');
      return;
    }

    executeVM();
  };

  execArea.onkeydown = function(event) {
    if (lastPos !== -1 && (event.keyCode == 13 || (event.keyCode == 68 && event.ctrlKey))) {
      if (event.keyCode == 13)
        execArea.value += '\n';

      for (var t = lastPos; t < execArea.value.length; t++)
        inputQueue.push(execArea.value.charCodeAt(t));

      if (event.keyCode == 68 && !(execArea.value.length - lastPos))
        inputQueue.push(59048);

      execArea.selectionStart = execArea.selectionEnd = execArea.value.length;
      execArea.scrollTop = execArea.scrollHeight;
      event.preventDefault();

      lastPos = -1;
      executeVM();
    }
  };

  document.getElementById('load-program-file').onclick = function() {
    dummyUpload.onchange = uploadNext;
    dummyUpload.click();
  };

  function tuneCheckbox (code) {
    if (mb.validate(code, false))
      normalizeCb.checked = false;
    else if (mb.validate(code, true))
      normalizeCb.checked = true;
  }
  function uploadNext() {
    if (dummyUpload.files.length) {
      var reader = new FileReader();
      reader.onload = function(e) {
        if (!reader.result) return;

        tuneCheckbox(reader.result);

        codeArea.value = reader.result;
      }
      reader.readAsText(dummyUpload.files[0]);
    }
  }

  var samples = [];
  var samplesXHR = new XMLHttpRequest();
  samplesXHR.onload = fetchSamples;
  samplesXHR.open('GET', 'samples/index.json', true);
  samplesXHR.send();

  function fetchSamples() {
    if (samplesXHR.status && samplesXHR.status !== 200) return;


    var index = JSON.parse(samplesXHR.responseText);
    for (var t = 0; t < index.samples.length; t++) {
      (function(sample) {
        function loadSample() {
          if (xhr.status && xhr.status !== 200) return;

          sample.content = xhr.responseText;
          samples.push(sample);

          addSample(samples.length - 1);
        }

        var xhr = new XMLHttpRequest();
        xhr.onload = loadSample;
        xhr.open('GET', 'samples/' + sample.filename, true);
        xhr.send();
      })(index.samples[t]);
    }
  }

  function addSample(id) {
    var option = document.createElement('option');
    option.text = samples[id].name;

    sampleSelect.add(option);
    document.getElementById('interpreter-samples').style.display = 'inline';
  }

  document.getElementById('interpreter-sample-load').onclick = function() {
    var id = sampleSelect.selectedIndex;
    codeArea.value = samples[id].normalized && !normalizeCb.checked ? mb.assemble(samples[id].content) :
      !samples[id].normalized && normalizeCb.checked ? mb.normalize(samples[id].content) :
      samples[id].content;
  };

})();