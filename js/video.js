var _peer;
var _myBrokerId;
var _myStream;
var _muted = false;
var _otherStream = [];
var debug = true;

if( !window['console'] || !debug )
    window['console'] = {log: function(){}, info: function(){}, error: function(){}}

window.onunload = window.onbeforeunload = function(e) {
  if (_peer && !_peer.destroyed)
    _peer.destroy();
};

$(function(){
  _peer = opener._peer;
  _myBrokerId = opener._myBrokerId;
  _myStream = opener._myStream;
  _otherStream = opener._otherStream;

  $('#close-btn').click(function(){
    opener.disconnect();
    window.close();
  });

  // show my stream
  var div = $('<div class="stream-container">').prop('id', 'myvideo');
  $('<video>').prop('autoplay', true)
    .prop('src', URL.createObjectURL(_myStream))
    .appendTo(div);
  $('#stream-view .stream-list').append(div);

  // show other stream
  $.each(_otherStream, function(){
    setOtherStream(this);
  });

  adjustVideoWidth();

  // swich screen mode
  $(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange',function(event) {
    console.log("onfullscreenchange", event);
    setTimeout(function(){
      swichFullScreenButton();
      adjustVideoWidth();
    }, 0);
  });

  // show fullscreen
  $("#full-screen").click(function(){
    console.log(this);
    var el = $(this);
    if( !isFullscreen() ) {
      enterFullscreen($("#video-chat")[0]);
    }
    else {
      exitFullscreen();
    }
  });

  //swich mute
  $('#mute-switch').on('click', function(event){
    var btn = $(event.currentTarget);
    //mute on
    if( _muted == false ) {
      btn.prop("title", "ミュートOFF");
      btn.find("i.fa").removeClass("fa-volume-down").addClass("fa-volume-off");
      $("#stream-view .stream-list .stream-container > video").attr('muted', "true");
      _muted = true;
    }
    //mute off
    else {
      btn.prop("title", "ミュートON");
      btn.find("i.fa").removeClass("fa-volume-off").addClass("fa-volume-down");
      $("#stream-view .stream-list .stream-container > video").removeAttr('muted');
      _muted = false;
    }
  });
});

window.onunload = window.onbeforeunload = opener.disconnect;

function setOtherStream(stream) {
  console.info("setOtherStream");
  var div = $('<div class="stream-container">');
  $('<video>').prop('autoplay',true).prop('src', URL.createObjectURL(stream)).appendTo(div);
  $('#stream-view .stream-list').append(div);
  adjustVideoWidth();
}

function adjustVideoWidth(){
  var items = $('#stream-view .stream-list .stream-container');
  var videoCnt = items.length;

  if( videoCnt == 0 ) return;

  var colCnt = window.innerWidth > 600 ? 3 : 2;
  var rowCnt;
  if( colCnt > videoCnt) {
    colCnt = videoCnt;
    rowCnt = 1;    
  }
  else {
    rowCnt = Math.ceil(videoCnt / colCnt);
  }
  console.log("colCnt", colCnt);
  console.log("rowCnt", rowCnt);

  items.width((1/colCnt*100) + "%");
}

// window resize
var resizeEvent = false;
$(window).bind('resize', function(event) {
  if (resizeEvent !== false) {
      clearTimeout(resizeEvent);
  }
  resizeEvent = setTimeout(adjustVideoWidth, 100);
});


function swichFullScreenButton(){
  var icon = $("#full-screen").find('i');
  if( icon.hasClass('fa-expand') ) {
    icon.removeClass("fa-expand").addClass("fa-compress");
    $('#top-toolbar').addClass('hide');
  }
  else {
    icon.removeClass("fa-compress").addClass("fa-expand");
    $('#top-toolbar').removeClass('hide');
  }
}

function isFullscreen() {
  return (document.fullscreenElement ||
        document.mozFullScreen ||
        document.webkitIsFullScreen ||
        document.msFullscreenElement);
}

function enterFullscreen(el) {
  console.log("enterFullscreen");
  try {
    if( el.webkitEnterFullscreen )
      el.webkitEnterFullscreen();
    if( el.webkitRequestFullScreen )
      el.webkitRequestFullScreen();
    else if( el.mozRequestFullScreen )
      el.mozRequestFullScreen();
    else
      el.requestFullScreen();
  } catch(e) {
    console.log(e);
  }
}

function exitFullscreen() {
  if (document.webkitCancelFullScreen) {
    document.webkitCancelFullScreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else {
    document.exitFullscreen();
  }
}

