import { Viewer } from './viewer.js';

var dialog = require('art-dialog');

class App
{
  constructor (el) 
  {
    var scope = this;

    this.el = el;
    this.viewer = null;
    this.viewerEl = null;

    if (this.viewer) this.viewer.clear();

    function getPlayerName(callback)
    {
      var d = dialog({
        title: '请输入您的名字',
        cancel: false,
        content: '<input id="property-returnValue-demo" value="李小三" />',
        ok: function () {
          var input = window.document.getElementById('property-returnValue-demo');
          this.close(input.value);
          this.remove();
        }
      });
      d.addEventListener('close', function () {
        if (this.returnValue.length == 0)
        {
          getPlayerName(callback);
        }
        else
        {
          if (callback)
          {
            callback(this.returnValue);
          }
        }
      });
      
      d.show();
    }

    var needName = false;

    if (needName)
    {
      getPlayerName(function(playerName)
      {
        scope.createViewer(playerName);
      });
    }
    else
    {
      scope.createViewer();
    }
    
  }

  createViewer(playerName) 
  {
    this.viewerEl = document.createElement('div');
    this.viewerEl.classList.add('viewer');
    this.el.appendChild(this.viewerEl);
    this.viewer = new Viewer(this.viewerEl, {playerName: playerName});
    return this.viewer;
  }
}

var app = null;
document.addEventListener('DOMContentLoaded', () => {

  app = new App(document.body);

});
