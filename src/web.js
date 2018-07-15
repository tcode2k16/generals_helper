const main = () => {

};

  (function(e, s) {
    e.src = s;
    e.onload = function() {
        jQuery.noConflict();
        console.log('jQuery injected');
        main();
    };
    document.head.appendChild(e);
  })(document.createElement('script'), '//code.jquery.com/jquery-3.3.1.min.js')
  