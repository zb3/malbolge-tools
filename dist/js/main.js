(function() {

  function setHash(hash) {
    if (history.pushState)
      history.pushState(null, null, '#' + hash);
    else
      location.hash = '#' + hash;
  }

  document.getElementById('switch-interpreter').onclick = switchInterpreter;

  function switchInterpreter() {
    document.getElementById('switch-generator').classList.remove('on');
    document.getElementById('switch-interpreter').classList.add('on');
    document.getElementById('interpreter').style.display = '';
    document.getElementById('generator').style.display = 'none';
    setHash('interpreter');
  }
  document.getElementById('switch-generator').onclick = switchGenerator;

  function switchGenerator() {
    document.getElementById('switch-generator').classList.add('on');
    document.getElementById('switch-interpreter').classList.remove('on');
    document.getElementById('interpreter').style.display = 'none';
    document.getElementById('generator').style.display = '';
    setHash('generator');
  }

  if (location.hash === '#interpreter')
    switchInterpreter();

})();