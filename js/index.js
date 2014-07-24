var _peer;
var _myBrokerId;
var _isHost;
var _participants = [];
var _videoChatWin;
var _myStream;
var _otherStream = [];
var debug = true;

if( !window['console'] || !debug )
    window['console'] = {log: function(){}, info: function(){}, error: function(){}}

window.onunload = window.onbeforeunload = function(e) {
  if (_peer && !_peer.destroyed)
    _peer.destroy();
};

$(function(){
  setUpPeer();

  setupStream();

  $("#start-btn").click(startChat);
});

function startChat(){
  _isHost = true;

  _participants = [{brokerId: _myBrokerId}];

  $.each($('#broker-id-list input[name="broker-id"]'), function(){
    var brokerId = $(this).val();
    if( brokerId != "" )
      _participants.push({brokerId: brokerId});
  });

  console.log("_participants", _participants);
  if( _participants.length > 1 ) {
    connectToPeers(_participants, function(){
      // connect confirm
      eachActiveConnection(function(c) {
        if( c.label == 'message' )
          c.send(encodeJson('connect-confirm', {
            brokerId: _myBrokerId
          }));
      });
    }, function(){
        showDialog('接続に失敗しました。');
    });        
  }
}

function eachActiveConnection(fn) {
  $.each(_peer.connections, function() {
    var conns = this;
    for (var i = 0, ii = conns.length; i < ii; i += 1) {
      var conn = conns[i];
      if( conn.open )
        fn(conn);
    }
  });
}

function activeConnection(id, fn) {
  var conns = _peer.connections[id];
  if(!conns) return;

  for (var i = 0, ii = conns.length; i < ii; i += 1) {
    var conn = conns[i];
    if( conn.open )
      fn(conn);
  }
}

function isActiveConnection(brokerId) {
  if( !_peer || !_peer.connections ) return false;

  var conns = _peer.connections[brokerId];

  if( !conns ) return false;

  for( var i=0;i<conns.length;i++ ) {
    var conn = conns[i];
    if( !conn.open )
      return false;
  }
  return true;
}

function connectToPeer(brokerId) {
  console.log("connectToPeer", brokerId);
  var isActive = isActiveConnection(brokerId);
  console.log(brokerId + " is active: " + isActive);
  var c,f;
  if (!isActive) {
    c = _peer.connect(brokerId, {
      label: 'message',
      serialization: 'json'
    });
    if( c ) {
      c.on('open', function() {
        console.log("connect open is successed [label=" + c.label + ",brokerId=" + brokerId + "]");
        console.log("connection", c);
        connect(c);
      });
      c.on('error', function(err) {
        alert(err);
        console.log("connection error[label=" + c.label + ",brokerId=" + brokerId + "]");
        console.log("connection", c);
        console.log("error", err);
      });
    }
    f = _peer.connect(brokerId, {
      label: 'file',
      serialization: 'binary',
      reliable: true
    });
    if( f ) {
      f.on('open', function() {
        console.log("connect open is successed lebel=" + f.label + ",brokerId=" + brokerId);
        console.log("connection", f);
        connect(f);
      });
      f.on('error', function(err) {
        alert(err);
        console.log("connection error[label=" + f.label + ",brokerId=" + brokerId + "]");
        console.log("connection", f);
        console.log("error", err);
      });
    }
  }
}

function connectToPeers(requestPeers, successFn, errorFn) {
  console.log("requestPeers", requestPeers);
  $.each(requestPeers, function(){
    var brokerId = this.brokerId;
    if( brokerId != _myBrokerId ) {
      connectToPeer(brokerId); // Data Connect
    }
  });

  if( !successFn ) return;

  var counter = 10;
  var timerId = setInterval(function(){
    if( counter == 0 ) {
      if( errorFn ) errorFn();
      clearInterval(timerId);
    }
    else {
      var flg = true;
      $.each(requestPeers, function(){
        var brokerId = this.brokerId;
        if( brokerId == _myBrokerId ) return;

        var conns = _peer.connections[brokerId];
        if( !conns ) flg = false;
        $.each(conns, function(){
          if( !this.open ) flg = false;
        });
      });
      if( flg == true ) {
        successFn();
        clearInterval(timerId);
      }
    }
    counter--;
  }, 1000);
}

function closeAllConnection() {
  $.each(_peer.connections, function() {
    var conns = this;
    for (var i = 0, ii = conns.length; i < ii; i += 1) {
      var conn = conns[i];
      conn.close();
    }
  });
  _peer.connections = {};
}

function closeConnection(brokerId) {
  var conns = _peer.connections[brokerId];
  if( conns ){
    for (var i = 0, ii = conns.length; i < ii; i += 1) {
      var conn = conns[i];
      conn.close();
    }
    delete _peer.connections[brokerId];
  }
}

function showChatWindow() {
  _videoChatWin = window.open('video.html', 'videoChatWin', 'width=480, height=400, menubar=no, toolbar=no, scrollbars=no');  
}

function setUpPeer() {
  var options = {key: "MY_API_KEY"};
  if( debug ) {
    options.debug = 3;
    options.logFunction = function() {
      var copy = Array.prototype.slice.call(arguments).join(' ');
      console.log(copy);
    };
  }
  _peer = new Peer(options);

  _peer.on('open', function(id){
    console.log('peerId', id);
    _myBrokerId = id;
    $("#my-broker-id").val(id);
  });

  _peer.on('call', function(call){
    console.info("call", call);

    console.log("_myStream", _myStream);          
    call.answer(_myStream);
    call.on('stream', function(stream){
      console.log("stream", stream);
      _otherStream.push(stream);
      if( _videoChatWin )
        _videoChatWin.setOtherStream(stream);
      else
        showChatWindow();
    });
  });

  _peer.on('error', function(err) {
    alert(err);
  });

  _peer.on('connection', connect);
}

function setupStream(){
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  navigator.getUserMedia({audio: false, video: true}, function(stream){
    _myStream = stream;
  }, function(){
    // on error
  });
}

function mediaConnect(brokerId){
  console.info("mediaConnect");
  console.log("brokerId", brokerId);
  console.log("_myStream", _myStream);
  var call = _peer.call(brokerId, _myStream);
  call.on('stream', function(stream) {
    console.log("stream", stream);
    _otherStream.push(stream);
    if( _videoChatWin )
      _videoChatWin.setOtherStream(stream);
    else
      showChatWindow();
  });
}

function connect(c) {
  console.log("connect", c);
  if (c.label === 'message') {
    c.on('data', function(data) {
      var json = JSON.parse(decodeURI(data));
      console.log('json', json);

      switch(json.method){
        case 'connect-confirm':
          var brokerId = json.options.brokerId;
          console.log("brokerId", brokerId);

          var acceptFn = function(){
            console.log("acceptFn", this);
            activeConnection(brokerId, function(c) {
              if( c.label == 'message' ) {
                c.send(encodeJson('connect-reply', {
                  brokerId: _myBrokerId,
                  accept: true
                }));
              }
            });
          }

          var cancelFn = function(){
            console.log("cancelFn", this);
            activeConnection(brokerId, function(c) {
              if( c.label == 'message' ) {
                c.send(encodeJson('connect-reply', {
                  brokerId: _myBrokerId,
                  accept: false
                }));
              }
            });
            closeConnection(brokerId);
          };

          // connect confirm
          connectConfirm(acceptFn, cancelFn);

          break;
        case 'connect-reply':
          console.log("connect-reply", json);
          var accept = json.options.accept;
          var brokerId = json.options.brokerId;
          if( accept === true ) {
            var allAccept = true;
            $.each(_participants, function(){
              if( this.brokerId == brokerId )
                this.accept = true;

              if( this.brokerId != _myBrokerId && !this.accept )
                allAccept = false;
            });
            console.log("_participants", _participants);

            //connect start
            console.log("allAccept", allAccept);
            if( allAccept ) {
              activeConnection(_participants[1].brokerId, function(c) {
                if( c.label == "message" ) {
                  c.send(encodeJson('connect', {
                    participants: _participants,
                    index: 1
                  }));
                }
              });              
            }
          }
          else {
            closeConnection(brokerId);             
            _participants = [];
            _isHost = false;
            showDialog("接続がキャンセルされました");
          }
          break;
        case 'connect':
          var index = json.options.index;
          index++;
          _participants = json.options.participants;
          _isHost = false;

          if( index < _participants.length ) {
            connectToPeers(_participants, function(){
              // connect next peer
              activeConnection(_participants[index].brokerId, function(c) {
                if( c.label == 'message' ) {
                  c.send(encodeJson('connect', {
                    participants: _participants,
                    index : index
                  }));                  
                }
              });
            }, function(){
              showDialog('接続に失敗しました。');
            });
          } else {
            eachActiveConnection(function(c) {
              if( c.label == 'message' )
                c.send(encodeJson('connect-complete'));
            });
          }
          break;
        case 'connect-complete':
          // start video chat
          if( _isHost ) {
            $.each(_participants, function(){
              var brokerId = this.brokerId;
              if( brokerId != _myBrokerId ) {
                mediaConnect(brokerId); // Media Connect
              }
            });            
          }
          break;
        case 'dissolve':
          disconnect();
          break;
        case 'leave':
          var brokerId = json.options.brokerId;
          for(var i=0;_participants.length;i++ ){
            if( _participants[i].brokerId == brokerId ) {
              _participants.splice(i, 1);
              break;
            }
          }
          if( _participants.length <= 1 )
            disconnect();
          
          break;
      }
    });
  }
}

function showDialog(body, title, done) {
  if( !title || title == '' ) title = '&nbsp;';
  var confirmModal = $('#confirm-modal');
  confirmModal.find('.modal-title').html(title);
  confirmModal.find('.modal-body').html(body);
  confirmModal.find('.modal-footer > .btn-default').show();
  if( done ) {
    confirmModal.find('.modal-footer > .btn-primary').on('click',done);
    confirmModal.find('.modal-footer > .btn-default').show();
  }
  else {
    confirmModal.find('.modal-footer > .btn-default').hide();
  }
  confirmModal.modal('show');
}

function connectConfirm(acceptFn, cancelFn){
  var confirmModal = $('#confirm-modal');
  if( confirmModal.length > 0 )
    confirmModal.remove();

  confirmModal = $([
    '<div id="connect-confirm-modal" class="modal fade bs-example-modal-sm" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel" aria-hidden="true">',
    '  <div class="modal-dialog modal-sm">',
    '    <div class="modal-content">',
    '      <div class="modal-header">',
    '      <h4 class="modal-title">招待</h4>',
    '      </div>',
    '      <div class="modal-body">ビデオチャットへの招待がありました。参加しますか？</div>',
    '      <div class="modal-footer">',
    '        <button type="button" class="btn btn-danger cancel-btn" data-dismiss="modal">拒否</button>',
    '       <button type="button" class="btn btn-success accept-btn" data-dismiss="modal">許可</button>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join(""));

  confirmModal.find('.modal-footer > .accept-btn').on('click', acceptFn);
  confirmModal.find('.modal-footer > .cancel-btn').on('click', cancelFn);
  confirmModal.modal('show');
}

function disconnect() {
  if( _isHost ) {
    eachActiveConnection(function(c) {
      if( c.label == 'message' )
        c.send(encodeJson('dissolve'));
    });
  }
  else {
    eachActiveConnection(function(c) {
      if( c.label == 'message' ) {
        c.send(encodeJson('leave', {
          brokerId: _myBrokerId
        }));
      }
    });
  }
  _participants = [];
  _isHost = false;

  _myStream.stop();

  if (_peer && !_peer.destroyed)
    _peer.destroy();

  if( _videoChatWin )
    _videoChatWin.close();
}

function encodeJson(method, options){
  var json = {
    'method': method
  };
  if( options )
    json.options = options;

  return encodeURI(JSON.stringify(json));
}

