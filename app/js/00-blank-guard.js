// BLANK SCREEN SAFETY NET:
// If nothing is visible 5 seconds after page load, force-show the login screen.
// This catches any JS error that prevents the normal boot sequence.
window.__blankGuard = setTimeout(function(){
  var ids = ['login-screen','setup-screen','pending-screen','app','portal-screen','portal-view'];
  var anyVisible = ids.some(function(id){
    var el = document.getElementById(id);
    return el && el.style.display && el.style.display !== 'none';
  });
  if(!anyVisible){
    console.warn('[LexDesk] Blank screen guard triggered — forcing login screen visible');
    var login = document.getElementById('login-screen');
    if(login) login.style.display = 'flex';
  }
}, 5000);